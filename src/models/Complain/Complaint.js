import mongoose from "mongoose";
const { model, Schema } = mongoose;

const ComplaintSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false,
    },
    complaintSubject: { type: String },
    complaintDescription: { type: String },
    complaintSeverity: { type: String },
    additionalComments: { type: String },
  },
  { timestamps: true }
);

const Complaint = model("Complaint", ComplaintSchema);

export default Complaint;
