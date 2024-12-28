import mongoose from "mongoose";

const { model, Schema } = mongoose;

const hobbiesSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'User',
    unique: true, 
  },
  hobby: {
    type: String,
    default: '',
  },
  nccNss: {
    type: String,
    default: '',
  },
  academic: {
    type: String,
    default: '',
  },
  cultural: {
    type: String,
    default: '',
  },
  sports: {
    type: String,
    default: '',
  },
  others: {
    type: String,
    default: '',
  },
  ambition: {
    type: String,
    default: '',
  },
  plans: {
    type: String,
    default: '',
  },
  roleModel: {
    type: String,
    default: '',
  },
  roleModelReason: {
    type: String,
    default: '',
  },
  selfDescription: {
    type: String,
    default: '',
  },
}, { timestamps: true }); 

const Hobbies = model('Hobbies', hobbiesSchema);

export default Hobbies;