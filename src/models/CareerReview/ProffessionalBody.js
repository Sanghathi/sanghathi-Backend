import mongoose from "mongoose";

const { model, Schema } = mongoose;

const ProffessionalBodySchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        unique: true, 
    },
    ProffessionalBody: [
        {
            ProffessionalBodyName: String,
            UniqueID: String,
            registeredDate: Date,
        },
    ],
});

const ProffessionalBody = model("ProffessionalBody", ProffessionalBodySchema);

export default ProffessionalBody;