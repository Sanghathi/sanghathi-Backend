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
            manHours: Number,
            startDate: Date,
            completedDate: Date, 
        },
    ],
});

const MiniProjectData = model("MiniProjectData", MiniProjectSchema);

export default MiniProjectData;
        