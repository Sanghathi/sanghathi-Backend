import AppError from "../utils/appError.js";
import logger from "../utils/logger.js";

const handleCastErrorDB = (err) => {
  const message = `Invalid ${err.path}: ${err.value}.`;
  return new AppError(message, 400);
};

const handleValidationErrorDB = (err) => {
  const errors = Object.values(err.errors).map((el) => el.message);
  const message = `Invalid Input Data ${errors.join(". ")}`;
  return new AppError(message, 400);
};

const handleDuplicateFieldsDB = (err) => {
  // err.keyValue could have different keys (email, phone, etc.)
  const key = err.keyValue && Object.keys(err.keyValue)[0];
  const val = key ? err.keyValue[key] : undefined;
  const message = `Duplicate field value : ${key || "field"}: ${val || "undefined"}. Please use another value!`;
  return new AppError(message, 400);
};

const handleJWTError = () =>
  new AppError("Invalid Token, Please log in again", 401);

const handleJWTExpiredError = () =>
  new AppError("Your token has expired!, Please log in again.", 401);
const handleUnauthorizedError = () =>
  new AppError("Unauthorized access. Insufficient permissions.", 403);

const sendErrorDev = (err, req, res) => {
  const logMeta = {
    method: req.method,
    url: req.originalUrl,
    statusCode: err.statusCode,
  };

  if (err.isOperational && err.statusCode < 500) {
    logger.warn(`REQUEST ISSUE ⚠️ ${err.message}`, logMeta);
  } else {
    logger.error(`ERROR 💥  ${err}`, logMeta);
  }

  res.status(err.statusCode).json({
    status: err.status,
    message: err.message,
    error: err,
    stack: err.stack,
  });
};

const sendErrorProd = (err, res) => {
  //Operation,trusted error : send message to client

  if (err.isOperational) {
    res.status(err.statusCode).json({
      status: err.status,
      message: err.message,
    });

    //Programming error or other unknown error : don't leak error details
  } else {
    //1) Log error
    logger.error(`ERROR 💥  ${err}`);

    //2) Send generic message
    res.status(500).json({
      status: "error",
      message: "Something went very wrong",
    });
  }
};

export default (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || "error";

  const error = {
    ...err,
    statusCode: err.statusCode,
    status: err.status,
    message: err.message,
    name: err.name,
    code: err.code,
    stack: err.stack,
    isOperational: err.isOperational,
  };

  let normalizedError = error;

  if (normalizedError.name === "CastError") normalizedError = handleCastErrorDB(normalizedError);
  if (normalizedError.code === 11000) normalizedError = handleDuplicateFieldsDB(normalizedError);
  if (normalizedError.name === "ValidationError") normalizedError = handleValidationErrorDB(normalizedError);
  if (normalizedError.name === "JsonWebTokenError") normalizedError = handleJWTError();
  if (normalizedError.name === "TokenExpiredError") normalizedError = handleJWTExpiredError();
  if (normalizedError.name === "UnauthorizedError") normalizedError = handleUnauthorizedError();

  if (process.env.NODE_ENV === "development") {
    sendErrorDev(normalizedError, req, res);
  } else if (process.env.NODE_ENV === "production" || process.env.NODE_ENV === "test") {
    sendErrorProd(normalizedError, res);
  } else {
    // Fallback if NODE_ENV is unset or something else
    sendErrorDev(normalizedError, req, res);
  }
};
