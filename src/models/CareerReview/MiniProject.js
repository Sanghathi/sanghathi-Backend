import mongoose from "mongoose";

const { model, Schema } = mongoose;

const MiniProjectSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        unique: true, 
    },
    miniproject: [
        {
            title: String,
            semester: { type: Number, min: 1, max: 8 },
            manHours: Number,
            startDate: Date,
            completedDate: Date,
        },
    ],
});

const MiniProjectData = model("MiniProjectData", MiniProjectSchema);

export default MiniProjectData;
        