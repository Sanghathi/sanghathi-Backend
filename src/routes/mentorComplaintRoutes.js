// mentorComplaintRoutes.js
const express = require('express');
const router = express.Router();
const mentorComplaintController = require('../controllers/mentorComplaintController');

router.post('/', mentorComplaintController.createComplaint);

module.exports = router;
