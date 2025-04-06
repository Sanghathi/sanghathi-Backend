import mongoose from "mongoose";
const { model, Schema } = mongoose;

const internshipItemSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    unique: true,
  },
  internships: [
    {
      companyName: {
        type: String,
        required: true,
      },
      location: {
        type: String,
        required: true,
      },
      dateOfSelection: {
        type: Date,
        required: true,
      },
      dateOfEnd: {
        type: Date,
        required: true,
      },
      stipend: {
        type: String,
        required: true,
      },
      semester: {
        type: String,
        required: true,
      },
      description: {
        type: String,
        required: false,
      },
    },
  ],
});

const Internship = model("Internship", internshipItemSchema);
export default Internship;
