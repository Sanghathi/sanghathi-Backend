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
    issues: {
      type: String,
    },
    features: {
      type: String,
    },
    performance: {
      type: String,
    },
    feedback: {
      type: String,
    },
  },
  { timestamps: true }
);

FeedbackDetailsSchema.index({ userId: 1, semester: 1, feedbackRound: 1 }, { unique: true });

const FeedbackDetails = model("FeedbackDetails", FeedbackDetailsSchema, "feedbackdetails");

export default FeedbackDetails;
