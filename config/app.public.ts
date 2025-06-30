// SnapConnect Public Configuration
// This file is safe to commit - uses environment variables for secrets
// Environment variables will be populated by Vercel at build time

export const CONFIG = {
  firebase: {
    apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
  },
  openai: {
    apiKey: process.env.OPENAI_API_KEY, // Server-side only
    model: "gpt-3.5-turbo",
  },
};

// For development/testing, you can use Firebase emulators
export const USE_EMULATORS = false; 