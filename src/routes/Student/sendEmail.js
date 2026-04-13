import cron from "node-cron";
import nodemailer from "nodemailer";
import Attendance from "../../models/Attendance.js";
import User from "../../models/User.js";
import Mentorship from "../../models/Mentorship.js";

import logger from "../../utils/logger.js";

const mailUser = process.env.MAIL_USER;
const mailPass = process.env.MAIL_PASS;
const mailFrom = process.env.MAIL_FROM || mailUser;

// Define the cron job function
const sendAttendanceNotifications = async () => {
  try {
    if (!mailUser || !mailPass) {
      logger.warn(
        "Skipping attendance notifications: MAIL_USER/MAIL_PASS are not configured"
      );
      return;
    }

    const transporter = nodemailer.createTransport({
      service: "Gmail",
      auth: {
        user: mailUser,
        pass: mailPass,
      },
    });

    // Fetch all attendance records from the database
    const attendances = await Attendance.find().populate("student");

    // Iterate over each attendance record
    for (const attendance of attendances) {
      // Calculate the overall attendance percentage for the student
      const attended = attendance.months.reduce(
        (total, month) => total + month.classesAttended,
        0
      );
      const taken = attendance.months.reduce(
        (total, month) => total + month.classesTaken,
        0
      );

      if (!taken) {
        continue;
      }

      const percentage = (attended / taken) * 100;

      // If attendance is below 75%, send email notifications
      if (percentage < 75) {
        // Find the student's email address from the User model
        const studentUser = await User.findById(attendance.student.user);
        if (!studentUser?.email) {
          continue;
        }
        const studentEmail = studentUser.email;

        // Find the mentor's email address from the Mentorship model
        const mentorship = await Mentorship.findOne({
          student: attendance.student._id,
        }).populate("mentor");
        if (!mentorship?.mentor?.email) {
          continue;
        }
        const mentorEmail = mentorship.mentor.email;

        // Define the email message
        const mailOptions = {
          from: mailFrom,
          to: [studentEmail, mentorEmail],
          subject: "Attendance Notification",
          text: `Your attendance for subject ${attendance.subjectName} is below 75%. Please improve your attendance as soon as possible.`,
        };

        // Send the email
        await transporter.sendMail(mailOptions);
      }
    }
  } catch (error) {
    logger.error("Error sending attendance notifications:", error);
  }
};

// Schedule the cron job to run every 30 days
cron.schedule("0 0 0 */30 * *", sendAttendanceNotifications);
