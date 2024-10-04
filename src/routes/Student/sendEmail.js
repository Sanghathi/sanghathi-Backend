import cron from "node-cron";
import nodemailer from "nodemailer";
import Attendance from "../../models/Attendance.js";
import User from "../../models/User.js";
import Mentorship from "../../models/Mentorship.js";

// Define the cron job function
//TODO : Code is not acceptable
const sendAttendanceNotifications = async () => {
  try {
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
      const percentage = (attended / taken) * 100;

      // If attendance is below 75%, send email notifications
      if (percentage < 75) {
        // Find the student's email address from the User model
        const studentUser = await User.findById(attendance.student.user);
        const studentEmail = studentUser.email;

        // Find the mentor's email address from the Mentorship model
        const mentorship = await Mentorship.findOne({
          student: attendance.student._id,
        }).populate("mentor");
        const mentorEmail = mentorship.mentor.email;

        // Create the email transporter
        const transporter = nodemailer.createTransport({
          service: "Gmail",
          auth: {
            user: "your-email@gmail.com",
            pass: "your-password",
          },
        });

        // Define the email message
        const mailOptions = {
          from: "your-email@gmail.com",
          to: [studentEmail, mentorEmail],
          subject: "Attendance Notification",
          text: `Your attendance for subject ${attendance.subjectName} is below 75%. Please improve your attendance as soon as possible.`,
        };

        // Send the email
        await transporter.sendMail(mailOptions);
      }
    }
  } catch (error) {
    console.error("Error sending attendance notifications:", error);
  }
};

// Schedule the cron job to run every 30 days
cron.schedule("0 0 0 */30 * *", sendAttendanceNotifications);
