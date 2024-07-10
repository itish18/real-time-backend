import { useEffect, useRef, useState } from "react";

function App() {
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const [ws, setWs] = useState(null);
  const [pc, setPc] = useState(null);
  const [room, setRoom] = useState("");

  const [local, setLocal] = useState(null);

  useEffect(() => {
    const ws = new WebSocket("ws://localhost:8080", "echo-protocol");
    setWs(ws);

    const pc = new RTCPeerConnection();
    setPc(pc);

    window.navigator.permissions
      .query({ name: "camera" })
      .then((obj) => {
        if (obj.state === "granted") {
          window.navigator.mediaDevices
            .getUserMedia({
              video: true,
              audio: true,
            })
            .then((data) => {
              let localVideo = data.getVideoTracks()[0];
              setLocal(data);
              localVideoRef.current.srcObject = new MediaStream([localVideo]);

              data.getTracks().forEach((track) => pc.addTrack(track, data));
            });
        }
      })
      .catch((e) => console.log(e));

    pc.onicecandidate = (e) => {
      if (e.candidate) {
        ws.send(
          JSON.stringify({
            roomId: room.toString(),
            data: { type: "candidate", candidate: e.candidate },
          })
        );
      }
    };

    pc.onnegotiationneeded = async (e) => {
      if (e.candidate && room) {
        ws.send(
          JSON.stringify({
            roomId: room.toString(),
            data: { type: "candidate", candidate: e.candidate },
          })
        );
      }
    };

    pc.ontrack = (e) => {
      console.log(e.streams);
      remoteVideoRef.current.srcObject = e.streams[0];
    };

    ws.onmessage = async (message) => {
      const data = JSON.parse(message.data);
      if (data.type === "offer") {
        await pc.setRemoteDescription(new RTCSessionDescription(data.sdp));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        ws.send(
          JSON.stringify({
            roomId: room.toString(),
            data: { type: "answer", sdp: answer },
          })
        );
      } else if (data.type === "answer") {
        await pc.setRemoteDescription(new RTCSessionDescription(data.sdp));
      } else if (data.type === "candidate") {
        await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
      } else if (data.type === "toggle-camera") {
        handleToggleCamera(data);
      }
    };
  }, []);

  const sendOffer = async () => {
    if (!pc) {
      console.log("Peer connection is not initialized");
      return;
    }

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    ws.send(
      JSON.stringify({
        roomId: room.toString(),
        data: { type: "offer", sdp: offer },
      })
    );
  };

  const handleToggleCamera = (data) => {
    console.log(data);
    console.log(local);
    if (data.cameraOn && local) {
      const videoTrack = local.getVideoTracks();
      if (videoTrack) {
        videoTrack.forEach((track) => track.stop());
        setLocal(null);
        localVideoRef.current.srcObject = null;
        pc.setRemoteDescription(null);
      }
    } else {
      navigator.mediaDevices
        .getUserMedia({ video: true, audio: true })
        .then((data) => {
          let localVideo = data.getVideoTracks()[0];
          setLocal(data);
          localVideoRef.current.srcObject = new MediaStream([localVideo]);
        })

        .catch((error) => {
          console.error("Error accessing media devices.", error);
        });
    }
  };

  return (
    <div>
      <div
        style={{ display: "flex", flexDirection: "column", maxWidth: "10em" }}
      >
        <input
          type="text"
          placeholder="Enter the room that you want to join"
          onChange={(e) => setRoom(e.target.value)}
        />
        <button onClick={sendOffer}>Join room</button>
        <button
          onClick={() => {
            if (local) {
              const videoTrack = local.getVideoTracks();
              if (videoTrack) {
                videoTrack.forEach((track) => track.stop());
                setLocal(null);
                localVideoRef.current.srcObject = null;
              }
              ws.send(
                JSON.stringify({
                  roomId: room.toString(),
                  data: { type: "toggle-camera", cameraOn: false },
                })
              );
            } else {
              navigator.mediaDevices
                .getUserMedia({ video: true, audio: true })
                .then(async (data) => {
                  let localVideo = data.getVideoTracks()[0];
                  setLocal(data);
                  localVideoRef.current.srcObject = new MediaStream([
                    localVideo,
                  ]);
                  const offer = await pc.createOffer();
                  await pc.setLocalDescription(offer);

                  ws.send(
                    JSON.stringify({
                      roomId: room.toString(),
                      data: { type: "toggle-camera", cameraOn: true },
                    })
                  );
                  ws.send(
                    JSON.stringify({
                      roomId: room.toString(),
                      data: { type: "answer", sdp: offer },
                    })
                  );
                })
                .catch((error) => {
                  console.error("Error accessing media devices.", error);
                });
            }
          }}
        >
          Turn off camera
        </button>
      </div>
      <video ref={localVideoRef} autoPlay playsInline></video>
      <video ref={remoteVideoRef} autoPlay playsInline></video>
    </div>
  );
}

export default App;
