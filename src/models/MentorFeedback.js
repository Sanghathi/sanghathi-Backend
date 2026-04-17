// MentorFeedback.js
const mongoose = require('mongoose');

const MentorFeedbackSchema = new mongoose.Schema({
  mentor: { type: String, required: true },
  student: { type: String, required: true },
  feedback: { type: String, required: true },
  date: { type: Date, default: Date.now }
});

module.exports = mongoose.model('MentorFeedback', MentorFeedbackSchema);
