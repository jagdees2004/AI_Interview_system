import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyD7g03pqOMN5Tr2ye1daHzOzjChNgOBFBc",
  authDomain: "ai-interview-system-5c7a1.firebaseapp.com",
  projectId: "ai-interview-system-5c7a1",
  storageBucket: "ai-interview-system-5c7a1.firebasestorage.app",
  messagingSenderId: "88283321478",
  appId: "1:88283321478:web:2d263c38ca10972c466d07",
  measurementId: "G-ZW9N1N6B1V"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();
