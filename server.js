var WebSocketServer = require("websocket").server;
var http = require("http");

let room = new Map();

var server = http.createServer(function (request, response) {
  console.log(new Date() + " Received request for " + request.url);
  response.writeHead(404);
  response.end();
});
server.listen(8080, function () {
  console.log(new Date() + " Server is listening on port 8080");
});

let wsServer = new WebSocketServer({
  httpServer: server,
  autoAcceptConnections: false,
});

function originIsAllowed(origin) {
  // put logic here to detect whether the specified origin is allowed.
  return true;
}

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

        wsServer.connections.forEach((client) => {
          if (client !== connection) {
            console.log(client.webSocketVersion);
            client.sendUTF(JSON.stringify(message));
          }
        });
      }
    } catch (e) {
      console.log("Error handling message:", e);
    }
  });
  connection.on("close", function (reasonCode, description) {
    room.clear();
    console.log(
      new Date() + " Peer " + connection.remoteAddress + " disconnected."
    );
  });
});
