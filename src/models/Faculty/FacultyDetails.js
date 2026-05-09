import mongoose from "mongoose";

const { model, Schema } = mongoose;

const facultyProfileSchema = new Schema({
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
  cabin: {
    type: String,
    required: true,
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
  aadharCardNumber: {
    type: Number,
    minlength: 12,
    maxlength: 12,
  },
  physicallyChallenged: { 
    type: String, 
    enum: ["Yes", "No"],
  },
  isForeigner: { 
    type: String, 
    enum: ["Yes", "No"],
  },
  photo: {
    type: String
  },
});

facultyProfileSchema.index({ userId: 1 });
facultyProfileSchema.index({ collegeCode: 1, userId: 1 });
facultyProfileSchema.index({ collegeCode: 1, department: 1 });
facultyProfileSchema.index({ collegeCode: 1, departmentId: 1 });

const FacultyProfile = model("FacultyProfile", facultyProfileSchema);

export default FacultyProfile;
