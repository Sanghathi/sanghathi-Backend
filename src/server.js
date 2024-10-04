// Import necessary modules and configurations
import "./config.js"; // Load configurations (e.g., environment variables)
import connectDB from "./utils/db.js"; // Database connection utility
import app from "./index.js"; // Express app instance
import logger from "./utils/logger.js"; // Logger utility
import SocketManager from "./utils/socketManager.js"; // Socket manager utility
import socketController from "./controllers/socketController.js"; // Socket event handler
import morganMiddleware from "./utils/morganMiddleware.js"; // HTTP request logger
import dotenv from 'dotenv'; // Environment variable management
import Role from "./models/Role.js"; // Role model (if needed)

// Load environment variables
dotenv.config();

// Use the morgan middleware for logging HTTP requests
app.use(morganMiddleware);

// Connect to the database
connectDB();

// Set up global error handling for uncaught exceptions
process.on("uncaughtException", (err) => {
  logger.error("UNCAUGHT EXCEPTION! 💥 Shutting down...", {
    error: err.message,
    stack: err.stack,
  });
  process.exit(1); // Exit the process with an error
});

// Define the port to run the server on
const port = process.env.PORT || 8000;

// Start the server and log successful launch
const server = app.listen(port, () => {
  logger.info(`${process.env.NODE_ENV} Build 🔥`, {
    environment: process.env.NODE_ENV,
  });
  logger.info(`App running on port ${port}...`, { port });
});

// Set up Socket.IO server with CORS options
const io = SocketManager.createServer(server, {
  cors: {
    origin: process.env.CLIENT_HOST, // Allow connections from the client
    methods: ["GET", "POST"], // Allowed methods
  },
});

// Handle Socket.IO connections and events
io.on("connection", (socket) => {
  logger.info(`New socket connection: ${socket.id}`);
  socketController.handleEvents(socket); // Handle socket events
});

// Set up global error handling for unhandled promise rejections
process.on("unhandledRejection", (err) => {
  logger.error("UNHANDLED REJECTION! 💥 Shutting down...", {
    error: err.name,
    message: err.message,
  });
  server.close(() => {
    process.exit(1); // Exit after closing the server
  });
});

// Graceful shutdown on process termination (SIGINT, SIGTERM)
process.on('SIGINT', () => {
  logger.info("SIGINT signal received: closing HTTP server");
  server.close(() => {
    logger.info("HTTP server closed");
    process.exit(0); // Exit the process gracefully
  });
});

process.on('SIGTERM', () => {
  logger.info("SIGTERM signal received: closing HTTP server");
  server.close(() => {
    logger.info("HTTP server closed");
    process.exit(0); // Exit the process gracefully
  });
});
