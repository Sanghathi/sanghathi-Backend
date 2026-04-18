import mongoose from "mongoose";
const { Schema, model } = mongoose;
const meetingSchema = new Schema({
  recipients: [{ type: Schema.Types.ObjectId, ref: "User" }],
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

meetingSchema.index({ recipients: 1, start: -1 });
meetingSchema.index({ type: 1, start: -1 });

const Meeting = model("meeting", meetingSchema);

export default Meeting;
