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
  const message = `Duplicate field value : ${err.keyValue.name}. Please use another value!`;
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

  let error = Object.assign(Object.create(Object.getPrototypeOf(err)), err);
  error.message = err.message;
  error.name = err.name;
  error.code = err.code;

  if (error.name === "CastError") error = handleCastErrorDB(error);
  if (error.code === 11000) error = handleDuplicateFieldsDB(error);
  if (error.name === "ValidationError") error = handleValidationErrorDB(error);
  if (error.name === "JsonWebTokenError") error = handleJWTError();
  if (error.name === "TokenExpiredError") error = handleJWTExpiredError();
  if (error.name === "UnauthorizedError") error = handleUnauthorizedError();

  if (process.env.NODE_ENV === "development") {
    sendErrorDev(error, res);
  } else if (process.env.NODE_ENV === "production" || process.env.NODE_ENV === "test") {
    sendErrorProd(error, res);
  } else {
    // Fallback if NODE_ENV is unset or something else
    sendErrorDev(error, res);
  }
};
