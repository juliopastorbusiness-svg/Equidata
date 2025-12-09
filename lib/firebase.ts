// lib/firebase.ts
import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyCFniDZPtSAIudMKECatQWsLGp93LJ4rE0",
  authDomain: "equidata-554.firebaseapp.com",
  projectId: "equidata-554",
  storageBucket: "equidata-554.firebasestorage.app",
  messagingSenderId: "752631678574",
  appId: "1:752631678574:web:7d8316143ac8aeeba5c87f",
  measurementId: "G-F8JYT53YH1",
};

// Evitar inicializar dos veces en desarrollo
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);


