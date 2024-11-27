// routes/contactDetailsRoutes.js
import express from "express";
// const { createContactDetail, getContactDetails } = require('../controllers/contactDetailsController');
import {createContactDetail , getContactDetails} from "../../controllers/Student/contactDetailsController.js"

const router = express.Router();

// POST route to create new contact details
router.post('/', createContactDetail); // Changed to root for versioned route

// GET route to retrieve all contact details
router.get('/', getContactDetails); // Changed to root for versioned route

export default router; 