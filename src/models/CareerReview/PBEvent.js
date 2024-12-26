import mongoose from "mongoose";

const { model, Schema } = mongoose;

const PBEventSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        unique: true, 
    },
    ProffessionalBodyEvent: [
        {
            ProffessionalBodyName: String,
            eventTitle: String,
            eventDate: Date,
        },
    ],
});

const PBEvent = model("PBEvent", PBEventSchema);

export default PBEvent;
        