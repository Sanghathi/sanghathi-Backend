import { Router } from "express";
const router = Router();
// import {
// 	find,
// 	findById,
// 	findByIdAndUpdate,
// 	findByIdAndDelete,
// } from "../../models/Student/Admissions";
import Admission from "../../models/Student/Admissions.js";
import AdmissionSchema from "../../zod/AdmissionValidator.js";

// Create Admission
router.post("/", async (req, res) => {
	try {
		const validationCheck = AdmissionSchema.safeParse(req.body);
		const admission = new Admission(req.body);
		const savedAdmission = await admission.save();
		res.status(201).json(savedAdmission);
	} catch (error) {
		res.status(500).json({ error: error.message });
	}
});

// Read All Admissions
router.get("/", async (req, res) => {
	try {
		const admissions = await Admission.find();
		res.json(admissions);
	} catch (error) {
		res.status(500).json({ error: error.message });
	}
});

// Read Admission by ID
router.get("/:id", async (req, res) => {
	try {
		const admission = await Admission.findById(req.params.id);
		if (!admission) {
			return res.status(404).json({ error: "Admission not found" });
		}
		res.json(admission);
	} catch (error) {
		res.status(500).json({ error: error.message });
	}
});

// Update Admission by ID
router.patch("/:id", async (req, res) => {
	try {
		const validationCheck = AdmissionSchema.safeParse(req.body);
		const admission = await findByIdAndUpdate(req.params.id, req.body, {
			new: true,
		});
		if (!admission) {
			return res.status(404).json({ error: "Admission not found" });
		}
		res.json(admission);
	} catch (error) {
		res.status(500).json({ error: error.message });
	}
});

// Delete Admission by ID
router.delete("/:id", async (req, res) => {
	try {
		const admission = await Admission.findByIdAndDelete(req.params.id);
		if (!admission) {
			return res.status(404).json({ error: "Admission not found" });
		}
		res.json({ message: "Admission deleted" });
	} catch (error) {
		res.status(500).json({ error: error.message });
	}
});

export default router;
