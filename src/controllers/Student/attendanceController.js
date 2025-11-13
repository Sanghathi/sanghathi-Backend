import axios from "axios";
import Attendance from "../../models/Student/Attendance.js";
import ThreadService from "../../services/threadService.js";
import logger from "../../utils/logger.js";
import AppError from "../../utils/appError.js";

const threadService = new ThreadService();

const MINIMUM_ATTENDANCE_CRITERIA = 75;
const BASE_URL = process.env.PYTHON_API;
const BACKEND_URL = process.env.BACKEND_HOST;

const sendAttendanceReport = async (attendanceData) => {
  try {
    const response = await axios.post(
      `${BASE_URL}/generate_attendance_report`,
      {
        attendanceData,
      }
    );

    if (response.status !== 200) {
      throw new Error(`Error sending attendance report: ${response.data}`);
    }
  } catch (error) {
    logger.error("Error creating user", {
      error: error.message,
      stack: error.stack,
    });
    throw new Error(`Error sending attendance report: ${error}`);
  }
};

export const checkMinimumAttendance = async (userId, semester, month, subjects) => { 
  if (!subjects) {
    throw new Error("Subjects array is undefined");
  }
    const totalClasses = subjects.reduce((acc, subject) => acc + (subject.totalClasses || 0), 0);
    const attendedClasses = subjects.reduce((acc, subject) => acc + (subject.attendedClasses || 0), 0);

    console.log("Total Classes:", totalClasses, "Attended Classes:", attendedClasses);

    if (totalClasses === 0) {
        return 0;
    }

    const overallAttendance = (attendedClasses / totalClasses) * 100;
    console.log("Overall Attendance:", overallAttendance);

    // if (overallAttendance < MINIMUM_ATTENDANCE_CRITERIA) {
    //     try {
    //       // Get the mentor of the student
    //       const mentorUrl = `${BACKEND_URL}/api/mentorship/mentor/${userId}`;
    //       console.log("Fetching mentor details from:", mentorUrl);
          
    //       const mentordetails = await axios.get(mentorUrl);
    //       console.log("Mentor Details: ", mentordetails);
          
    //       if (mentordetails.data?.mentor?._id) {
    //         const mentorId = mentordetails.data.mentor._id;
    //         console.log("Mentor: ", mentorId);
    //         await threadService.createThread(
    //             mentorId,
    //             [userId, mentorId],
    //             `Attendance issue for month ${month} in semester ${semester}`,
    //             "attendance"
    //         );
    //         logger.info("SENDING REPORT");
    //       } else {
    //         logger.warn("No mentor found for student:", userId);
    //       }
    //     } catch (error) {
    //         console.error("Error in checkMinimumAttendance:", error);
    //         // Don't throw the error, just log it and continue
    //         logger.error("Error fetching mentor details", {
    //           error: error.message,
    //           userId,
    //           semester,
    //           month
    //         });
    //     }
    // }
    return overallAttendance;
};

export const submitAttendanceData = async (req, res) => {
  console.log("User ID received:", req.params.userId);
  console.log("Request body:", req.body);
  try {
    const { semester, month, subjects } = req.body;
    const userId = req.params.userId;

    // Detailed validation with specific error messages
    if (!userId) {
      return res.status(400).json({ 
        message: "User ID is missing",
        details: "The userId parameter is required in the URL"
      });
    }

    if (!semester) {
      return res.status(400).json({ 
        message: "Semester field is missing",
        details: "Request body must include 'semester' field with a valid semester number"
      });
    }

    if (!month) {
      return res.status(400).json({ 
        message: "Month field is missing",
        details: "Request body must include 'month' field with a valid month number (1-12)"
      });
    }

    if (!subjects) {
      return res.status(400).json({ 
        message: "Subjects field is missing",
        details: "Request body must include 'subjects' array with attendance data"
      });
    }

    if (!Array.isArray(subjects)) {
      return res.status(400).json({ 
        message: "Invalid subjects data",
        details: "The 'subjects' field must be an array of subject objects"
      });
    }

    if (subjects.length === 0) {
      return res.status(400).json({ 
        message: "Empty subjects array",
        details: "At least one subject is required in the subjects array"
      });
    }

    // Validate each subject has required fields
    const invalidSubjects = [];
    subjects.forEach((subject, index) => {
      const errors = [];
      
      if (!subject.subjectName) {
        errors.push("missing subjectName");
      }
      if (subject.attendedClasses === undefined || subject.attendedClasses === null) {
        errors.push("missing attendedClasses");
      }
      if (subject.totalClasses === undefined || subject.totalClasses === null) {
        errors.push("missing totalClasses");
      }
      if (typeof subject.attendedClasses === 'number' && subject.attendedClasses < 0) {
        errors.push("attendedClasses cannot be negative");
      }
      if (typeof subject.totalClasses === 'number' && subject.totalClasses < 0) {
        errors.push("totalClasses cannot be negative");
      }
      if (typeof subject.attendedClasses === 'number' && typeof subject.totalClasses === 'number' 
          && subject.attendedClasses > subject.totalClasses) {
        errors.push("attendedClasses cannot be greater than totalClasses");
      }

      if (errors.length > 0) {
        invalidSubjects.push({
          index: index + 1,
          subjectName: subject.subjectName || 'Unknown',
          subjectCode: subject.subjectCode || 'Not provided',
          errors: errors
        });
      }
    });

    if (invalidSubjects.length > 0) {
      return res.status(400).json({ 
        message: "Invalid subject data found",
        details: `${invalidSubjects.length} subject(s) have validation errors`,
        invalidSubjects: invalidSubjects
      });
    }

    let overallAttendance;
    try {
      overallAttendance = await checkMinimumAttendance(userId, semester, month, subjects);
    }
    catch (error) {
      console.error("Error in checkMinimumAttendance:", error);
      return res.status(400).json({ 
        message: "Error calculating attendance percentage",
        details: error.message,
        context: {
          userId,
          semester,
          month,
          subjectsCount: subjects.length
        }
      });
    }

    // Helper function to check if subject is invalid
    const isInvalidSubject = (subject) => {
      // Check for null or undefined values
      if (!subject || !subject.subjectName) return true;
      
      // Check for "No Data" entries
      if (subject.subjectName.toLowerCase().includes('no data')) return true;
      
      // Check for numeric-only names (e.g., "2", "4", "10", "172")
      if (/^\d+$/.test(subject.subjectName.trim())) return true;
      
      // Check for zero or null values in critical fields
      if (!subject.attendedClasses && subject.attendedClasses !== 0) return true;
      if (!subject.totalClasses || subject.totalClasses === 0) return true;
      
      return false;
    };

    // Prepare the subjects data with required fields and filter invalid ones
    const formattedSubjects = subjects
      .map(subject => ({
        subjectCode: subject.subjectCode || undefined, // allow undefined
        subjectName: subject.subjectName,
        attendedClasses: subject.attendedClasses,
        totalClasses: subject.totalClasses
      }))
      .filter(subject => !isInvalidSubject(subject));

    // If no valid subjects remain, return error
    if (formattedSubjects.length === 0) {
      return res.status(400).json({
        status: "fail",
        message: "No valid subjects found in the provided data",
        details: "All subjects were filtered out due to invalid data (missing values, 'No Data' entries, numeric-only names, or zero totals)"
      });
    }

    // Try to find existing attendance record
    let attendance = await Attendance.findOne({ userId });

    if (!attendance) {
      // Create new attendance record
      attendance = new Attendance({
        userId,
        semesters: [{
          semester,
          months: [{
            month,
            subjects: formattedSubjects,
            overallAttendance
          }]
        }]
      });
    } else {
      // Find or create semester using findIndex to avoid duplicates
      const semesterIndex = attendance.semesters.findIndex(s => s.semester === semester);
      
      if (semesterIndex === -1) {
        // Create new semester
        attendance.semesters.push({
          semester,
          months: [{
            month,
            subjects: formattedSubjects,
            overallAttendance
          }]
        });
      } else {
        // Use the semester at the found index
        const semesterObj = attendance.semesters[semesterIndex];
        
        // Find or create month using findIndex to avoid duplicates
        const monthIndex = semesterObj.months.findIndex(m => m.month === month);
        
        if (monthIndex === -1) {
          // Create new month
          semesterObj.months.push({
            month,
            subjects: formattedSubjects,
            overallAttendance
          });
        } else {
          // Use the month at the found index
          const monthObj = semesterObj.months[monthIndex];
          
          // Update existing month - merge subjects without duplicates
          const existingSubjects = monthObj.subjects.filter(subject => !isInvalidSubject(subject));
          
          // Create a map of existing subjects by code and name for quick lookup
          const subjectMap = new Map();
          existingSubjects.forEach((subject, index) => {
            const key = subject.subjectCode || subject.subjectName;
            subjectMap.set(key, index);
          });

          // Update or add subjects from new data
          formattedSubjects.forEach(newSubject => {
            const key = newSubject.subjectCode || newSubject.subjectName;
            const existingIndex = subjectMap.get(key);
            
            if (existingIndex !== undefined) {
              // Update existing subject
              existingSubjects[existingIndex] = newSubject;
            } else {
              // Add new subject
              existingSubjects.push(newSubject);
              subjectMap.set(key, existingSubjects.length - 1);
            }
          });

          monthObj.subjects = existingSubjects;
          monthObj.overallAttendance = overallAttendance;
        }
      }
    }

    // Save the attendance record
    try {
      const savedAttendance = await attendance.save();
      res.status(200).json({
        status: "success",
        message: `Attendance saved successfully for User ID: ${userId}, Semester: ${semester}, Month: ${month}`,
        data: { attendance: savedAttendance },
      });
    } catch (saveError) {
      console.error("Error saving attendance:", saveError);
      
      // Provide detailed error information
      const errorDetails = {
        userId,
        semester,
        month,
        errorType: saveError.name,
        errorMessage: saveError.message
      };

      // If there's a validation error, provide field-specific details
      if (saveError.name === 'ValidationError') {
        const validationErrors = {};
        Object.keys(saveError.errors).forEach(field => {
          validationErrors[field] = {
            message: saveError.errors[field].message,
            value: saveError.errors[field].value,
            kind: saveError.errors[field].kind
          };
        });
        
        errorDetails.validationErrors = validationErrors;
        
        return res.status(400).json({ 
          message: "Validation failed while saving attendance data",
          details: `Failed to save attendance for User ID: ${userId}`,
          error: errorDetails
        });
      }

      // For other types of errors
      return res.status(500).json({ 
        message: "Database error while saving attendance",
        details: `Failed to save attendance for User ID: ${userId}, Semester: ${semester}, Month: ${month}`,
        error: errorDetails
      });
    }

  } catch (error) {
    console.error("Error in submitAttendanceData:", error.message);
    console.error("Error stack:", error.stack);
    
    res.status(500).json({ 
      message: "Unexpected error occurred while processing attendance data",
      details: error.message,
      context: {
        userId: req.params.userId,
        hasRequestBody: !!req.body,
        requestKeys: req.body ? Object.keys(req.body) : []
      }
    });
  }
};

export const getAttendanceById = async (req, res, next) => {
  const { id } = req.params;

  const attendance = await Attendance.findOne({ userId: id });

  if (!attendance) {
    return next(new AppError("Attendance not found", 404));
  }

  res.status(200).json({
    status: "success",
    data: {
      attendance, // Return the entire attendance document
    },
  });
};

//This is for testing purposes, we want to quickly delete data

export const deleteAllAttendance = async (req, res) => {
  const userId = req.params.userId;

  // Use Mongoose to delete all attendance records with the specified user ID
  const result = await Attendance.deleteMany({ userId: userId });

  if (result.deletedCount === 0) {
    return res
      .status(400)
      .json({ message: "No attendance records found for user ID" });
  }

  res
    .status(204)
    .json({ message: "All attendance records deleted successfully" });
};
