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
    // if (!room) {
    //   this.rooms.set(roomId.toString(), { sockets: [socket] });
    // } else {
    //   room.sockets.push(socket);
    //   this.rooms.set(roomId.toString(), room);
    //   this.initHandlers({ socket, roomId, data });
    // }
  }

  getRoom(roomId) {
    return this.rooms.get(roomId.toString());
  }

  initHandlers({ socket, roomId, data }) {
    switch (data.type) {
      case "offer":
        console.log("offer");
        this.onOffer({ roomId, socket, sdp: data.sdp });
        break;
      case "answer":
        console.log("answer");
        this.onAnswer({ roomId, socket, sdp: data.sdp });
        break;
      case "candidate":
        console.log("cand");
        this.onIceCandidate({
          roomId,
          socket,
          candidate: data.candidate,
          type: data.person,
        });

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

  sendToOtherUserInRoom({ roomId, senderSocket, message }) {
    const room = this.rooms.get(roomId.toString());

    if (!room) {
      console.log("room not found");
      return;
    }

    const receivingUser = room.sockets.find(
      (socket) => socket !== senderSocket
    );

    if (receivingUser) {
      receivingUser.send(JSON.stringify(message));
    } else {
      console.log("no receiving user found");
    }
  }
}
