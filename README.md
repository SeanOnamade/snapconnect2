# 📸 SnapConnect
> Share Moments · Disappear · Discover More  
[![Expo](https://img.shields.io/badge/built%20with-Expo%20React%20Native-000?logo=expo)]()  
[![Firebase](https://img.shields.io/badge/Firebase-Cloud%20Functions-orange)]()

---

## Overview

SnapConnect is a GauntletAI project that re-imagines Snapchat for **college creatives** with Retrieval-Augmented Generation (RAG). Built as a semi-public sharing platform, it combines the ephemeral nature of disappearing content with rapid AI assistance to help students share campus life, creative projects, and maintain progress accountability. The app leverages modern AI to enhance social interactions through intelligent captions, automated tagging, and creative inspiration - perfect for the fast-paced, goal-oriented college lifestyle.

---

## Demo Links

| - | Link |
|---|------|
| 🚀 Live App | [SnapConnect @ Vercel](https://snapconnect2.vercel.app/) |
| 🎥 Demo Video | [Twitter](https://x.com/OnamadeSean/status/1938735741288505603) |
| 📝 BrainLift Doc | **< Notion/Google Doc link >** |

---

## Primary User & Niche

**User Type:** Social Connectors  
**Niche:** College students sharing campus life, creative projects, and goal progress.

---

## Features

### Core Clone
- 📷 Camera with expo-camera
- ⏳ 24-hour disappearing snaps
- 🔐 Firebase Auth, Storage & Firestore
- 📰 Feed & Discover tabs
- ⚙️ Settings (first-name + 5 favorite interests)

### RAG-Powered Capabilities (✅ 6 user stories)
1. **AI Caption** – suggests fun captions when posting  
2. **AI Tag Generation** – proposes up to three tags from caption  
3. **Quick Reply** – one-tap AI response to a friend's snap  
4. **Favorites-First Discover** – highlights user's 5 favorite interests  
5. **Dynamic Tag Search** – type any tag → instant filtered feed  
6. **🎨 Inspire Me** – AI "creative prompt" generator for fresh post ideas  

All RAG calls handled in Firebase Cloud Functions (OpenAI GPT-3.5-turbo) with secrets stored in Secret Manager.

---

**Stack**

* React Native + Expo SDK 50
* Zustand state
* Firebase Auth · Firestore · Storage · Cloud Functions
* OpenAI SDK
* Netlify (static PWA deploy)

---

## Local Setup

```bash
git clone https://github.com/<user>/snapconnect2.git
cd snapconnect2
npm install
cp .env.example .env           # add Firebase + OpenAI keys
npx expo start                 # press "w" for web, or scan QR
```

**Functions**

```bash
cd functions
npm install
firebase login
firebase emulators:start
```

---

## Environment Variables

Create a `.env` file in the project root:

```
FIREBASE_API_KEY=
FIREBASE_AUTH_DOMAIN=
FIREBASE_PROJECT_ID=
FIREBASE_STORAGE_BUCKET=
FIREBASE_APP_ID=
OPENAI_API_KEY=
```

---

## Deployment Notes

* `expo export:web` → `web-build/` → Netlify CLI: `netlify deploy --prod --dir=web-build`
* `firebase deploy --only functions` for backend

---

## Roadmap / Future

* Friends & follower graph
* Group messaging
* Progressive web push notifications
* Vector search for richer RAG context

---

## License

MIT 
