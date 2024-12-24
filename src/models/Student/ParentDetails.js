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
