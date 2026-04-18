import mongoose from "mongoose";

const MessageSchema = new mongoose.Schema({
  senderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
  parentType: {
    type: String,
    enum: ["thread", "private", "group"],
    required: false,
  },
  parentId: {
    type: mongoose.Schema.Types.ObjectId,
    required: false,
  },
  body: {
    type: String,
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

MessageSchema.index({ senderId: 1, createdAt: -1 });
MessageSchema.index({ parentType: 1, parentId: 1, createdAt: 1 });
MessageSchema.index({ parentType: 1, parentId: 1, createdAt: -1 });

export default mongoose.model("Messages", MessageSchema);
