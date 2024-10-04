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
});

const PrivateConversation = model(
  "PrivateConversation",
  PrivateConversationSchema
);

export default PrivateConversation;
