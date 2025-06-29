import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, connectAuthEmulator } from 'firebase/auth';
import { initializeFirestore, doc } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getFunctions } from 'firebase/functions';
import { CONFIG } from '../config/app';

// Initialize Firebase App (prevent multiple initialization)
const app = !getApps().length ? initializeApp(CONFIG.firebase) : getApp();

// Initialize Firebase services
export const auth = getAuth(app);

// Initialize Firestore with long polling to avoid WebChannel errors
export const db = initializeFirestore(app, {
  experimentalForceLongPolling: true, // Forces long polling instead of WebChannel
});

export const storage = getStorage(app);
export const functions = getFunctions(app);

// Helper function for user document references
export const userDocRef = (uid: string) => doc(db, "users", uid);

// For development, you can uncomment this to use auth emulator
// if (__DEV__ && !auth._delegate._config?.emulator) {
//   connectAuthEmulator(auth, 'http://localhost:9099');
// }

console.log('Firebase initialized successfully');

export default app; 