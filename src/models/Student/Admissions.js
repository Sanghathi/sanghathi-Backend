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
  },
  branch: {
    type: String,
  },
  admissionType: {
    type: String,
    enum: ["COMEDK", "CET", "MANAGEMENT", "SNQ"],
  },
  category: {
    type: String,
  },
  collegeId: {
    type: String,
  },
  branchChange: {
    year: String,
    branch: String,
    usn: String,
    collegeId: String
  },
  documentsSubmitted: [{
    type: String,
    enum: ["SSLC/X Marks Card", "PUC/XII Marks Card", "Caste Certificate", "Migration Certificate"]
  }]
}, { timestamps: true });

const AdmissionDetails = mongoose.model("AdmissionDetails", admissionDetailsSchema);
export default AdmissionDetails;
