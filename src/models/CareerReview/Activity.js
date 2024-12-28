import mongoose from "mongoose";

const activitySchema = new mongoose.Schema({
  userId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
          required: true,
          unique: true, 
      },
      activity: [
          {
            eventType: String,
            eventTitle: String,
            description: String,
            eventDate: Date, 
          },
      ],
});

const ActivityData = mongoose.model("ActivityData", activitySchema);

export default ActivityData;