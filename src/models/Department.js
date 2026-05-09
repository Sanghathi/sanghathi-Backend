import mongoose from "mongoose";

const { Schema, model } = mongoose;

const departmentSchema = new Schema(
  {
    collegeCode: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
    },
    code: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
    },
  },
  { timestamps: true }
);

departmentSchema.index({ collegeCode: 1, code: 1 }, { unique: true });
departmentSchema.index({ collegeCode: 1, name: 1 }, { unique: true });

departmentSchema.index({ collegeCode: 1, status: 1 });

const Department = model("Department", departmentSchema);

export default Department;
