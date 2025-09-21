import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

// Replace these with your Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyAIl4vWF73TBXAyI7G_Fw9sxtD63innGag",
  authDomain: "photo-collage-app-9e42d.firebaseapp.com",
  projectId: "photo-collage-app-9e42d",
  storageBucket: "photo-collage-app-9e42d.firebasestorage.app",
  messagingSenderId: "82565536571",
  appId: "1:82565536571:web:de4bd1ddc0a4b8ea6bb51e",
  measurementId: "G-P3Y1KYM0P9"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const db = getFirestore(app);
export const storage = getStorage(app);

// Whitelist of allowed emails
export const ALLOWED_EMAILS = [
  'codethathat@gmail.com',
  'marsha.o.y@gmail.com',
  'commanderow@gmail.com'
];

export default app;