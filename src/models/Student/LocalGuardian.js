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
  lastName: { type: String},
  email: { type: String},
  relationWithGuardian: { type: String},
  mobileNumber: { type: String},
  phoneNumber: { type: String },
  residenceAddress: { type: String},
  taluka: { type: String},
  district: { type: String},
  state: { type: String},
  pincode: { type: String},
});

export const LocalGuardian = mongoose.model("LocalGuardian", LocalGuardianSchema);


