import mongoose from "mongoose";

const { Schema, model } = mongoose;

const GroupConversationSchema = new Schema({
  type: { type: String, enum: ["group"], default: "group" },
  name: { type: String, required: true },
  admin: {
    type: Schema.Types.ObjectId,
    ref: "Users",
  },
  participants: [
    {
      participant: {
        type: Schema.Types.ObjectId,
        ref: "Users",
      },
      joinedAt: { type: Date, default: Date.now },
      leftAt: { type: Date },
    },
  ],
  messages: [
    {
      type: Schema.Types.ObjectId,
      ref: "Messages",
    },
  ],
});

const GroupConversation = model("GroupConversation", GroupConversationSchema);

export default GroupConversation;
