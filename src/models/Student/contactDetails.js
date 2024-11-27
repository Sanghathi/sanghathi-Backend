// models/contactDetails.js
import mongoose from "mongoose" ;

const contactDetailsSchema = new mongoose.Schema({
    line1: {
        type: String,
        required: true,
    },
    line2: {
        type: String,
    },
    country: {
        type: String,
        required: true,
    },
    state: {
        type: String,
        required: true,
    },
    city: {
        type: String,
        required: true,
    },
    district: {
        type: String,
        required: true,
    },
    taluka: {
        type: String,
        required: true,
    },
    pinCode: {
        type: String,
        required: true,
    },
}, { timestamps: true });

const ContactDetails = mongoose.model('ContactDetails', contactDetailsSchema);

export default ContactDetails;
