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
    if (data.type === "utf8") {
      const { utf8Data: response } = data;
      const res = JSON.parse(response);

      if (res.type === "register") {
        room.set(res.id, connection);
      }

      if (res.type === "message") {
        const receiver = room.get(res.receiverId);
        if (receiver) {
          receiver.send(
            JSON.stringify({
              content: res.content,
              sender: res.sender,
            })
          );
        } else {
          console.log(`User ${res.receiverId} not found`);
        }
      }
    }
  });
  connection.on("close", function (reasonCode, description) {
    room.clear();
    console.log(
      new Date() + " Peer " + connection.remoteAddress + " disconnected."
    );
  });
});
