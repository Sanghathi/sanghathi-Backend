import mongoose from "mongoose";

const formDraftSchema = new mongoose.Schema(
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
    draftData: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    version: {
      type: Number,
      default: 1,
      min: 1,
    },
    checksum: {
      type: String,
      default: "",
      trim: true,
    },
    isDirty: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

formDraftSchema.index({ userId: 1, formType: 1, scopeId: 1 }, { unique: true });
formDraftSchema.index({ updatedAt: -1 });

const FormDraft = mongoose.model("FormDraft", formDraftSchema);

export default FormDraft;
