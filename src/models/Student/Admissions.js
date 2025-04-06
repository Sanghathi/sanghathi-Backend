import mongoose from "mongoose";

const admissionDetailsSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    unique: true
  },
  admissionYear: {
    type: String,
    required: true
  },
  branch: {
    type: String,
    required: true
  },
  semester: {
    type: String,
    enum: ["1st", "2nd", "3rd", "4th", "5th", "6th", "7th", "8th"],
    required: true
  },
  admissionType: {
    type: String,
    enum: ["COMEDK", "CET", "MANAGEMENT", "SNQ"],
    required: true
  },
  category: {
    type: String,
    required: true
  },
  usn: {
    type: String,
    required: true,
    unique: true
  },
  collegeId: {
    type: String,
    required: true,
    unique: true
  },
  branchChange: {
    year: { type: String, default: "" },
    branch: { type: String, default: "" },
    usn: { type: String, default: "" },
    collegeId: { type: String, default: "" }
  },
  documentsSubmitted: {
    type: [String],
    enum: ["SSLC/ X Marks Card", "PUC/ XII Marks Card", "Caste Certificate", "Migration Certificate"],
    default: []
  }
}, { timestamps: true });

const AdmissionDetails = mongoose.model("AdmissionDetails", admissionDetailsSchema);
export default AdmissionDetails;
