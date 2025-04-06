import mongoose from "mongoose";

const addressSchema = new mongoose.Schema({
  line1: {
    type: String,
    required: true,
  },
  line2: {
    type: String,
  },
  country: {
    type: String,
    required: true,
  },
  state: {
    type: String,
    required: true,
  },
  city: {
    type: String,
    required: true,
  },
  district: {
    type: String,
    required: true,
  },
  taluka: {
    type: String,
    required: true,
  },
  pincode: {
    type: String,
    required: true,
  },
  phoneNumber: {
    type: String,
  },
});

const contactDetailsSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: "User", // assuming you have a User model
    },
    currentAddress: {
      type: addressSchema,
      required: true,
    },
    permanentAddress: {
      type: addressSchema,
      required: true,
    },
  },
  { timestamps: true }
);

const ContactDetails = mongoose.model("ContactDetails", contactDetailsSchema);

export default ContactDetails;
