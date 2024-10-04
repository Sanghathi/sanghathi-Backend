// utils/apiLogger.js
import winston from "winston";
import "winston-daily-rotate-file";
import fs from "fs";
import path from "path";

const logDirectory = path.join(process.cwd(), "logs");

// Create the log directory if it doesn't exist
if (!fs.existsSync(logDirectory)) {
  fs.mkdirSync(logDirectory);
}

const apiLogger = winston.createLogger({
  level: "info",
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.DailyRotateFile({
      filename: path.join(logDirectory, "api-%DATE%.log"),
      datePattern: "YYYY-MM-DD",
      zippedArchive: true,
      maxSize: "10m",
      maxFiles: "14d",
    }),
  ],
});

export { apiLogger };
