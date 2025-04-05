import mongoose from "mongoose";
const { model, Schema } = mongoose;
const placementItemSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    unique: true,
  },
  placements: [
    {
      companyName: {
        type: String,
        required: true,
      },
      placedSemester: {
        type: String,
        required: true,
      },
      dateOfSelection: {
        type: Date,
        required: true,
      },
      type: {
        type: String,
        enum: ["In-Campus", "Off-Campus", "Pool"],
        required: true,
      },
      packageSalary: {
        type: String,
        required: true,
      },
      viewsToShare: {
        type: String,
        required: false,
      },
    },
  ],
});
const Placement = model("Placement", placementItemSchema);
export default Placement;
