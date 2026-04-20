import mongoose from "mongoose";
const { model, Schema } = mongoose;
const FeedbackDetailsSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "User ID is required"],
    },
    issues: { 
      type: String,
      maxlength: [2000, "Issues field cannot exceed 2000 characters"]
    },
    features: { 
      type: String,
      maxlength: [2000, "Features field cannot exceed 2000 characters"]
    },
    performance: { 
      type: String,
      maxlength: [2000, "Performance field cannot exceed 2000 characters"]
    },
    feedback: { 
      type: String,
      maxlength: [5000, "Feedback field cannot exceed 5000 characters"]
    },
  },
  { timestamps: true }
);

FeedbackDetailsSchema.index({ userId: 1 });

const FeedbackDetails = model("FeedbackDetails", FeedbackDetailsSchema);

export default FeedbackDetails;
