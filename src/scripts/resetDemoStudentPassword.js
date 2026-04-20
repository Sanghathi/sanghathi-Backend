import "dotenv/config";
import mongoose from "mongoose";
import User from "../models/User.js";
import { encrypt } from "../utils/passwordHelper.js";
import logger from "../utils/logger.js";

async function resetPassword() {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    const email = "demostudent@emithru.com";
    const newPassword = "demostudentpassword";

    const hashedPassword = await encrypt(newPassword);
    
    const user = await User.findOneAndUpdate(
      { email },
      { 
        password: hashedPassword,
        passwordChangedAt: undefined,
        passwordResetToken: undefined,
        passwordResetExpires: undefined
      },
      { new: true }
    );

    if (user) {
      logger.info("Password reset successfully for:", user.email);
      console.log("Password reset for:", email);
    } else {
      logger.info("User not found:", email);
    }
  } catch (error) {
    logger.error("Error resetting password:", error);
  } finally {
    await mongoose.disconnect();
  }
}

resetPassword();