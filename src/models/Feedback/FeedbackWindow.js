import mongoose from "mongoose";

const { model, Schema } = mongoose;

const FeedbackWindowSchema = new Schema(
  {
    key: {
      type: String,
      default: "global",
      unique: true,
      immutable: true,
    },
    isEnabled: {
      type: Boolean,
      default: false,
    },
    semester: {
      type: String,
      default: "",
      trim: true,
    },
    feedbackRound: {
      type: Number,
      default: 1,
      enum: [1, 2],
    },
    updatedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  { timestamps: true }
);

const FeedbackWindow = model("FeedbackWindow", FeedbackWindowSchema, "feedbackwindows");

export default FeedbackWindow;
