// const mongoose = require("mongoose");
import mongoose from "mongoose";
const academicsSchema = new mongoose.Schema({
	sslc: {
		school: {
			type: String,
			required: true,
		},
		percentage: {
			type: Number,
			required: true,
		},
		yearOfPassing: {
			type: Number,
			required: true,
		},
		schoolAddress: {
			type: String,
			required: true,
		},
		board: {
			type: String,
			enum: ["cbse", "icse", "state board", "others"],
			required: true,
		},
	},
	puc: {
		college: {
			type: String,
			required: true,
		},
		percentage: {
			type: Number,
			required: true,
		},
		yearOfPassing: {
			type: Number,
			required: true,
		},
		collegeAddress: {
			type: String,
			required: true,
		},
		board: {
			type: String,
			enum: ["cbse", "icse", "state board", "others"],
			required: true,
		},
	},
	localEntry: {
		college: {
			type: String,
			// required: true,
		},
		percentage: {
			type: Number,
			// required: true,
		},
		yearOfPassing: {
			type: Number,
			// required: true,
		},
		collegeAddress: {
			type: String,
			// required: true,
		},
		board: {
			type: String,
			enum: ["cbse", "icse", "state board", "others"],
			// required: true,
		},
	},
});

const Academics = mongoose.model("Academics", academicsSchema);

export default Academics;
