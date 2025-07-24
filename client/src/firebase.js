import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
// import { getAnalytics } from "firebase/analytics"; // Optional, not needed for Firestore

const firebaseConfig = {
  apiKey: "AIzaSyDv9OJ4z8fqJnUr3RJSy4tmNmVN7-tXmlY",
  authDomain: "ucla-peer.firebaseapp.com",
  projectId: "ucla-peer",
  storageBucket: "ucla-peer.appspot.com", // corrected
  messagingSenderId: "591549171104",
  appId: "1:591549171104:web:5db5d7e8800702f0eb50c5",
  measurementId: "G-MWMSYWN663"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
// const analytics = getAnalytics(app); // Uncomment if you want analytics

export { db }; 