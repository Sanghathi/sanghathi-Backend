import mongoose from "mongoose";

const { Schema, model } = mongoose;

const conversationSchema = new Schema({
  recipients: [{ type: Schema.Types.ObjectId, ref: "Users" }],
  conversationId: {
    type: String,
  },
  lastMessage: {
    type: String,
  },
  date: {
    type: String,
    default: Date.now,
  },
});

const Conversation = model("conversations", conversationSchema);

export default Conversation;
