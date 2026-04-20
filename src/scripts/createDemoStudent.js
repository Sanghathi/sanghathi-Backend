import "dotenv/config";
import mongoose from "mongoose";
import User from "../models/User.js";
import Role from "../models/Role.js";
import logger from "../utils/logger.js";

async function createDemoStudent() {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
      }
    );

    const studentRole = await Role.findOne({ name: "student" });
    
    if (!studentRole) {
      logger.error("Student role not found. Please run seedRoles.js first");
      process.exit(1);
    }

    const existingUser = await User.findOne({ email: "demostudent@emithru.com" });
    
    if (existingUser) {
      console.log("User already exists:", existingUser);
      logger.info("User already exists:", existingUser.email);
      process.exit(0);
    }

    const newUser = await User.create({
      name: "Demo Student",
      email: "demostudent@emithru.com",
      role: studentRole._id,
      roleName: "student",
      password: "demostudentpassword",
      status: "active"
    });

    logger.info("User created successfully:", newUser.email);
    logger.info("User ID:", newUser._id);
  } catch (error) {
    logger.error("Error creating user:", error);
  } finally {
    await mongoose.disconnect();
  }
}

createDemoStudent();