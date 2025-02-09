import axios from "axios";
import Attendance from "../../models/Student/Attendance.js";
import ThreadService from "../../services/threadService.js";
import logger from "../../utils/logger.js";
import AppError from "../../utils/appError.js";

const threadService = new ThreadService();

const MINIMUM_ATTENDANCE_CRITERIA = 75;
const BASE_URL = process.env.PYTHON_API;

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

export const checkMinimumAttendance = async (attendanceData) => {
  if (!attendanceData || !attendanceData.subjects) {
    throw new Error("Invalid attendance data provided");
  }

  const { userId, semester, month, subjects } = attendanceData;

  const totalClasses = subjects.reduce(
    (acc, subject) => acc + (subject.totalClasses || 0),
    0
  );
  const attendedClasses = subjects.reduce(
    (acc, subject) => acc + (subject.attendedClasses || 0),
    0
  );

  if (totalClasses === 0) {
    throw new Error("Total classes cannot be zero");
  }

  const overallAttendance = (attendedClasses / totalClasses) * 100;

  if (overallAttendance < MINIMUM_ATTENDANCE_CRITERIA) {
    try {
      // Send attendance report to the API
      //await sendAttendanceReport(attendanceData);

      // Get the mentor of the student
      // const mentor = await getMentor(userID);
      const mentor = "644a733c18d4e8d70b7bd5b6"; // Use some hard coded value

      // Create a thread with the student and mentor
      await threadService.createThread(
        mentor,
        [userId, mentor],
        `Attendance issue for ${month} in semester ${semester}`,
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
    const attendanceData = req.body;
    attendanceData.userId = req.params.userId;

    attendanceData.overallAttendance = await checkMinimumAttendance(
      attendanceData
    );

    const filter = {
      userId: attendanceData.userId,
      semester: attendanceData.semester,
      month: attendanceData.month,
    };
    const update = {
      $set: {
        subjects: attendanceData.subjects,
        overallAttendance: attendanceData.overallAttendance,
      },
    };
    const options = { upsert: true, new: true };

    const attendance = await Attendance.findOneAndUpdate(
      filter,
      update,
      options
    );

    res.status(201).json({
      status: "success",
      data: {
        attendance,
      },
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
      attendance,
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
