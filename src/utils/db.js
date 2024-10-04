import Mongoose from "mongoose";
import logger from "./logger.js";
import dotenv from "dotenv"; // Import dotenv to read environment variables

// Load environment variables from .env file
dotenv.config();

const uri = process.env.MONGODB_URI; // Ensure this is set in your .env file

async function connectDB() {
  try {
    // Use IPv4, skip trying IPv6
    await Mongoose.connect(uri, { family: 4, useNewUrlParser: true, useUnifiedTopology: true });
    logger.info("DB CONNECTED SUCCESSFULLY!");
  } catch (error) {
    console.error("Failed to connect to the database:", error);
    process.exit(1);
  }
}

export default connectDB;
