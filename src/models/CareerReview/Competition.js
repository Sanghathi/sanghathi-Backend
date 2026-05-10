import mongoose from "mongoose";

const CompetitionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  collegeCode: { type: String },
  department: { type: String },
  email: { type: String },
  sem: { type: Number },
  section: { type: String },

  eventDate: { type: Date },
  eventName: { type: String },
  organizedBy: { type: String },
  studentNames: { type: [String], default: [] },
  studentUSNs: { type: [String], default: [] },
  contactNumber: { type: String },
  mentorName: { type: String },
  status: { type: String },
  cashAwardOrTrophy: { type: String },
  projectTitle: { type: String },
  category: { type: String },
  level: { type: String, enum: ["State", "National", "International", "Other"], default: "Other" },
  eventAffiliation: { type: String, enum: ["Internal", "External"], default: "External" },
  eventType: { type: String },
  financialSupportRequested: { type: Boolean, default: false },
  amountSanctioned: { type: String },
  relatedTo: { type: String },
  proofLink: { type: String },

  createdAt: { type: Date, default: Date.now },
});

const Competition = mongoose.model("Competition", CompetitionSchema);
export default Competition;
