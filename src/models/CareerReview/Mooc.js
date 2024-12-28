import mongoose from "mongoose";

const { model, Schema } = mongoose;

const MoocSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        unique: true, 
    },
    mooc: [
        {
            portal: String, 
            title: String, 
            startDate: Date, 
            completedDate: Date, 
            score: { type: Number, min: 0, max: 100 },
            certificateLink: String
        },
    ],
});

const MoocData = model("MoocData", MoocSchema);

export default MoocData;
        