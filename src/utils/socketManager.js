import { Server } from "socket.io";

class SocketManager {
  constructor() {
    if (!SocketManager.instance) {
      this.io = null;
      SocketManager.instance = this;
    }
    return SocketManager.instance;
  }

  createServer(server, options) {
    this.io = new Server(server, options);
    return this.io;
  }

  getIO() {
    return this.io;
  }
}

const instance = new SocketManager();
export default instance;
