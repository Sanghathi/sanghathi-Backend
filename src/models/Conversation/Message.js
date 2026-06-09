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
    default: "",
  },
  attachments: {
    type: [
      {
        url: String,
        publicId: String,
        originalName: String,
        resourceType: String,
        mimeType: String,
        bytes: Number,
      },
    ],
    default: [],
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
