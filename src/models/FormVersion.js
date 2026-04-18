import mongoose from "mongoose";

const formVersionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    formType: {
      type: String,
      required: true,
      trim: true,
    },
    scopeId: {
      type: String,
      default: "default",
      trim: true,
    },
    version: {
      type: Number,
      required: true,
      min: 1,
    },
    snapshot: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },
    changedFields: {
      type: [String],
      default: [],
    },
    reason: {
      type: String,
      enum: ["manual-save", "submit", "restore", "autosave-checkpoint"],
      default: "manual-save",
    },
  },
  {
    timestamps: true,
  }
);

formVersionSchema.index(
  { userId: 1, formType: 1, scopeId: 1, version: 1 },
  { unique: true }
);
formVersionSchema.index({ userId: 1, formType: 1, scopeId: 1, createdAt: -1 });

const FormVersion = mongoose.model("FormVersion", formVersionSchema);

export default FormVersion;
