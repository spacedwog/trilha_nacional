// firebaseConfig.ts
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "SUA_API_KEY",
  authDomain: "seu-app.firebaseapp.com",
  projectId: "seu-app",
  storageBucket: "seu-app.appspot.com",
  messagingSenderId: "1234567890",
  appId: "1:1234567890:web:abcdefghij",
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);