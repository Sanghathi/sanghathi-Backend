// MentorComplaint.js
const mongoose = require('mongoose');

const MentorComplaintSchema = new mongoose.Schema({
  mentor: { type: String, required: true },
  student: { type: String, required: true },
  complaint: { type: String, required: true },
  date: { type: Date, default: Date.now }
});

module.exports = mongoose.model('MentorComplaint', MentorComplaintSchema);
