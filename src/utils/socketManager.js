import { Server } from "socket.io";

import logger from "./logger.js";
class SocketManager {
  static instance = null;
  io = null;

  constructor() {
    if (!SocketManager.instance) {
      SocketManager.instance = this;
    }
    return SocketManager.instance;
  }

  createServer(server, options) {
    logger.info("Creating Socket.IO server with options:", options);
    this.io = new Server(server, options);
    logger.info("Socket.IO server created successfully");
    return this.io;
  }

  getIO() {
    if (!this.io) {
      throw new Error("Socket.IO not initialized!");
    }
    return this.io;
  }
}

const instance = new SocketManager();
export default instance;