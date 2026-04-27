# SevaSetu - Community Service Platform 🇮🇳

A modern, high-performance platform connecting citizens with volunteers to solve community issues. Built with **React Native (Expo)**, **FastAPI**, and **AI-driven** processing.

---

## 🌟 Key Features
- **3-Way Ecosystem**: Dedicated interfaces for Citizens, Volunteers, and Supervisors.
- **AI-Driven Reporting**: Automatic categorization and summarization of reports using Google Gemini.
- **Multi-Channel Input**: Support for Telegram and WhatsApp reporting bots with media syncing.
- **Robust Mapping**: WebView-based OpenStreetMap integration (Leaflet.js) ensuring maps work everywhere without API key restrictions or SHA-1 fingerprint issues.
- **Secure Auth**: Manual Google Login flow optimized for Expo Go and production APKs.
- **Bi-lingual Support**: Seamless switching between Hindi and English.

---

## 🤖 Multi-Channel Reporting Bots

Citizens can report community issues directly via Telegram or WhatsApp. These bots support multi-media attachments and sync automatically with the SevaSetu Dashboard.

### 1. Telegram Bot
- **Run**: `cd backend && python bot/main.py`
- **Features**: Live location sharing, photo/video/audio attachments.

### 2. WhatsApp Bot (Twilio)
- **Expose Local Server**: `npx localtunnel --port 8000`
- **Webhook URL**: `YOUR_TUNNEL_URL/whatsapp/webhook`
- **Features**: Interactive messaging flow for easy reporting.

---

## 🚀 Quick Start

### 1. Backend Setup
The backend handles AI processing (Gemini), Firestore interactions, and bot logic.
1. `cd backend`
2. `python -m venv venv`
3. `source venv/bin/activate` (Windows: `venv\Scripts\activate`)
4. `pip install -r requirements.txt`
5. Create `backend/.env` (see template).
6. `uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload`

### 2. Frontend Setup
The mobile app is built with Expo SDK 54.
1. `cd frontend`
2. `npm install`
3. `npx expo start -c`

---

## 🛠️ Architecture & Portability
- **Map Fallback**: We use a `WebView` + `Leaflet.js` + `OpenStreetMap` approach. This avoids the common `react-native-maps` "Beige Screen" issue caused by mismatched SHA-1 fingerprints in local development.
- **Auth Flow**: The Google Sign-in uses a manual `WebBrowser` flow to ensure compatibility with Expo Go without requiring the `androidClientId` during development.

---

## 🔑 Environment Variables
### Backend (`backend/.env`)
```ini
GEMINI_API_KEY=YOUR_KEY
PROJECT_ID=YOUR_FIREBASE_PROJECT_ID
FIREBASE_CREDENTIALS_PATH=credentials/firebase-credentials.json
GOOGLE_APPLICATION_CREDENTIALS=credentials/sevasetu-documentai.json
CLOUDINARY_CLOUD_NAME=your_name
TELEGRAM_BOT_TOKEN=your_token
```

### Frontend (`frontend/.env`)
```ini
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=your_web_client_id
EXPO_PUBLIC_USE_PRODUCTION=true
EXPO_PUBLIC_PRODUCTION_API_URL=https://your-backend-api.com
```

---

## 🛡️ Security Note
- **DO NOT** commit `.env` files or the `credentials/` folder.
- **.gitignore** is pre-configured to ignore all sensitive configuration files.
- Hardcoded fallback IDs have been removed from the source code for safety.
