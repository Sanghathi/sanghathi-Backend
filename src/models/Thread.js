import mongoose from "mongoose";

const ThreadSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
  },
  description: {
    type: String,
    default:
      "There is currently not enough information to generate a summary for this thread.",
  },
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
  participants: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  ],
  status: {
    type: String,
    enum: ["open", "closed"],
    default: "open",
  },
  topic: {
    type: String,
    enum: ["general", "attendance", "performance", "well-being"],
    required: true,
  },
  messages: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Messages",
    },
  ],
  createdAt: {
    type: Date,
    default: Date.now,
    required: true,
  },
  closedAt: {
    type: Date,
  },
});

ThreadSchema.index({ participants: 1, createdAt: -1 });
ThreadSchema.index({ author: 1, createdAt: -1 });
ThreadSchema.index({ status: 1, createdAt: -1 });
ThreadSchema.index({ topic: 1, status: 1, createdAt: -1 });

export default mongoose.model("Thread", ThreadSchema);
