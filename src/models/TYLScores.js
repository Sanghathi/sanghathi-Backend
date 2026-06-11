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
          default: {}
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
