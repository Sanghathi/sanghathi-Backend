import "./config.js";
import connectDB from "./utils/db.js";
import app from "./index.js";
import logger from "./utils/logger.js";
import SocketManager from "./utils/socketManager.js";
import socketController from "./controllers/socketController.js";
import morganMiddleware from "./utils/morganMiddleware.js";

app.use(morganMiddleware);

process.on("uncaughtException", (err) => {
  logger.error("UNCAUGHT EXCEPTION! 💥 Shutting down...", {
    error: err.message,
    stack: err.stack,
  });
  process.exit(1);
});

connectDB();

const port = process.env.PORT || 8000;

const server = app.listen(port, () => {
  logger.info(`${process.env.NODE_ENV} Build 🔥`, {
    environment: process.env.NODE_ENV,
  });
  logger.info(`App running on port ${port}...`, { port });
});

const io = SocketManager.createServer(server, {
  cors: {
    origin: process.env.CLIENT_HOST,
    methods: ["GET", "POST"],
  },
});

io.on("connection", (socket) => {
  socketController.handleEvents(socket);
});

process.on("unhandledRejection", (err) => {
  logger.error("UNHANDLED REJECTION! 💥 Shutting down...", {
    error: err.name,
    message: err.message,
  });
  server.close(() => {
    process.exit(1);
  });
});
