import mongoose from "mongoose";

const externalSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    semesters: [
      {
        semester: {
          type: Number,
          required: true,
        },
        subjects: [
          {
            subjectCode: {
              type: String,
              required: true,
            },
            subjectName: {
              type: String,
              required: true,
            },
            externalMarks: {
              type: Number,
              default: null,
            },
            attempt: {
              type: Number,
              default: 1,
            },
            passingDate: {
              type: String,
              default: null,
            },
            cgpa: {
              type: Number,
              default: null,
            },
            result: {
              type: String,
              enum: ["PASS", "FAIL", null],
              default: null,
            },
          },
        ],
      },
    ],
  },
  {
    timestamps: true,
  }
);

const External = mongoose.model("External", externalSchema);

export default External; 