import mongoose from "mongoose";

const { model, Schema } = mongoose;

const careerCounsellingSchema = new mongoose.Schema({
  userId: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  TechnicalStudies: {
    type: String,
    default: "",
  },
  ManagementStudies: {
    type: String,
    default: "",
  },
  Entrepreneur: {
    type: String,
    default: "",
  },
  Job: {
    type: String,
    default: "",
  },
  CompetitiveExams: {
    type: String,
    default: "",
  },
  CareerObjective: {
    type: String,
    default: "",
  },
  ActionPlan: {
    type: String,
    default: "",
  },
  TrainingRequirements: {
    type: String,
    default: "",
  },
  TrainingPlanning: {
    type: String,
    default: "",
  },
  Certification: {
    type: String,
    default: "",
  },
}, { timestamps: true });

const CareerCounselling = model("CareerCounselling", careerCounsellingSchema);

export default CareerCounselling;
