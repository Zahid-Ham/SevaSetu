# SevaSetu - Community Service Platform

A modern platform connecting citizens with volunteers to solve community issues. Built with **React Native (Expo)** and **FastAPI**.

## 🚀 Quick Start

### 1. Backend Setup
The backend handles AI processing (Gemini), Firestore interactions, and reports.

1.  **Navigate to backend**:
    ```bash
    cd backend
    ```
2.  **Create & Start Virtual Environment**:
    ```bash
    python -m venv venv
    source venv/bin/activate  # Windows: venv\Scripts\activate
    ```
3.  **Install Dependencies**:
    ```bash
    pip install -r requirements.txt
    ```
4.  **Configuration (.env)**:
    Create a `.env` file in the `backend/` directory (see [Environment Variables](#environment-variables)).
5.  **Run Server**:
    Use the specific host binding to allow mobile connections:
    ```bash
    uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
    ```

---

### 2. Frontend Setup
The mobile app is built with Expo SDK 54.

1.  **Navigate to frontend**:
    ```bash
    cd frontend
    ```
2.  **Install Dependencies**:
    ```bash
    npm install
    ```
3.  **Start Development Server**:
    ```bash
    npx expo start -c
    ```

---

## 🔑 Environment Variables & Credentials

### Backend (.env)
Place a `.env` file inside the `backend/` folder with these keys:

```ini
GEMINI_API_KEY=YOUR_GEMINI_API_KEY
PROJECT_ID=YOUR_FIREBASE_PROJECT_ID
FIREBASE_CREDENTIALS_PATH=credentials/firebase-credentials.json
GOOGLE_APPLICATION_CREDENTIALS=credentials/sevasetu-documentai.json
DOCUMENT_AI_LOCATION=us
DOCUMENT_AI_PROCESSOR_ID=YOUR_PROCESSOR_ID
```

### Firebase Credentials
1.  Go to [Firebase Console](https://console.firebase.google.com/).
2.  Navigate to **Project Settings > Service Accounts**.
3.  Click **Generate New Private Key**.
4.  Download the `.json` file.
5.  **Placement**: Rename it to `firebase-credentials.json` and place it in `backend/credentials/`.

---

## 🛠 Features
- **Animated Navigation**: Premium Reanimated-powered tab bar.
- **Scan & Survey**: OCR + Gemini Vision for automatic form extraction with **Native Cropping**.
- **Community Reports**: Real-time Firestore updates with Shimmering Skeleton Loaders.
- **Native Experience**: Native bottom sheets and spring physics.
