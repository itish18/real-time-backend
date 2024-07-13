// var WebSocketServer = require("websocket").server;
// var http = require("http");
// const { UserManager } = require("./manager/UserManager");
import http from "http";
import WebSocketServer from "websocket";
import { UserManager } from "./manager/UserManager.js";
import { RoomManager } from "./manager/RoomManager.js";

var server = http.createServer(function (request, response) {
  console.log(new Date() + " Received request for " + request.url);
  response.writeHead(404);
  response.end();
});
server.listen(8080, function () {
  console.log(new Date() + " Server is listening on port 8080");
});

let wsServer = new WebSocketServer.server({
  httpServer: server,
  autoAcceptConnections: false,
});

function originIsAllowed(origin) {
  // put logic here to detect whether the specified origin is allowed.
  return true;
}

// const userManager = new UserManager();
const roomManager = new RoomManager();

wsServer.on("request", function (request) {
  //   if (!originIsAllowed(request.origin)) {
  //     // Make sure we only accept requests from an allowed origin
  //     request.reject();
  //     console.log(
  //       new Date() + " Connection from origin " + request.origin + " rejected."
  //     );
  //     return;
  //   }

  var connection = request.accept("echo-protocol", request.origin);

  connection.on("message", function (data) {
    try {
      if (data.type === "utf8") {
        const message = JSON.parse(data.utf8Data);
        connection.roomId = message.roomId;

        roomManager.createRoom({
          roomId: message.roomId,
          socket: connection,
          data: message.data,
        });

        // wsServer.connections.forEach((client) => {
        //   if (client !== connection) {
        //     client.sendUTF(JSON.stringify(message));
        //   }
        // });
      }
    } catch (e) {
      console.log("Error handling message:", e);
    }
  });
  connection.on("close", function (message) {
    if (connection.roomId) {
      roomManager.removeUserFromRoom({
        roomId: connection.roomId,
        socket: connection,
      });
    }
  });
});
