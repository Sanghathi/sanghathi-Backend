import mongoose from "mongoose";

const { Schema, model } = mongoose;

const mentorshipSchema = new Schema({
  mentorId: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  menteeId: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  startDate: {
    type: Date,
    required: true,
  },
  endDate: {
    type: Date,
  },
});

// Add a validation to limit the number of students per mentor
mentorshipSchema.statics.countMentorships = async function (mentorId) {
  const count = await this.countDocuments({ mentorId });
  return count;
};

mentorshipSchema.path("mentorId").validate(async function (value) {
  const maxStudentsPerMentor = 16;
  const count = await this.model("Mentorship").countMentorships(value);
  return count < maxStudentsPerMentor;
}, "A mentor cannot have more than 16 students.");

export default model("Mentorship", mentorshipSchema);
