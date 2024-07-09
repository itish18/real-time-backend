import { RoomManager } from "./RoomManager.js";

export class UserManager {
  constructor() {
    // this.roomManager = new RoomManager();
    this.queue = [];
  }

  addUser({ roomId, socket, data }) {
    // const room = this.roomManager.getRoom(roomId);
    // if (!room) {
    //   console.error(`Room not found: ${roomId}`);
    //   return;
    // }
    // this.roomManager.createRoom(roomId, socket);
    // this.queue.push(socket);
    // this.clearQueue()
    // this.initHandlers({ socket, roomId, data });
  }

  clearQueue() {}

  removeUser({ roomId, socket }) {
    const room = this.roomManager.getRoom(roomId);
    if (!room) {
      console.error(`Room not found: ${roomId}`);
      return;
    }
    const userIndex = room.users.findIndex(
      (user) => user.socket.id === socket.id
    );
    if (userIndex !== -1) {
      room.users.splice(userIndex, 1);
    }
  }

  initHandlers({ socket, roomId, data }) {
    if (data.type === "offer") {
      this.roomManager.onOffer({
        roomId,
        socket: socket.id,
        sdp: data.sdp,
      });
    }
    if (data.type === "answer") {
      this.roomManager.onAnswer({
        roomId,
        socket: socket.id,
        sdp: data.sdp,
      });
    }
    if (data.type === "candidate") {
      this.roomManager.onIceCandidate({
        roomId,
        socket: socket.id,
        candidate: data.candidate,
        type: data.person,
      });
    }
  }
}
