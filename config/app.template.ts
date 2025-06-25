// SnapConnect Configuration Template
// Copy this file to 'app.ts' and replace with your actual Firebase project credentials
// Get them from: https://console.firebase.google.com/

export const CONFIG = {
  firebase: {
    apiKey: "your-api-key-here",
    authDomain: "your-project.firebaseapp.com",
    projectId: "your-project-id",
    storageBucket: "your-project.appspot.com",
    messagingSenderId: "123456789",
    appId: "1:123456789:web:abcdef123456"
  },
  openai: {
    apiKey: "sk-your-openai-key-here" // Optional: for AI features
  }
};

// For development/testing, you can use Firebase emulators
export const USE_EMULATORS = false; 