import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: 'AIzaSyCmRiMTQgoJoyTKHpCXCthLVuhIZkalLgY',
  authDomain: 'gjirafa-motm.firebaseapp.com',
  projectId: 'gjirafa-motm',
  storageBucket: 'gjirafa-motm.firebasestorage.app',
  messagingSenderId: '1063992757165',
  appId: '1:1063992757165:web:6bb2acc0725bb00f816f24'
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export { signInAnonymously };
