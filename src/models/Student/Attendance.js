import mongoose from "mongoose";

const attendanceSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, required: true },
  semesters: [
    {
      semester: { type: Number, required: true },
      months: [
        {
          month: { type: Number, required: true },
          subjects: [
            {
              subjectCode: { type: String},
              subjectName: String,
              attendedClasses: Number,
              totalClasses: Number,
            },
          ],
          overallAttendance: Number,
        }
      ]
    }
  ]
});

attendanceSchema.index({ userId: 1 });
attendanceSchema.index({ userId: 1, "semesters.semester": 1 });

const Attendance = mongoose.model("Attendance", attendanceSchema);
export default Attendance;