# SevaSetu - Community Service Platform

A modern platform connecting citizens with volunteers to solve community issues. Built with **React Native (Expo)** and **FastAPI**.

## 🚀 Quick Start

### 1. Backend Setup
# OS
.DS_Store
Thumbs.db

# Data and Logs
*.csv
*.log
backend/logs/
/temp/
/tmp/
C:\Users\ZAHID\Desktop\SevaSetu\updated_data.csv

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

### Frontend (.env)
Place a `.env` file inside the `frontend/` folder with this key:

```ini
EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=YOUR_GOOGLE_MAPS_KEY
```

### Firebase Credentials
1.  Go to [Firebase Console](https://console.firebase.google.com/).
2.  Navigate to **Project Settings > Service Accounts**.
3.  Click **Generate New Private Key**.
4.  Download the `.json` file.
5.  **Placement**: Rename it to `firebase-credentials.json` and place it in `backend/credentials/`.

---

## 🛠 New AI-Powered Features

| Feature | Tech Stack | Description |
| :--- | :--- | :--- |
| **Crisis Forecasting** | Gemini 2.0 | Analyzes historical reports and seasonal trends to predict future community needs. |
| **Push Dispatch Engine** | Firestore Batches | Automatically assigns the top-N qualified volunteers to a mission in a single atomic transaction. |
| **Real-time Fill Rate** | React Native + Firestore | Supervisor dashboard showing live volunteer acceptance and mission readiness. |
| **AI Match Reasoning** | Gemini AI | Volunteers see exactly why they were matched to a mission (skills, proximity, availability). |

## 🧪 Developer Tools & Testing

We have built specialized scripts to maintain and stress-test the AI engine:

- **Seeding Users**: `python backend/scripts/seed_volunteers.py` (Creates 50+ diverse profiles).
- **Seeding Reports**: `python backend/scripts/seed_reports.py` (Fills DB with 80+ historical crisis reports).
- **Verify Dispatch**: `python backend/scripts/verify_assignment_capacity.py` (Tests matching for 40+ targets).
- **Simulate Approvals**: `python backend/scripts/simulate_volunteer_actions.py` (Auto-approves missions for testing).

---

## 🌐 Website Platform (Admin & Portfolio)

In addition to the mobile app, SevaSetu includes a web-based dashboard and portfolio system.

### 1. Website Backend
- **Location**: `websitebackend/`
- **Tech Stack**: FastAPI, Firebase Admin SDK, Cloudinary.
- **Setup**: See [websitebackend/README.md](file:///c:/Users/ZAHID/Desktop/SevaSetu/websitebackend/README.md) for detailed environment configuration.

### 2. Website Frontend
- **Location**: `websitefrontend/`
- **Tech Stack**: React + Vite, Tailwind CSS.
- **Setup**: See [websitefrontend/README.md](file:///c:/Users/ZAHID/Desktop/SevaSetu/websitefrontend/README.md) for environment configuration (Vite prefix required).

---

## 🛠 Core Features
- **Animated Navigation**: Premium Reanimated-powered tab bar.
- **Scan & Survey**: OCR + Gemini Vision for automatic form extraction with **Native Cropping**.
- **Shimmering UI**: Skeletons and spring physics for a premium feel.
- **Atomic Dispatch**: Reliable bulk writes for zero-latency mission confirmation.
