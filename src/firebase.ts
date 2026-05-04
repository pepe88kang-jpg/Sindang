import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyAoqmEZg--4Xv5avc1ODSMQBDMlSw0T1PI",
  authDomain: "monitoring-gizi-sppg.firebaseapp.com",
  databaseURL: "https://monitoring-gizi-sppg-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "monitoring-gizi-sppg",
  storageBucket: "monitoring-gizi-sppg.firebasestorage.app",
  messagingSenderId: "24043887645",
  appId: "1:24043887645:web:8161a6132eae10d856baf4",
  measurementId: "G-4RFKG657H5"
};

const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  client_id: "24043887645-v1s5cnj0s36a5pt9qt2frukrktra83vf.apps.googleusercontent.com"
});
