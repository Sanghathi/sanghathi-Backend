import Mongoose from "mongoose";
import logger from "./logger.js";

const resolveMongoUri = () => {
  const configuredUri =
    process.env.MONGODB_URI ||
    process.env.MONGO_URI ||
    process.env.DATABASE_URL;

  if (!configuredUri) {
    throw new Error(
      "Missing MongoDB connection string. Set MONGODB_URI (or MONGO_URI / DATABASE_URL) in your environment file."
    );
  }

  if (!configuredUri.includes("<PASSWORD>")) {
    return configuredUri;
  }

  if (!process.env.DATABASE_PASSWORD) {
    throw new Error(
      "MONGODB_URI contains <PASSWORD> but DATABASE_PASSWORD is not set."
    );
  }

  return configuredUri.replace("<PASSWORD>", process.env.DATABASE_PASSWORD);
};

async function connectDB() {
  try {
    const uri = resolveMongoUri();

    // family : Use IPv4, skip trying IPv6
    await Mongoose.connect(uri, { family: 4 });
    logger.info("DB CONNECTED SUCCESSFULLY!");
  } catch (error) {
    logger.error("Failed to connect to the database:", error);
    process.exit(1);
  }
}

export default connectDB;
