// mentorComplaintController.js
const MentorComplaint = require('../models/MentorComplaint');

exports.createComplaint = async (req, res) => {
  try {
    const complaint = new MentorComplaint(req.body);
    await complaint.save();
    res.status(201).json({ message: 'Complaint submitted' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};
