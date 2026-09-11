import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

/* Google shows the authDomain in its sign-in dialog, so on our own domain we
   point it at the current hostname and let vercel.json proxy /__/auth through
   to Firebase. Matching the whole uebza.com suffix rather than one fixed host
   means renaming the subdomain needs no code change. Everywhere else
   (localhost, vercel.app previews) falls back to the Firebase domain, which
   is not a host we can register as an OAuth redirect target. */
const AUTH_DOMAIN =
  typeof location !== 'undefined' && location.hostname.endsWith('.uebza.com')
    ? location.hostname
    : 'gjirafa-motm.firebaseapp.com';

const firebaseConfig = {
  apiKey: 'AIzaSyCmRiMTQgoJoyTKHpCXCthLVuhIZkalLgY',
  authDomain: AUTH_DOMAIN,
  projectId: 'gjirafa-motm',
  storageBucket: 'gjirafa-motm.firebasestorage.app',
  messagingSenderId: '1063992757165',
  appId: '1:1063992757165:web:6bb2acc0725bb00f816f24'
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

export const googleProvider = new GoogleAuthProvider();
// Always offer the account chooser: people have work and personal accounts
// and silently reusing the last one is how you end up claiming twice.
googleProvider.setCustomParameters({ prompt: 'select_account' });
