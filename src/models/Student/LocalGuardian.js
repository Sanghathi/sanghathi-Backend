// const mongoose = require('mongoose');

import mongoose from "mongoose" ;

const LocalGuardianSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false,
    unique: true,
  },
  firstName: { 
    type: String,
    required: true
 },
  middleName: { type: String },
  lastName: { type: String, required: true },
  email: { type: String, required: true },
  relationWithGuardian: { type: String, required: true },
  mobileNumber: { type: String, required: true },
  phoneNumber: { type: String },
  residenceAddress: { type: String, required: true },
  taluka: { type: String, required: true },
  district: { type: String, required: true },
  state: { type: String, required: true },
  pincode: { type: String, required: true },
});

export const LocalGuardian = mongoose.model("LocalGuardian", LocalGuardianSchema);


