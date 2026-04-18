import mongoose from "mongoose";
const { model, Schema } = mongoose;

const TYLScoresSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    semesters: [
      {
        semester: {
          type: Number,
          required: true,
        },
        scores: {
          type: Object,
          default: {
            "Language Proficiency in English": { target: "", actual: "" },
            "Aptitude": { target: "", actual: "" },
            "Core Fundamentals": { target: "", actual: "" },
            "Certifications": { target: "", actual: "" },
            "Experiential Mini Projects": { target: "", actual: "" },
            "Internships": { target: "", actual: "" },
            "Soft Skills": { target: "", actual: "" }
          }
        }
      }
    ]
  },
  { timestamps: true }
);

TYLScoresSchema.index({ userId: 1 });
TYLScoresSchema.index({ userId: 1, "semesters.semester": 1 });

const TYLScores = model("TYLScores", TYLScoresSchema);

export default TYLScores; 