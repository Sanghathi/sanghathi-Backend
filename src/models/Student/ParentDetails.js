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
    fatherOfficePhone: { type: String, required: true }, // Fixed name
    fatherResidencePhone: { type: String },
    fatherEmail: { type: String },

    motherFirstName: { type: String, required: true },
    motherMiddleName: { type: String },
    motherLastName: { type: String },
    motherOccupation: { type: String, required: true },
    motherOrganization: { type: String },
    motherDesignation: { type: String },
    motherOfficeAddress: { type: String },
    motherAnnualIncome: { type: Number, min: 0 },
    motherOfficePhone: { type: String, required: true }, // Fixed name
    motherResidencePhone: { type: String },
    motherEmail: { type: String },

    mobileNumber: { type: String },
    residenceAddress: { type: String },
    fax: { type: String },
    district: { type: String },
    taluka: { type: String },
    village: { type: String },
    state: { type: String },
    pincode: { type: String },
  },
  { timestamps: true }
);

export const ParentDetails = mongoose.model("ParentDetails", ParentDetailsSchema);
