# SnapConnect2 📸

A real-time ephemeral photo sharing app built with React Native, Expo, and Firebase. Share moments that disappear in 24 hours, connect through interests, and interact with AI-powered features.

## ✨ Features

- **📷 Camera Integration**: Take photos with front/back camera switching
- **🔥 Ephemeral Content**: Snaps disappear after 24 hours
- **🎯 Interest-Based Matching**: Connect with users who share your interests  
- **💬 Quick Replies**: AI-suggested responses to snaps
- **📱 Real-time Feed**: Live updates using Firebase realtime listeners
- **🔐 Firebase Authentication**: Secure email/password authentication
- **☁️ Cloud Storage**: Images stored securely in Firebase Storage
- **⚡ Modern UI**: Clean, responsive design with smooth animations

## 🚀 Quick Start

### Prerequisites

- Node.js (v16+)
- Expo CLI: `npm install -g expo-cli`
- Firebase account

### 1. Clone & Install

```bash
git clone <your-repo>
cd snapconnect2
npm install
```

### 2. Firebase Setup

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Create a new project
3. Enable the following services:
   - **Authentication** (Email/Password provider)
   - **Firestore Database** (in production mode)
   - **Storage** (create a default bucket)

4. Add a Web app to your Firebase project
5. Copy the configuration object

### 3. Configuration

Edit `config/app.ts` and replace the placeholder values with your Firebase config:

```typescript
export const CONFIG = {
  firebase: {
    apiKey: "your-actual-api-key",
    authDomain: "your-project.firebaseapp.com",
    projectId: "your-actual-project-id", 
    storageBucket: "your-project.appspot.com",
    messagingSenderId: "your-sender-id",
    appId: "your-app-id"
  },
  openai: {
    apiKey: "sk-your-openai-key" // Optional: for AI features
  }
};
```

### 4. Firestore Security Rules

Set up these Firestore rules in your Firebase console:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    match /snaps/{snapId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && request.auth.uid == resource.data.owner;
    }
    
    match /replies/{replyId} {
      allow read, write: if request.auth != null;
    }
  }
}
```

### 5. Storage Security Rules

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /snaps/{userId}/{allPaths=**} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

### 6. Run the App

```bash
# Start the development server
npx expo start

# Run on specific platforms
npx expo start --ios
npx expo start --android  
npx expo start --web
```

## 📱 App Structure

```
snapconnect2/
├── screens/
│   ├── AuthScreen.tsx      # Login/Register with interests
│   ├── CameraScreen.tsx    # Photo capture & upload
│   └── FeedScreen.tsx      # Real-time snap feed
├── lib/
│   └── firebase.ts         # Firebase configuration
├── store/
│   └── useStore.ts         # Zustand state management
├── config/
│   └── app.ts             # App configuration
└── App.tsx                # Main navigation & auth logic
```

## 🔧 Key Components

### Authentication Flow
- Email/password registration with interest selection
- Persistent login state with Firebase Auth
- User profile stored in Firestore

### Camera Experience  
- Native camera integration with expo-camera
- Photo capture with quality optimization
- Modal caption editor with AI suggestions
- Firebase Storage upload

### Social Feed
- Real-time snap loading with Firestore listeners
- Ephemeral content (24h expiration)
- Interest-based content filtering
- Quick reply system

### State Management
- Zustand for lightweight state management
- Firebase Auth state synchronization
- Real-time data updates

## 🚀 Deployment

### Expo Build
```bash
# Build for production
expo build:android
expo build:ios

# Or with EAS (recommended)
npm install -g @expo/eas-cli
eas build --platform all
```

### Firebase Hosting (Web)
```bash
expo build:web
firebase init hosting
firebase deploy
```

## 🐛 Troubleshooting

### Common Issues

**Camera permissions denied:**
- Check device settings for camera access
- Ensure permissions are requested properly

**Firebase connection errors:**
- Verify config values in `config/app.ts`
- Check Firebase project settings
- Ensure required services are enabled

**Build failures:**
- Clear Metro cache: `npx expo start --clear`
- Reinstall dependencies: `rm -rf node_modules && npm install`

### Development Tips

1. **Use Expo Go app** for quick testing on physical devices
2. **Enable Firestore offline persistence** for better UX 
3. **Test with multiple accounts** to verify social features
4. **Monitor Firebase quota** to avoid unexpected charges

## 📝 License

MIT License - feel free to modify and distribute.

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

Built with ❤️ using React Native, Expo, and Firebase. 