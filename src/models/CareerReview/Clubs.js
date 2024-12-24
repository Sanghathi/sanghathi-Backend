import mongoose from "mongoose";

const { model, Schema } = mongoose;

const ClubSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        unique: true, 
    },
    clubs: [
        {
          clubName: String,
          clubdepartment: String,
          registeredDate: Date,
        },
    ],
});

const Clubs = model("Clubs", ClubSchema);

export default Clubs;
