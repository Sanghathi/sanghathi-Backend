import mongoose from "mongoose";

const { Schema, model } = mongoose;

const collegeSchema = new Schema(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    emailDomains: [
      {
        type: String,
        lowercase: true,
        trim: true,
      },
    ],
    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
    },
  },
  { timestamps: true }
);

collegeSchema.index({ code: 1 }, { unique: true });
collegeSchema.index({ name: 1 });

const College = model("College", collegeSchema);

export default College;
