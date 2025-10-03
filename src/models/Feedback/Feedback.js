import mongoose from "mongoose";
const { model, Schema } = mongoose;
const FeedbackDetailsSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false,
    },
    issues: { type: String },
    features: { type: String },
    performance: { type: String },
    feedback: { type: String },



    

  },
  { timestamps: true }
);

const FeedbackDetails = model("FeedbackDetails", FeedbackDetailsSchema);

export default FeedbackDetails;
