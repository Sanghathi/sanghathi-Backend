import mongoose from "mongoose";

const attendanceSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.ObjectId,
      ref: "User",
      required: true,
    },
    semester: {
      type: Number,
      required: true,
    },
    month: {
      type: String,
      required: true,
    },

    subjects: [
      {
        subjectCode: String,
        subjectName: String,
        attendedClasses: Number,
        totalClasses: Number,
      },
    ],
    overallAttendance: Number,
  },
  { timestamps: true }
);

const Attendance = mongoose.model("Attendance", attendanceSchema);
export default Attendance;
