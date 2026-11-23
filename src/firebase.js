import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyDemoKeyForLocalFallbackOnly",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "dse-tracker-demo.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "dse-tracker-demo",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "dse-tracker-demo.appspot.com",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "1234567890",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:1234567890:web:abcdef123456"
};

let app = null;
let auth = null;
let db = null;
let isFirebaseConfigured = false;

try {
  if (import.meta.env.VITE_FIREBASE_API_KEY && import.meta.env.VITE_FIREBASE_PROJECT_ID) {
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
    isFirebaseConfigured = true;
  }
} catch (err) {
  console.warn('Firebase initialization skipped, running in local cloud mode:', err);
}

export { app, auth, db, isFirebaseConfigured };
