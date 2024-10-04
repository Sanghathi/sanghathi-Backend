import mongoose from "mongoose";

const { model, Schema } = mongoose;

const studentProfileSchema = new Schema({
  fullName: {
    firstName: { type: String, required: true },
    middleName: String,
    lastName: { type: String, required: true },
  },
  userId: {
    type: Schema.Types.ObjectId,
    ref: "Users",
    required: true,
  },
  department: {
    type: String,
    required: true,
  },
  usn: { type: String, required: true },
  nameOnMarksheet: { type: String },
  personalEmail: { type: String },
  email: { type: String },
  dateOfBirth: { type: Date },
  bloodGroup: { type: String },
  mobileNumber: { type: String },
  alternatePhoneNumber: String,
  nationality: { type: String },
  domicile: String,
  religion: String,
  category: String,
  caste: String,
  hostelite: String,
  subCaste: String,
  aadharCardNumber: {
    type: String,
    minlength: 12,
    maxlength: 12,
  },
  physicallyChallenged: { type: Boolean },
  admissionDate: { type: Date },
  sportsLevel: {
    type: String,
    enum: ["State", "National", "International", "Not Applicable"],
  },
  defenceOrExServiceman: {
    type: String,
    enum: ["Defence", "Ex-Serviceman", "Not Applicable"],
  },
  isForeigner: { type: Boolean },
  photo: String,
});

const StudentProfile = model("StudentProfile", studentProfileSchema);

export default StudentProfile;
