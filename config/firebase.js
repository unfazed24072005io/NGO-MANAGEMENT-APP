import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: "AIzaSyCEaCII2ehC0ByruM5aeUuuhIbmuGtnnJw",
  authDomain: "ngo-app-54121.firebaseapp.com",
  projectId: "ngo-app-54121",
  storageBucket: "ngo-app-54121.firebasestorage.app",
  messagingSenderId: "860187159774",
  appId: "1:860187159774:android:78a7e1a501095a307da64f"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export default app;