import mongoose from "mongoose";

const localGuardianSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  firstName: {
    type: String,
  },
  middleName: String,
  lastName: {
    type: String,
  },
  email: {
    type: String,
  },
  relationWithGuardian: {
    type: String,
  },
  mobileNumber: {
    type: String,
  },
  phoneNumber: String,
  residenceAddress: {
    type: String,
  },
  taluka: String,
  district: String,
  state: String,
  pincode: String
}, { timestamps: true });

const LocalGuardian = mongoose.model("LocalGuardian", localGuardianSchema);
export default LocalGuardian;
