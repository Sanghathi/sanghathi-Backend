import logger from "../utils/logger.js";

class SocketController {
  joinRoom(socket) {
    return (room) => {
      logger.info(`User ${socket.id} joining room ${room}`);
      socket.join(room);

      // Get the clients in a room
      const clientsInRoom = socket.adapter.rooms.get(room);

      // Check if there are clients in the room
      if (clientsInRoom) {
        // Get an array of userIds from the clients in the room
        const userIdsInRoom = [...clientsInRoom].map(
          (clientId) => socket.server.sockets.sockets.get(clientId).id
        );

        // Log the userIds
        logger.info(`Users in room ${room}: ${userIdsInRoom.join(", ")}`);
      } else {
        logger.info(`No users in room ${room}`);
      }
    };
  }

  leaveRoom(socket) {
    return (room) => {
      logger.info(`User ${socket.id} leaving room ${room}`);
      socket.leave(room);
    };
  }

  sendMessage(socket) {
    return ({ _id, senderId, body, createdAt, roomId }) => {
      logger.info(
        `User ${senderId} sending message to room ${roomId}: ${body}`
      );

      socket.to(roomId).emit("receiveMessage", {
        senderId,
        body,
        createdAt,
        _id,
      });
    };
  }

  disconnect(socket) {
    return () => {
      logger.info(`Socket disconnected: ${socket.id}`);
    };
  }

  handleEvents(socket) {
    socket.on("join_room", this.joinRoom(socket));
    socket.on("leave_room", this.leaveRoom(socket));
    socket.on("sendMessage", this.sendMessage(socket));
    socket.on("disconnect", this.disconnect(socket));
  }
}

export default new SocketController();
