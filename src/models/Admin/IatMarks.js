import mongoose from "mongoose";

const iatSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'User' },
  semesters: [
    {
      semester: { type: Number, required: true },
      subjects: [
        {
          subjectName: { type: String, required: true },
          subjectCode: { type: String, required: true },
          iat1: { type: String },
          iat2: { type: String },
          avg: { type: String },
        },
      ],
    },
  ],
});

const Iat = mongoose.model("Iat", iatSchema);
export default Iat;