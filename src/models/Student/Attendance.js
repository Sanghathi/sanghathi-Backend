import mongoose from "mongoose";

const attendanceSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, required: true },
  semester: { type: Number, required: true },
  month: { type: Number, required: true },
  subjects: [
    {
      subjectName: String,
      attendedClasses: Number,
      totalClasses: Number,
    },
  ],
  overallAttendance: Number,
});
const Attendance = mongoose.model("Attendance", attendanceSchema);
export default Attendance;
