import mongoose from "mongoose";

const { Schema, model } = mongoose;

const uploadSessionSchema = new Schema(
  {
    adminUserId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    tabType: {
      type: String,
      required: true,
      enum: [
        "add-users",
        "add-attendance",
        "add-iat-marks",
        "add-external-marks",
        "add-tyl-marks",
        "add-mooc-details",
        "add-mini-project-details",
      ],
      trim: true,
    },
    fileName: {
      type: String,
      default: "",
      trim: true,
    },
    status: {
      type: String,
      enum: ["success", "partial", "failed", "restored", "restore-failed"],
      default: "success",
    },
    totalRows: {
      type: Number,
      default: 0,
      min: 0,
    },
    successCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    errorCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    errors: {
      type: [String],
      default: [],
    },
    affectedUserIds: {
      type: [{ type: Schema.Types.ObjectId, ref: "User" }],
      default: [],
    },
    createdUserIds: {
      type: [{ type: Schema.Types.ObjectId, ref: "User" }],
      default: [],
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
    restored: {
      type: Boolean,
      default: false,
    },
    restoredAt: {
      type: Date,
      default: null,
    },
    restoredBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    restoreSummary: {
      type: Schema.Types.Mixed,
      default: null,
    },
  },
  { timestamps: true }
);

uploadSessionSchema.index({ createdAt: -1 });
uploadSessionSchema.index({ tabType: 1, createdAt: -1 });
uploadSessionSchema.index({ restored: 1, createdAt: -1 });

const AdminUploadSession = model("AdminUploadSession", uploadSessionSchema);

export default AdminUploadSession;