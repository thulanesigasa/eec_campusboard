import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
// import { getAnalytics } from "firebase/analytics";

const firebaseConfig = {
  apiKey: "AIzaSyAL6W3lA1fe3-0J1-LKFpi8QLQLlDk97sU",
  authDomain: "eec-campusboard.firebaseapp.com",
  projectId: "eec-campusboard",
  storageBucket: "eec-campusboard.firebasestorage.app",
  messagingSenderId: "1078991146377",
  appId: "1:1078991146377:web:7770209f734ca10cd1e558",
  measurementId: "G-4GHZDZDXWS"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

// Analytics can be conditionally initialized later if needed.
// export const analytics = getAnalytics(app);
