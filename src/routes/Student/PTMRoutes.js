import { Router } from "express";
const router = Router();

import StudentRecordSchema from "../../zod/PTM.js";
import PTMRecord from "../../models/Student/PTM.js";

router.get("/:id", async (req, res) => {
	try {
		const records = await PTMRecord.findOne({ userId: req.params.id });
		if (!records) {
			return res.status(404).json({ error: "Meeting details not found" });
		}
		res.json(records);
	} catch (error) {
		console.error(error.message);
		res.status(500).send("Server Error");
	}
});

// Create one PTM record
router.post("/", async (req, res) => {
	const ptmData = {
		userId: req.body.userId,
		counsellingRecords: req.body.counsellingRecords.map((record) => ({
			date: record.date,
			details: record.details,
		})),
		telephonicConversations: req.body.telephonicConversations.map(
			(conversation) => ({
				date: conversation.date,
				phoneNo: conversation.phoneNo,
				callingReason: conversation.callingReason,
				remarks: conversation.remarks,
			})
		),
		parentTeacherMeetings: req.body.parentTeacherMeetings.map((meeting) => ({
			meetingNo: meeting.meetingNo,
			reason: meeting.reason,
			conclusion: meeting.conclusion,
		})),
	};

	try {
		const validate = StudentRecordSchema.safeParse(ptmData);
		const newRecord = new PTMRecord(ptmData);
		await newRecord.save();
		res.status(201).json(newRecord);
	} catch (error) {
		res.status(400).json({ error: error.message });
	}
});

export default router;
