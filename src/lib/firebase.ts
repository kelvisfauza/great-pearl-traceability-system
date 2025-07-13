
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyBZrEn96zY2_Q3y-0v3LsDIe4cNVJovZ-c",
  authDomain: "great-new.firebaseapp.com",
  projectId: "great-new",
  storageBucket: "great-new.firebasestorage.app",
  messagingSenderId: "729785103801",
  appId: "1:729785103801:web:f726f7a7931c7353a0f268",
  measurementId: "G-Q1SJ4LRDSM"
};

console.log('Initializing Firebase with config:', { 
  projectId: firebaseConfig.projectId,
  authDomain: firebaseConfig.authDomain 
});

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Authentication and get a reference to the service
export const auth = getAuth(app);

// Initialize Cloud Firestore and get a reference to the service
export const db = getFirestore(app);

console.log('Firebase initialized successfully');

export default app;
