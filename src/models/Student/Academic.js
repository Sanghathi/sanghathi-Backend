import mongoose from "mongoose";

const academicSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    unique: true
  },
  sslc: {
    school: { type: String, default: "" },
    percentage: { type: String, default: "" },
    yearOfPassing: { type: String, default: "" },
    schoolAddress: { type: String, default: "" },
    board: { type: String, default: "" }
  },
  puc: {
    college: { type: String, default: "" },
    percentage: { type: String, default: "" },
    yearOfPassing: { type: String, default: "" },
    collegeAddress: { type: String, default: "" },
    board: { type: String, default: "" }
  },
  localEntry: {
    college: { type: String, default: "" },
    percentage: { type: String, default: "" },
    yearOfPassing: { type: String, default: "" },
    collegeAddress: { type: String, default: "" },
    board: { type: String, default: "" }
  }
}, { timestamps: true });

const AcademicDetails = mongoose.model("AcademicDetails", academicSchema);
export default AcademicDetails;
