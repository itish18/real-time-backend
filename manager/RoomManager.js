export class RoomManager {
  constructor() {
    this.rooms = new Map();
  }

  createRoom({ roomId, socket, data }) {
    const room = this.rooms.get(roomId.toString());

    if (!room) {
      this.rooms.set(roomId.toString(), { sockets: [socket] });
    } else {
      room.sockets.push(socket);
      this.rooms.set(roomId.toString(), room);
      this.initHandlers({ socket, roomId, data });
    }
  }

  getRoom(roomId) {
    return this.rooms.get(roomId.toString());
  }

  initHandlers({ socket, roomId, data }) {
    switch (data.type) {
      case "offer":
        this.onOffer({ roomId, socket, sdp: data.sdp });
        break;
      case "answer":
        this.onAnswer({ roomId, socket, sdp: data.sdp });
        break;
      case "candidate":
        this.onIceCandidate({
          roomId,
          socket,
          candidate: data.candidate,
          type: data.person,
        });
        break;
      case "toggle-camera":
        this.toggleCamera({
          roomId,
          socket,
          cameraOn: data.cameraOn,
        });
      case "closed":
        this.removeUserFromRoom({ roomId, socket });
        break;
      default:
        console.log("Unknown data type:", data.type);
    }
  }

  onOffer({ roomId, socket: senderSocket, sdp }) {
    this.sendToOtherUserInRoom({
      roomId,
      senderSocket,
      message: { type: "offer", sdp, roomId },
    });
  }

  onAnswer({ roomId, socket: senderSocket, sdp }) {
    this.sendToOtherUserInRoom({
      roomId,
      senderSocket,
      message: { type: "answer", sdp, roomId },
    });
  }

  onIceCandidate({ roomId, socket: senderSocket, candidate }) {
    this.sendToOtherUserInRoom({
      roomId,
      senderSocket,
      message: { type: "candidate", candidate },
    });
  }

  toggleCamera({ roomId, socket: senderSocket, cameraOn }) {
    this.sendToOtherUserInRoom({
      roomId,
      senderSocket,
      message: { type: "toggle-camera", cameraOn },
    });
  }

  removeUserFromRoom({ roomId, socket: senderSocket }) {
    const room = this.rooms.get(roomId.toString());

    if (!room) {
      console.log("room not found");
      return;
    }
    const users = room.sockets.filter((socket) => socket !== senderSocket);

    if (users.length === 0) {
      this.rooms.delete(roomId.toString());
    } else {
      room.sockets = users;
      this.rooms.set(roomId.toString(), room);
    }
  }

  sendToOtherUserInRoom({ roomId, senderSocket, message }) {
    const room = this.rooms.get(roomId.toString());

    console.log(message.type);

    if (!room) {
      console.log("room not found");
      return;
    }

    room.sockets.forEach((socket) => {
      if (socket !== senderSocket) {
        socket.send(JSON.stringify(message));
      }
    });
  }
}
