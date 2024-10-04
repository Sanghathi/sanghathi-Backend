import mongoose from "mongoose";
const { Schema, model } = mongoose;
const meetingSchema = new Schema({
  recipients: [{ type: Schema.Types.ObjectId, ref: "Users" }],
  title: {
    type: String,
    required: true,
  },
  location: {
    type: String,
    required: true,
  },
  start: {
    type: String,
    required: true,
  },
  end: {
    type: String,
    required: true,
  },
  type: {
    type: String,
    required: true,
  },
});

const Meeting = model("meeting", meetingSchema);

export default Meeting;
