import { z } from "zod";

// Zod schema for Counselling Record
export const CounsellingRecordSchema = z.object({
	date: z.string().refine((val) => !isNaN(Date.parse(val)), {
		message: "Invalid date format",
	}),
	details: z.string().min(1, "Details are required"),
});

// Zod schema for Telephonic Conversation
export const TelephonicConversationSchema = z.object({
	date: z.string().refine((val) => !isNaN(Date.parse(val)), {
		message: "Invalid date format",
	}),
	phoneNo: z.string().min(1, "Phone number is required"),
	callingReason: z.string().min(1, "Calling reason is required"),
	remarks: z.string().min(1, "Remarks are required"),
});

// Zod schema for Parent-Teacher Meeting
export const ParentTeacherMeetingSchema = z.object({
	meetingNo: z.number().positive("Meeting number must be a positive number"),
	reason: z.string().min(1, "Reason is required"),
	conclusion: z.string().min(1, "Conclusion is required"),
});

// Zod schema for Student Record
const StudentRecordSchema = z.object({
	counsellingRecords: z.array(CounsellingRecordSchema),
	telephonicConversations: z.array(TelephonicConversationSchema),
	parentTeacherMeetings: z.array(ParentTeacherMeetingSchema),
});

export default StudentRecordSchema;
