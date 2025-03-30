import "./config.js";
import connectDB from "./utils/db.js";
import app from "./index.js";
import logger from "./utils/logger.js";
import SocketManager from "./utils/socketManager.js";
import socketController from "./controllers/socketController.js";
import morganMiddleware from "./utils/morganMiddleware.js";
import swaggerDocs from "./swagger.js"; // Import Swagger

app.use(morganMiddleware);
console.log("✅ Swagger initialized");
process.on("uncaughtException", (err) => {
  logger.error("UNCAUGHT EXCEPTION! 💥 Shutting down...", {
    error: err.message,
    stack: err.stack,
  });
  process.exit(1);
});

connectDB();

const port = process.env.PORT || 3000;


const server = app.listen(port, '0.0.0.0', () => {
  logger.info(`${process.env.NODE_ENV} Build 🔥`, {
    environment: process.env.NODE_ENV,
  });
  logger.info(`App running on port ${port}...`, { port });
});



const io = SocketManager.createServer(server, {
  cors: {
    origin: ["http://localhost:5173", "http://localhost:3000", "https://e-mithru.netlify.app"],
    methods: ["GET", "POST"],
    credentials: true
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
// ✅ Apply Swagger Docs BEFORE the error-handling middleware
swaggerDocs(app);

app.all("*", (req, res, next) => {
  res.status(404).json({
    status: "fail",
    message: `Can't find ${req.originalUrl} on this server!`,
  });
});
