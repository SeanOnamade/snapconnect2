import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, connectAuthEmulator } from 'firebase/auth';
import { getFirestore, doc } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getFunctions } from 'firebase/functions';
import { CONFIG } from '../config/app';

// Initialize Firebase App (prevent multiple initialization)
const app = !getApps().length ? initializeApp(CONFIG.firebase) : getApp();

// Initialize Firebase services
export const auth = getAuth(app);
export const db = getFirestore(app);
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