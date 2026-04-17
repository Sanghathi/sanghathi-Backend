// mentorFeedbackRoutes.js
const express = require('express');
const router = express.Router();
const mentorFeedbackController = require('../controllers/mentorFeedbackController');

router.post('/', mentorFeedbackController.createFeedback);

module.exports = router;
