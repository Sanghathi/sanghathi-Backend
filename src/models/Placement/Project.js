import mongoose from "mongoose";
const { model, Schema } = mongoose;

const projectSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  projects: [
    // Fix: Wrap project details in an array
    {
      domain: {
        type: String,
        required: true,
      },
      projectTitle: {
        type: String,
        required: true,
      },
      location: {
        type: String,
        enum: ["College", "Public Section", "Private"],
        required: true,
      },
      dateOfStart: {
        type: Date,
        required: true,
      },
      dateOfEnd: {
        type: Date,
        required: true,
      },
      teamInformation: {
        type: String,
        required: true,
      },
      projectDescription: {
        type: String,
        required: true,
      },
    },
  ],
});

const Project = model("Project", projectSchema);
export default Project;
