// utils/morganMiddleware.js
import morgan from "morgan";
import { createWriteStream } from "fs";
import path from "path";

const logDirectory = path.join(process.cwd(), "logs");

// Create a write stream for Morgan
const accessLogStream = createWriteStream(path.join(logDirectory, "api.log"), {
  flags: "a",
});

const morganMiddleware = morgan(
  ":method :url :status :response-time ms - :res[content-length]",
  {
    stream: accessLogStream,
    skip: (req, res) => res.statusCode < 400, // Skip logging for successful requests
  }
);

export default morganMiddleware;
