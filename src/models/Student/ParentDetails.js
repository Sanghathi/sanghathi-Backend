import mongoose from "mongoose";
const { model, Schema } = mongoose;
const ParentDetailsSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false,
    },
    fatherFirstName: { type: String },
    fatherMiddleName: { type: String },
    fatherLastName: { type: String },
    motherFirstName: { type: String },
    motherMiddleName: { type: String },
    motherLastName: { type: String },
    fatherOccupation: { type: String },
    fatherOrganization: { type: String },
    fatherDesignation: { type: String },
    fatherOfficePhone: { type: String },
    fatherOfficeAddress: { type: String },
    fatherAnnualIncome: { type: Number },
    motherOccupation: { type: String },
    motherOrganization: { type: String },
    motherDesignation: { type: String },
    motherOfficePhone: { type: String },
    motherOfficeAddress: { type: String },
    motherAnnualIncome: { type: Number },

  },
  { timestamps: true }
);

const ParentDetails = model("ParentDetails", ParentDetailsSchema);

export default ParentDetails;
