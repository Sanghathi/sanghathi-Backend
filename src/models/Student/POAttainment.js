import mongoose from "mongoose";
const { model, Schema } = mongoose;

const POAttainmentSchema = new mongoose.Schema(
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
        poAttainment: {
          type: Object,
          default: {}
        },
        bloomLevel: {
          type: Object,
          default: { level: 1 }
        }
      }
    ]
  },
  { timestamps: true }
);

const POAttainment = model("POAttainment", POAttainmentSchema);

export default POAttainment; 