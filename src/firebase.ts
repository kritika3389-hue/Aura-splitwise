import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';

// TODO: Replace this with your actual Firebase project configuration
// You can get this from the Firebase Console (https://console.firebase.google.com)
const firebaseConfig = {
  apiKey: "AIzaSyDcI1qZDVjrMSgepXaQTkZ9MA09R_ATPog",
  authDomain: "web-config-8174f.firebaseapp.com",
  projectId: "web-config-8174f",
  storageBucket: "web-config-8174f.appspot.com",
  messagingSenderId: "462199925294",
  appId: "1:462199925294:web:4228bf0cd9c0fd45c4cdbf"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Authentication and get a reference to the service
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
