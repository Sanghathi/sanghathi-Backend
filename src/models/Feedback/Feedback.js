import mongoose from "mongoose";

const { model, Schema } = mongoose;

const FeedbackDetailsSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    semester: {
      type: String,
      required: true,
      trim: true,
    },
    feedbackRound: {
      type: Number,
      required: true,
      enum: [1, 2],
    },
    department: {
      type: String,
      required: true,
      trim: true,
    },
    // 9 Rating Fields (1-5 scale)
    mentorAccessibility: {
      type: Number,
      min: 1,
      max: 5,
      required: true,
    },
    mentorInteraction: {
      type: Number,
      min: 1,
      max: 5,
      required: true,
    },
    academicHelp: {
      type: Number,
      min: 1,
      max: 5,
      required: true,
    },
    mentorConcern: {
      type: Number,
      min: 1,
      max: 5,
      required: true,
    },
    listeningSkills: {
      type: Number,
      min: 1,
      max: 5,
      required: true,
    },
    professionalMotivation: {
      type: Number,
      min: 1,
      max: 5,
      required: true,
    },
    barrierResolution: {
      type: Number,
      min: 1,
      max: 5,
      required: true,
    },
    systemEffectiveness: {
      type: Number,
      min: 1,
      max: 5,
      required: true,
    },
    continuationWillingness: {
      type: Number,
      min: 1,
      max: 5,
      required: true,
    },
    // Yes/No Questions
    awareOfPST: {
      type: Boolean,
      default: false,
    },
    awareOfPLT: {
      type: Boolean,
      default: false,
    },
    // Text Field
    remarks: {
      type: String,
      default: "",
    },
    // Calculated Average Score
    averageScore: {
      type: Number,
      min: 1,
      max: 5,
      default: null,
    },
    // Submission timestamp
    submittedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

FeedbackDetailsSchema.index({ userId: 1, semester: 1, feedbackRound: 1 }, { unique: true });

const FeedbackDetails = model("FeedbackDetails", FeedbackDetailsSchema, "feedbackdetails");

export default FeedbackDetails;
