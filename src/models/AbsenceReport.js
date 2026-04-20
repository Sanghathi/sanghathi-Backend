import mongoose from "mongoose";

const absenceReportSchema = new mongoose.Schema({
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  mentorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  absentDate: {
    type: Date,
    required: true,
  },
  reason: {
    type: String,
    required: true,
  },
  proof: {
    type: String,
    default: null,
  },
  status: {
    type: String,
    enum: ["pending", "approved", "rejected"],
    default: "pending",
  },
  reviewedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    default: null,
  },
  reviewedAt: {
    type: Date,
    default: null,
  },
  threadId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Thread",
    default: null,
  },
}, {
  timestamps: true,
});

const AbsenceReport = mongoose.model("AbsenceReport", absenceReportSchema);

export default AbsenceReport;