// import mongoose from "mongoose";

// // Schema for Parent Details
// const ParentDetailsSchema = new mongoose.Schema(
//   {
//     // Reference to the User model (optional)
//     userId: {
//       type: mongoose.Schema.Types.ObjectId,
//       ref: "User",
//       required: false,
//       unique: false,
//     },
//     // Father's details
//     fatherFirstName: { type: String, required: true },
//     fatherMiddleName: { type: String },
//     fatherLastName: { type: String },
//     fatherOccupation: { type: String, required: true },
//     fatherOrganization: { type: String },
//     fatherDesignation: { type: String },
//     fatherOfficeAddress: { type: String },
//     fatherAnnualIncome: {
//       type: Number,
//       validate: {
//         validator: (value) => value >= 0,
//         message: "Annual income must be a positive number.",
//       },
//     },
//     fatherOfficePhoneNo: {
//       type: String,
//       validate: {
//         validator: (value) => /^[0-9]{10}$/.test(value),
//         message: "Office phone number must be a 10-digit number.",
//       },
//     },

//     // Mother's details
//     motherFirstName: { type: String, required: true },
//     motherMiddleName: { type: String },
//     motherLastName: { type: String },
//     motherOccupation: { type: String, required: true },
//     motherOrganization: { type: String },
//     motherDesignation: { type: String },
//     motherOfficeAddress: { type: String },
//     motherAnnualIncome: {
//       type: Number,
//       validate: {
//         validator: (value) => value >= 0,
//         message: "Annual income must be a positive number.",
//       },
//     },
//     motherOfficePhoneNo: {
//       type: String,
//       validate: {
//         validator: (value) => /^[0-9]{10}$/.test(value),
//         message: "Office phone number must be a 10-digit number.",
//       },
//     },

//     // Common details
//     mobileNumber: {
//       type: String,
//       validate: {
//         validator: (value) => /^[0-9]{10}$/.test(value),
//         message: "Mobile number must be a 10-digit number.",
//       },
//     },
//     residenceAddress: { type: String },
//     fax: { type: String },
//     district: { type: String },
//     taluka: { type: String },
//     village: { type: String },
//     state: { type: String },
//     pincode: {
//       type: String,
//       validate: {
//         validator: (value) => /^[0-9]{6}$/.test(value),
//         message: "Pincode must be a 6-digit number.",
//       },
//     },
//   },
//   { timestamps: true } // Automatically add createdAt and updatedAt fields
// );

// export const ParentDetails = mongoose.model("ParentDetails", ParentDetailsSchema);


import mongoose from "mongoose";

const ParentDetailsSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false,
    },
    fatherFirstName: { type: String, required: true },
    fatherMiddleName: { type: String },
    fatherLastName: { type: String },
    fatherOccupation: { type: String, required: true },
    fatherOrganization: { type: String },
    fatherDesignation: { type: String },
    fatherOfficeAddress: { type: String },
    fatherAnnualIncome: { type: Number, min: 0 },
    fatherOfficePhoneNo: { type: String },
    motherFirstName: { type: String, required: true },
    motherMiddleName: { type: String },
    motherLastName: { type: String },
    motherOccupation: { type: String, required: true },
    motherOrganization: { type: String },
    motherDesignation: { type: String },
    motherOfficeAddress: { type: String },
    motherAnnualIncome: { type: Number, min: 0 },
    motherOfficePhoneNo: { type: String },
  },
  { timestamps: true }
);

export const ParentDetails = mongoose.model("ParentDetails", ParentDetailsSchema);
