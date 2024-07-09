import { useEffect, useRef, useState } from "react";

function App() {
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const [ws, setWs] = useState(null);
  const [pc, setPc] = useState(null);

  useEffect(() => {
    const ws = new WebSocket("ws://192.168.194.143:8080", "echo-protocol");
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
            roomId: "12",
            data: { type: "candidate", candidate: e.candidate },
          })
        );
      }
    };

    pc.ontrack = (e) => {
      remoteVideoRef.current.srcObject = e.streams[0];
    };

    ws.onmessage = async (message) => {
      const data = JSON.parse(message.data);
      console.log(data);
      if (data.type === "offer") {
        console.log(pc.signalingState);
        // if (pc.signalingState !== "stable") {
        //   console.log("Peer connection is not stable, cannot handle offer");
        //   return;
        // }
        await pc.setRemoteDescription(new RTCSessionDescription(data.sdp));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        ws.send(
          JSON.stringify({
            roomId: "12",
            data: { type: "answer", sdp: answer },
          })
        );
      } else if (data.type === "answer") {
        // if (pc.signalingState !== "have-local-offer") {
        //   console.log(
        //     "Peer connection is not in the correct state to handle answer"
        //   );
        //   return;
        // }
        console.log(data.sdp);
        await pc.setRemoteDescription(new RTCSessionDescription(data.sdp));
      } else if (data.type === "candidate") {
        // if (
        //   pc.signalingState === "stable" ||
        //   pc.signalingState === "have-local-offer" ||
        //   pc.signalingState === "have-remote-offer"
        // ) {
        await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
        // } else {
        //   console.log(
        //     "Peer connection is not in the correct state to handle candidate"
        //   );
        // }
      }
    };

    // return () => {
    //   ws.close();
    //   pc.close();
    // };
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
        roomId: "12",
        data: { type: "offer", sdp: offer },
      })
    );
  };

  return (
    <div>
      <button onClick={sendOffer}>Join room</button>
      <video ref={localVideoRef} autoPlay playsInline></video>
      <video ref={remoteVideoRef} autoPlay playsInline></video>
    </div>
  );
}

export default App;
