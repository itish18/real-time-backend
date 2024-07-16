import { useEffect, useRef, useState } from "react";
import { firestore } from "./firebase";

const servers = {
  iceServers: [
    {
      urls: ["stun:stun1.l.google.com:19302", "stun:stun2.l.google.com:19302"], // free stun server
    },
  ],
  iceCandidatePoolSize: 10,
};

function App() {
  const [pc, setPc] = useState(null);
  const [buttonClicked, setButtonClicked] = useState(false);
  const remoteRef = useRef();
  const [room, setRoom] = useState("");
  const localRef = useRef();
  // const roomRef = useRef();

  useEffect(() => {
    const pc = new RTCPeerConnection(servers);
    setPc(pc);

    navigator.mediaDevices
      .getUserMedia({ video: true, audio: true })
      .then((stream) => {
        let localVideo = stream.getVideoTracks()[0];
        localRef.current.srcObject = new MediaStream([localVideo]);
        stream.getTracks().forEach((track) => {
          pc.addTrack(track, stream);
        });
      });

    pc.ontrack = (e) => {
      if (remoteRef.current.srcObject) {
        remoteRef.current.srcObject.addTrack(e.track);
      } else {
        remoteRef.current.srcObject = new MediaStream([e.track]);
      }
    };
  }, []);

  const creatingRoom = async () => {
    const callDoc = firestore.collection("calls").doc();
    const offerCandidates = callDoc.collection("offerCandidates");
    const answerCandidates = callDoc.collection("answerCandidates");

    setRoom(callDoc.id);

    pc.onicecandidate = (e) => {
      e.candidate && offerCandidates.add(e.candidate.toJSON());
    };

    const offerDescription = await pc.createOffer();
    await pc.setLocalDescription(offerDescription);

    const offer = {
      sdp: offerDescription.sdp,
      type: offerDescription.type,
    };

    await callDoc.set({ offer });

    callDoc.onSnapshot((snapshot) => {
      const data = snapshot.data();

      if (data && !pc.currentRemoteDescription && data.answer) {
        const answerDescription = new RTCSessionDescription(data.answer);
        pc.setRemoteDescription(answerDescription);
      }

      if (data && data.endCall) {
        // Handle end call notification
        console.log("Call ended by the other user");

        // Stop the local media stream
        // const localStream = localRef.current.srcObject;
        // if (localStream) {
        //   localStream.getTracks().forEach((track) => track.stop());
        //   localRef.current.srcObject = null;
        // }

        // Clear the remote media stream
        const remoteStream = remoteRef.current.srcObject;
        if (remoteStream) {
          remoteStream.getTracks().forEach((track) => track.stop());
          remoteRef.current.srcObject = null;
        }

        // Close the peer connection
        pc.close();
        setPc(null);

        // Reset room state
        setRoom("");
        setButtonClicked(false);
      }
    });

    answerCandidates.onSnapshot((snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === "added") {
          const candidate = new RTCIceCandidate(change.doc.data());
          pc.addIceCandidate(candidate);
        }
      });
    });
  };

  const joinRoom = async () => {
    const callDoc = firestore.collection("calls").doc(room);
    const answerCandidates = callDoc.collection("answerCandidates");
    const offerCandidates = callDoc.collection("offerCandidates");

    pc.onicecandidate = (e) => {
      e.candidate && answerCandidates.add(e.candidate.toJSON());
    };

    const callData = (await callDoc.get()).data();

    const offerDescription = callData.offer;
    await pc.setRemoteDescription(new RTCSessionDescription(offerDescription));

    const answerDescription = await pc.createAnswer();
    await pc.setLocalDescription(answerDescription);

    const answer = {
      type: answerDescription.type,
      sdp: answerDescription.sdp,
    };

    await callDoc.update({ answer });

    offerCandidates.onSnapshot((snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === "added") {
          let data = change.doc.data();
          pc.addIceCandidate(new RTCIceCandidate(data));
        }
      });
    });

    callDoc.onSnapshot((snapshot) => {
      const data = snapshot.data();
      if (data && data.endCall) {
        // Handle end call notification
        console.log("Call ended by the other user");

        // Stop the local media stream
        // const localStream = localRef.current.srcObject;
        // if (localStream) {
        //   localStream.getTracks().forEach((track) => track.stop());
        //   localRef.current.srcObject = null;
        // }

        // Clear the remote media stream
        const remoteStream = remoteRef.current.srcObject;
        if (remoteStream) {
          remoteStream.getTracks().forEach((track) => track.stop());
          remoteRef.current.srcObject = null;
        }

        // Close the peer connection
        pc.close();
        setPc(null);

        // Reset room state
        setRoom("");
        setButtonClicked(false);
      }
    });
  };

  const endCall = async () => {
    try {
      const callDoc = firestore.collection("calls").doc(room);
      if (callDoc) {
        await callDoc.update({ endCall: true });
        console.log("Deleting call document...");
        await callDoc.delete();
        console.log("Call document deleted:", callDoc);

        // Remove tracks from the peer connection
        const senders = pc.getSenders();
        senders.forEach((sender) => pc.removeTrack(sender));

        // Stop the local media stream
        // const localStream = localRef.current.srcObject;
        // localStream.getTracks().forEach((track) => track.stop());
        // localRef.current.srcObject = null;

        // Clear the remote media stream
        const remoteStream = remoteRef.current.srcObject;
        if (remoteStream) {
          remoteStream.getTracks().forEach((track) => track.stop());
          remoteRef.current.srcObject = null;
        }

        // Close the peer connection
        pc.close();
        setPc(null);

        // Reset room state
        setRoom("");
        setButtonClicked(false);

        console.log("Call ended");
      }
    } catch (error) {
      console.error("Error ending call:", error);
    }
  };

  return (
    <>
      <div>
        <video
          style={{ width: "100%", height: "100%" }}
          ref={localRef}
          autoPlay
          playsInline
        ></video>
        {remoteRef.current !== null && (
          <video
            style={{
              width: "12em",
              height: "7em",
              position: "absolute",
              right: "2em",
              top: "1em",
              border: "1px solid grey",
              borderRadius: "20px",
            }}
            ref={remoteRef}
            autoPlay
            playsInline
          ></video>
        )}
      </div>
      {buttonClicked && (
        <div>
          <span>{room}</span>
          <button onClick={endCall}>End the call</button>
        </div>
      )}

      {!buttonClicked && (
        <div>
          <button
            onClick={() => {
              setButtonClicked(true);
              creatingRoom();
            }}
          >
            Create a meeting
          </button>
          <button
            onClick={() => {
              setButtonClicked(true);
              joinRoom();
            }}
          >
            Join a meeting
          </button>
        </div>
      )}
      <input
        type="text"
        value={room}
        onChange={(e) => setRoom(e.target.value)}
      />
    </>
  );
}

export default App;

// const localVideoRef = useRef(null);
// const remoteVideoRef = useRef(null);
// const [ws, setWs] = useState(null);
// const [pc, setPc] = useState(null);
// const [room, setRoom] = useState("r");

// const [local, setLocal] = useState(null);

// useEffect(() => {
//   const ws = new WebSocket("ws://localhost:8080", "echo-protocol");
//   setWs(ws);

//   const pc = new RTCPeerConnection();
//   setPc(pc);

//   window.navigator.mediaDevices
//     .getUserMedia({
//       video: true,
//       audio: true,
//     })
//     .then((data) => {
//       let localVideo = data.getVideoTracks()[0];
//       setLocal(data);
//       localVideoRef.current.srcObject = new MediaStream([localVideo]);

//       data.getTracks().forEach((track) => pc.addTrack(track, data));
//     });

//   pc.onicecandidate = (e) => {
//     if (e.candidate && room) {
//       ws.send(
//         JSON.stringify({
//           roomId: room.toString(),
//           data: { type: "candidate", candidate: e.candidate },
//         })
//       );
//     }
//   };

//   pc.ontrack = (e) => {
//     remoteVideoRef.current.srcObject = e.streams[0];
//   };

//   ws.onmessage = async (message) => {
//     const data = JSON.parse(message.data);
//     if (data.type === "offer") {
//       if (pc === null || pc.signalingState !== "stable") {
//         console.log(
//           "Cannot handle remote offer in signaling state:",
//           pc?.signalingState
//         );
//         return;
//       }

//       await pc.setRemoteDescription(new RTCSessionDescription(data.sdp));
//       const answer = await pc.createAnswer();

//       await pc.setLocalDescription(answer);
//       console.log(pc);
//       ws.send(
//         JSON.stringify({
//           roomId: room.toString(),
//           data: { type: "answer", sdp: answer },
//         })
//       );
//     } else if (data.type === "answer") {
//       if (pc === null || pc.signalingState !== "have-local-offer") {
//         console.log(
//           "Cannot handle remote answer in signaling state:",
//           pc?.signalingState
//         );
//         return;
//       }

//       await pc.setRemoteDescription(new RTCSessionDescription(data.sdp));
//       console.log(pc);
//     } else if (data.type === "candidate") {
//       await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
//       console.log(pc);
//     } else if (data.type === "toggle-camera") {
//       handleToggleCamera(data);
//     }
//   };

//   // return () => {
//   //   ws.close();
//   //   pc.close();
//   // };
// }, []);

// const sendOffer = async () => {
//   if (!pc) {
//     console.log("Peer connection is not initialized");
//     return;
//   }

//   const offer = await pc.createOffer();
//   await pc.setLocalDescription(offer);

//   ws.send(
//     JSON.stringify({
//       roomId: room.toString(),
//       data: { type: "offer", sdp: offer },
//     })
//   );
// };

// const handleToggleCamera = (data) => {
//   console.log(data);
//   console.log(local);
//   if (data.cameraOn && local) {
//     const videoTrack = local.getVideoTracks();
//     if (videoTrack) {
//       videoTrack.forEach((track) => track.stop());
//       setLocal(null);
//       localVideoRef.current.srcObject = null;
//       pc.setRemoteDescription(null);
//     }
//   } else {
//     navigator.mediaDevices
//       .getUserMedia({ video: true, audio: true })
//       .then((data) => {
//         let localVideo = data.getVideoTracks()[0];
//         setLocal(data);
//         localVideoRef.current.srcObject = new MediaStream([localVideo]);
//       })

//       .catch((error) => {
//         console.error("Error accessing media devices.", error);
//       });
//   }
// };

// return (
//   <div>
//     <div
//       style={{ display: "flex", flexDirection: "column", maxWidth: "10em" }}
//     >
//       <input
//         type="text"
//         placeholder="Enter the room that you want to join"
//         onChange={(e) => setRoom(e.target.value)}
//       />
//       <button onClick={sendOffer}>Join room</button>
//       <button
//         onClick={() => {
//           if (local) {
//             const videoTrack = local.getVideoTracks();
//             if (videoTrack) {
//               videoTrack.forEach((track) => track.stop());
//               setLocal(null);
//               localVideoRef.current.srcObject = null;
//             }
//             ws.send(
//               JSON.stringify({
//                 roomId: room.toString(),
//                 data: { type: "toggle-camera", cameraOn: false },
//               })
//             );
//           } else {
//             navigator.mediaDevices
//               .getUserMedia({ video: true, audio: true })
//               .then(async (data) => {
//                 let localVideo = data.getVideoTracks()[0];
//                 setLocal(data);
//                 localVideoRef.current.srcObject = new MediaStream([
//                   localVideo,
//                 ]);
//                 const offer = await pc.createOffer();
//                 await pc.setLocalDescription(offer);

//                 ws.send(
//                   JSON.stringify({
//                     roomId: room.toString(),
//                     data: { type: "toggle-camera", cameraOn: true },
//                   })
//                 );
//                 ws.send(
//                   JSON.stringify({
//                     roomId: room.toString(),
//                     data: { type: "answer", sdp: offer },
//                   })
//                 );
//               })
//               .catch((error) => {
//                 console.error("Error accessing media devices.", error);
//               });
//           }
//         }}
//       >
//         Turn off camera
//       </button>
//     </div>
//     <video ref={localVideoRef} autoPlay playsInline></video>
//     <video ref={remoteVideoRef} autoPlay playsInline></video>
//   </div>
