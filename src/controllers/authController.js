import { promisify } from "util";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import catchAsync from "../utils/catchAsync.js";
import AppError from "../utils/appError.js";
import sendEmail from "../utils/email.js";
import Role from "../models/Role.js";

const verfiyAsync = promisify(jwt.verify);
const signToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });

const cookieOptions = {
  expires: new Date(
    Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000
  ),
  httpOnly: true, //don't let browser js access this cookie, used to prevent xss attacks
};

if (process.env.NODE_ENV === "production") cookieOptions.secure = true;

// Default user credentials for testing
const DEFAULT_EMAIL = "demo@example.com"; 
const DEFAULT_PASSWORD = "test123"; 

export const signup = catchAsync(async (req, res, next) => {
  const { name, email, password, passwordConfirm, role: roleName } = req.body;

  let role;
  if (roleName) {
    // Find the role document based on the provided role name
    role = await Role.findOne({ name: roleName });

    if (!role) {
      return next(new AppError("Invalid role", 400));
    }
  }

  const newUser = await User.create({
    name,
    email,
    password,
    passwordConfirm,
    role: role ? role._id : undefined, // Assign the role _id if available, otherwise set it as undefined
  });

  const token = signToken(newUser._id);

  res.cookie("jwt", token, cookieOptions);

  // Remove the password from the response
  newUser.password = undefined;

  res.status(201).json({
    status: "success",
    data: {
      user: newUser,
    },
  });
});

export const login = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;

  // 1) Check if email and password exist
  if (!email || !password) {
    return next(new AppError("Please provide email and password", 400));
  }

  // 2) Check if the provided email and password match the default user
  if (email === DEFAULT_EMAIL && password === DEFAULT_PASSWORD) {
    const user = {
      _id: "default_user_id", // Replace with a valid default user ID if necessary
      email: DEFAULT_EMAIL,
      // Add other properties if necessary
    };

    // Generate JWT for the default user
    const token = signToken(user._id); // Signing token using user ID

    return res.status(200).json({
      status: "success",
      token,
      data: {
        user,
      },
    });
  }

  // 3) Normal user authentication
  const user = await User.findOne({ email }).select("+password");

  if (!user || !(await user.checkPassword(password, user.password))) {
    // 401 = Unauthorized
    return next(new AppError("Incorrect email or password", 401));
  }

  // 4) Generate JWT and send it back to the client
  const token = signToken(user._id);

  // Remove the password from the response
  user.password = undefined;
  res.status(200).json({
    status: "success",
    token,
    data: {
      user,
    },
  });
});

export const protect = catchAsync(async (req, res, next) => {
  // 1) Getting token and check if it's there
  let token;
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    token = req.headers.authorization.split(" ")[1];
  }
  if (!token) {
    return next(
      new AppError("You are not logged in! Please log in to get access", 401)
    );
  }

  // 2) Verification of token
  const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);

  // 3) Check if user exists
  const currentUser = await User.findById(decoded.id).populate("role");
  if (!currentUser) {
    return next(
      new AppError("The user belonging to the token does not exist", 401)
    );
  }

  // 4) Check if user changed password after the token was issued
  if (currentUser.changedPasswordAfter(decoded.iat)) {
    return next(
      new AppError("User recently changed password! Please log in again", 401)
    );
  }

  // GRANT ACCESS TO PROTECTED ROUTE
  req.user = currentUser;
  next();
});

export function restrictTo(...roles) {
  return (req, res, next) => {
    // roles ['admin', 'lead-guide'], req.user.role = 'user' => no access
    // 403 = Forbidden
    if (!roles.includes(req.user.role)) {
      return next(
        new AppError("You do not have permission to perform this action", 403)
      );
    }
    next();
  };
}

export const forgotPassword = catchAsync(async (req, res, next) => {
  // 1) Get user based on POSTed email
  const user = await User.findOne({ email: req.body.email });

  if (!user) {
    return next(new AppError("There is no user with that email address.", 404));
  }
  // 2) Generate the random reset token
  const resetToken = user.createPasswordResetToken();
  await user.save({ validateBeforeSave: false });

  // 3) Send it to user's email
  const resetURL = `${req.protocol}://${req.get(
    "host"
  )}/api/v1/users/resetPassword/${resetToken}`;

  const message = `Forgot your password? Submit a PATCH request with your new password and passwordConfirm to: ${resetURL}.\n If you didn't forget your password, please ignore this email.`;

  try {
    await sendEmail({
      email: user.email,
      subject: "Your password reset token (valid for 10 minutes)",
      message,
    });

    res.status(200).json({
      status: "success",
      message: "Token sent to email!",
    });
  } catch (err) {
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save({ validateBeforeSave: false });

    return next(
      new AppError("There was an error sending the email. Try again later!"),
      500
    );
  }
});

export function resetPassword(req, res, next) {
  // Implement the reset password logic here
}

export function logout(req, res, next) {
  req.logout();
  res.redirect("/");
}
