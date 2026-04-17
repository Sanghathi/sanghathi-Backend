import mongoose from "mongoose";

const GlobalSettingsSchema = new mongoose.Schema({
  mentorFeedbackEnabled: { type: Boolean, default: false }
});

const GlobalSettings = mongoose.model('GlobalSettings', GlobalSettingsSchema);
export default GlobalSettings;
