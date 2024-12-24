import mongoose from "mongoose";

const { model, Schema } = mongoose;

const ClubEventSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        unique: true, 
    },
    clubevents: [
        {
          clubName: String,
          eventTitle: String,
          eventDate: Date,
        },
    ],
});

const ClubEvents = model("ClubEvents", ClubEventSchema);

export default ClubEvents;
