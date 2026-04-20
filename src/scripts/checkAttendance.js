import "dotenv/config";
import mongoose from "mongoose";
import Attendance from "../models/Student/Attendance.js";
import logger from "../utils/logger.js";

async function checkAttendance() {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    const email = "demostudent@emithru.com";
    
    // First, find the user
    const user = await mongoose.connection.collection('users').findOne({ email });
    
    if (!user) {
      console.log("User not found:", email);
      process.exit(0);
    }
    
    console.log("User found:", user._id, user.name);
    
    // Check attendance
    const attendance = await Attendance.findOne({ userId: user._id });
    
    if (!attendance) {
      console.log("No attendance data for user:", user._id);
    } else {
      console.log("Attendance data:", JSON.stringify(attendance, null, 2));
    }
  } catch (error) {
    logger.error("Error:", error);
  } finally {
    await mongoose.disconnect();
  }
}

checkAttendance();