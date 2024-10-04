import mongoose from "mongoose";
const { Schema } = mongoose;

const CounsellingRecordSchema = new mongoose.Schema({
	date: {
		type: Date,
		required: true,
	},
	details: {
		type: String,
		required: true,
	},
});

const TelephonicConversationSchema = new mongoose.Schema({
	date: {
		type: Date,
		required: true,
	},
	phoneNo: {
		type: String,
		required: true,
	},
	callingReason: {
		type: String,
		required: true,
	},
	remarks: {
		type: String,
		required: true,
	},
});

const ParentTeacherMeetingSchema = new mongoose.Schema({
	meetingNo: {
		type: Number,
		required: true,
	},
	reason: {
		type: String,
		required: true,
	},
	conclusion: {
		type: String,
		required: true,
	},
});

const PTMRecordSchema = new mongoose.Schema({
	userId: {
		type: Schema.Types.ObjectId,
		ref: "Users",
		required: true,
	},
	counsellingRecords: [CounsellingRecordSchema],
	telephonicConversations: [TelephonicConversationSchema],
	parentTeacherMeetings: [ParentTeacherMeetingSchema],
});

const PTMRecord = mongoose.model("PTMRecord", PTMRecordSchema);

export default PTMRecord;
