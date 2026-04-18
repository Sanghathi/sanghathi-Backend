import mongoose from "mongoose";

const conversationSchema = new mongoose.Schema({
  conversationId: {
    type: String,
    required: false,
  },
  status: {
    type: String,
    default: "closed",
    enum: ["active", "closed"],
  },
  mentorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: false,
  },
  menteeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: false,
  },
  title: {
    type: String,
    default: "",
  },
  topic: {
    type: String,
    default: "",
  },
  conversationText: {
    type: String,
    default: "",
  },
  description: {
    type: String,
    default: "",
  },
  moocChecked: {
    type: Boolean,
    default: false,
  },
  projectChecked: {
    type: Boolean,
    default: false,
  },
  summary: {
    type: String,
    default: "",
  },
  isOffline: {
    type: Boolean,
    default: true,
  },
  date: {
    type: Date,
    default: Date.now,
  },
});

conversationSchema.index(
  { conversationId: 1 },
  {
    unique: true,
    partialFilterExpression: {
      conversationId: { $type: "string" },
    },
  }
);
conversationSchema.index({ mentorId: 1, menteeId: 1, date: -1 });

const Conversation = mongoose.model("Conversation", conversationSchema);
export default Conversation;



