// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// Your web app's Firebase configuration
// For Firebase JS SDK v9-compat and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyAV4mfx11xy5cjlszxn4x28SdoA98qo4v8",
  authDomain: "election-portal-2k25.firebaseapp.com",
  projectId: "election-portal-2k25",
  storageBucket: "election-portal-2k25.firebasestorage.app",
  messagingSenderId: "260620060661",
  appId: "1:260620060661:web:606627bacccdb26adc82bc"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Authentication and get a reference to the service
export const auth = getAuth(app);

// Initialize Cloud Firestore and get a reference to the service
export const db = getFirestore(app);

// Initialize Cloud Storage and get a reference to the service
export const storage = getStorage(app);

export default app;