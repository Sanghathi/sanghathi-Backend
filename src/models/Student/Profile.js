import mongoose from "mongoose";

const { model, Schema } = mongoose;

const studentProfileSchema = new Schema({
  userId: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: false,
  },
  collegeCode: {
    type: String,
    uppercase: true,
    trim: true,
  },
  fullName: {
    firstName: { 
      type: String, 
      required: true 
    },
    middleName: {
      type: String
    },
    lastName: { 
      type: String, 
      required: true 
    },
  },
  department: {
    type: String,
    required: true,
  },
  departmentId: {
    type: Schema.Types.ObjectId,
    ref: "Department",
  },
  sem: {
    type: Number,
    required: true,
  },
  usn: { 
    type: String,
    required: true 
  },
  personalEmail: { 
    type: String 
  },
  email: { 
    type: String 
  },
  dateOfBirth: { 
    type: Date
  },
  bloodGroup: { 
    type: String 
  },
  mobileNumber: { 
    type: Number ,
  },
  alternatePhoneNumber: {
    type: Number,
  },
  nationality: { 
    type: String 
  },
  domicile: {
    type: String
  },
  religion: {
    type: String
  },
  category: {
    type: String
  },
  caste: {
    type: String
  },
  hostelite: {
    type: String
  },
  aadharCardNumber: {
    type: Number,
    minlength: 12,
    maxlength: 12,
  },
  physicallyChallenged: { 
    type: String, 
    enum: ["Yes", "No"],
  },
  admissionDate: { 
    type: Date 
  },
  sportsLevel: {
    type: String,
    enum: ["State", "National", "International", "Not Applicable"],
  },
  defenceOrExServiceman: {
    type: String,
    enum: ["Defence", "Ex-Serviceman", "Not Applicable"],
  },
  isForeigner: { 
    type: Boolean 
  },
  photo: {
    type: String
  },
});

studentProfileSchema.index({ userId: 1 });
studentProfileSchema.index({ usn: 1 });
studentProfileSchema.index({ collegeCode: 1, userId: 1 });
studentProfileSchema.index({ collegeCode: 1, department: 1 });
studentProfileSchema.index({ collegeCode: 1, departmentId: 1 });
studentProfileSchema.index({ collegeCode: 1, usn: 1 });

const StudentProfile = model("StudentProfile", studentProfileSchema);

export default StudentProfile;
