import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCUTJ8AZgNln3ZWSLD7zZyX420kwV6NrbQ",
  authDomain: "unfiltered-inner-circle.firebaseapp.com",
  projectId: "unfiltered-inner-circle",
  storageBucket: "unfiltered-inner-circle.firebasestorage.app",
  messagingSenderId: "653359340510",
  appId: "1:653359340510:web:648253bc1ef5e6cd22db4f",
  measurementId: "G-C36E6X3EY6",
};

export const firebaseApp = initializeApp(firebaseConfig);
export const firebaseAuth = getAuth(firebaseApp);
export const googleAuthProvider = new GoogleAuthProvider();
export const firestoreDb = getFirestore(firebaseApp);
