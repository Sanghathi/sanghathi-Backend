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

    if (overallAttendance < MINIMUM_ATTENDANCE_CRITERIA) {
        try {
          // Get the mentor of the student
          const mentordetails = await axios.get(`${BACKEND_URL}/api/mentorship/mentor/${userId}`);
          console.log("Mentor Details: ",mentordetails);
          const mentorId=mentordetails.data.mentor._id;
          console.log("Mentor: ", mentorId);
            await threadService.createThread(
                mentorId,
                [userId, mentorId],
                `Attendance issue for month ${month} in semester ${semester}`,
                "attendance"
            );
            logger.info("SENDING REPORT");
        } catch (error) {
            console.error("Error in checkMinimumAttendance:", error);
            throw error; 
        }
    }
    return overallAttendance;
};

export const submitAttendanceData = async (req, res) => {
  console.log("User ID received:", req.params.userId);
  console.log("Request body:", req.body);
  try {
    const { semester, month, subjects } = req.body;
    const userId = req.params.userId;

    if (!semester || !month || !subjects) {
        return res.status(400).json({ message: "Missing required fields (semester, month, subjects)" });
    }

    let overallAttendance;
    try {
      overallAttendance = await checkMinimumAttendance(userId, semester, month, subjects);
    }
    catch (error) {
      console.error("Error in checkMinimumAttendance:", error);
      return res.status(400).json({ message: "Error checking attendance: " + error.message });
  }
    const attendance = await Attendance.findOne({ userId });

    if (!attendance) {
      // If no attendance record exists for the user, create a new one
      const newAttendance = new Attendance({
        userId,
        semesters: [{
          semester,
          months: [{
            month,
            subjects,
            overallAttendance
          }]
        }]
      });
      await newAttendance.save();

      return res.status(201).json({
        status: "success",
        data: { attendance: newAttendance },
      });
    }

    // Find the semester
    let semesterObj = attendance.semesters.find(s => s.semester === semester);

    if (!semesterObj) {
      // If the semester doesn't exist, create it
      semesterObj = { semester, months: [] };
      attendance.semesters.push(semesterObj);
    }

    // Find the month
    let monthObj = semesterObj.months.find(m => m.month === month);

    if (!monthObj) {
      // If the month doesn't exist, create it
      monthObj = { month, subjects, overallAttendance };
      semesterObj.months.push(monthObj);
    } else {
      // If the month exists, update the subjects and overallAttendance
      monthObj.subjects = subjects;
      monthObj.overallAttendance = overallAttendance;
    }

    await attendance.save();

    res.status(200).json({
      status: "success",
      data: { attendance },
    });

  } catch (error) {
    console.error("Error in submitAttendanceData:", error.message);
    res.status(400).json({ message: error.message });
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
