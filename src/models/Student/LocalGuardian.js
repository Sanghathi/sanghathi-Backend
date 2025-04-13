import mongoose from "mongoose";

const localGuardianSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    unique: true
  },
  firstName: {
    type: String,
    required: true
  },
  middleName: String,
  lastName: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true
  },
  relationWithGuardian: {
    type: String,
    required: true
  },
  mobileNumber: {
    type: String,
    required: true
  },
  phoneNumber: String,
  residenceAddress: {
    type: String,
    required: true
  },
  taluka: String,
  district: String,
  state: String,
  pincode: String
}, { timestamps: true });

const LocalGuardian = mongoose.model("LocalGuardian", localGuardianSchema);
export default LocalGuardian;