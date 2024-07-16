import firebase from "firebase/compat/app";
import "firebase/compat/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyC8ZsF4tw0r4HxDb75rIPviJpaV8n_fYCo",
  authDomain: "video-call-2e5a5.firebaseapp.com",
  databaseURL: "https://video-call-2e5a5-default-rtdb.firebaseio.com",
  projectId: "video-call-2e5a5",
  storageBucket: "video-call-2e5a5.appspot.com",
  messagingSenderId: "1077457771903",
  appId: "1:1077457771903:web:254f490b03163d75f08e4a",
};

if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}
export const firestore = firebase.firestore();
