import mongoose from "mongoose";

const { Schema, model } = mongoose;

const PrivateConversationSchema = new Schema({
  type: { type: String, enum: ["private"], default: "private" },
  participants: [
    {
      type: Schema.Types.ObjectId,
      ref: "Users",
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
    ref: 'Users',
    required: true 
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const PrivateConversation = model(
  "PrivateConversation",
  PrivateConversationSchema
);

export default PrivateConversation;
