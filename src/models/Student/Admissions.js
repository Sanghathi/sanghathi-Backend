// const mongoose = require("mongoose");
import mongoose from "mongoose";
// Define schema for admission details
const AdmissionSchema = new mongoose.Schema({
	admissionYear: { type: Number, required: true },
	branch: { type: String, required: true },
	semester: { type: String, required: true },
	admissionType: { type: String, required: true },
	category: { type: String, required: true },
	usn: { type: String, required: true },
	collegeID: { type: Number, required: true },
	documentsSubmitted: [{ type: String }],
	changeOfBranch: {
		year: { type: Number },
		newBranch: { type: String },
		usn: { type: String },
		collegeID: { type: Number },
	},
});

// Create admission model
const Admission = mongoose.model("Admission", AdmissionSchema);

export default Admission;
