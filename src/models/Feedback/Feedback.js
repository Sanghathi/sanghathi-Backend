import mongoose from "mongoose";
const { model, Schema } = mongoose;
const FeedbackDetailsSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    mentorFeedback: [{ type: Number }],
    averageScore: { type: Number },
    rateMentor: { type: Number },
    semester: { type: Number },
  },
  { timestamps: true }
);

const FeedbackDetails = model("FeedbackDetails", FeedbackDetailsSchema);

export default FeedbackDetails;
