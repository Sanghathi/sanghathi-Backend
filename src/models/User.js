import { randomBytes, createHash } from "crypto";
import mongoose from "mongoose";
import { encrypt, compare } from "../utils/passwordHelper.js";
import logger from "../utils/logger.js";
const { model, Schema } = mongoose;

const userSchema = new Schema({
  profile: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "StudentProfile",
    required: false,
  },
  name: {
    type: String,
    required: [true, "Please tell us your name!"],
  },
  email: {
    type: String,
    required: [true, "Please provide your email"],
    unique: true,
    lowercase: true,
  },
  phone: {
    type: String,
  },
  avatar: {
    type: String,
  },
  role: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Role",
  },
  roleName: {
    type: String,
    required: true,
  },
  lastActivity: {
    type: Date,
  },
  status: {
    type: String,
    enum: ["active", "inactive", "suspended"],
    default: "active",
  },
  password: {
    type: String,
    required: [true, "Please provide a password"],
    minlength: 8,
    select: false,
  },
  passwordConfirm: {
    type: String,
    required: [true, "Please confirm your password"],
    validate: {
      validator: function (el) {
        return el === this.password;
      },
      message: "Password do not match!",
    },
  },
  passwordChangedAt: Date,
  passwordResetToken: String,
  passwordResetExpires: Date,
});

userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  this.password = await encrypt(this.password);
  this.passwordConfirm = undefined; //This is to prevent saving the passwordConfirm to the database
  next();
});

userSchema.methods.checkPassword = async function (
  candidatePassword,
  userPassword
) {
  return await compare(candidatePassword, userPassword);
};

userSchema.methods.changedPasswordAfter = function (JWTTimestamp) {
  if (this.passwordChangedAt) {
    const changedTimestamp = parseInt(
      this.passwordChangedAt.getTime() / 1000,
      10
    );
    return JWTTimestamp < changedTimestamp;
  }
  return false;
};

userSchema.methods.createPasswordResetToken = function () {
  const resetToken = randomBytes(32).toString("hex");

  this.passwordResetToken = createHash("sha256")
    .update(resetToken)
    .digest("hex");

  logger.debug("Password reset token generated", {
    resetToken,
    passwordResetToken: this.passwordResetToken,
  });

  this.passwordResetExpires = Date.now() + 10 * 60 * 1000; //Expires in 10 minutes

  return resetToken;
};
const User = model("Users", userSchema);

export default User;
