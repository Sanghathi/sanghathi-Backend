import mongoose from "mongoose";

const { Schema, model } = mongoose;

const PrivateConversationSchema = new Schema({
  type: { type: String, enum: ["private"], default: "private" },
  participants: [
    {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
  ],
  messages: [
    {
      type: Schema.Types.ObjectId,
      ref: "Messages",
    },
  ],
  body: String,
  senderId: { 
    type: Schema.Types.ObjectId, 
    ref: 'User',
    required: true 
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

PrivateConversationSchema.index({ participants: 1, createdAt: -1 });

const PrivateConversation = model(
  "PrivateConversation",
  PrivateConversationSchema
);

export default PrivateConversation;
