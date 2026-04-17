// mentorFeedbackController.js
const MentorFeedback = require('../models/MentorFeedback');

exports.createFeedback = async (req, res) => {
  try {
    const feedback = new MentorFeedback(req.body);
    await feedback.save();
    res.status(201).json({ message: 'Feedback submitted' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};
