# SevaSetu - Community Service Platform

A modern platform connecting citizens with volunteers to solve community issues. Built with **React Native (Expo)** and **FastAPI**.

---

## 🤖 NEW: Multi-Channel Reporting Bots

Citizens can now report community issues directly via Telegram or WhatsApp. These bots support multi-media attachments (Photos, Videos, Audio, PDFs) and automatically sync with the SevaSetu Dashboard.

### 1. Telegram Bot Setup
1.  **Get a Token**: Message `@BotFather` on Telegram to create a new bot and get your API Token.
2.  **Configure**: Add your token to `backend/.env` under `TELEGRAM_BOT_TOKEN`.
3.  **Run**: 
    ```powershell
    cd backend
    python bot/main.py
    ```
4.  **Usage**: Start a chat with your bot. It will guide you through sharing a description, location, and multiple attachments. Type **"Done ✅"** when finished to submit the report.

### 2. WhatsApp Bot Setup (Twilio)
Since WhatsApp requires a public URL for webhooks, follow these steps for local testing:

1.  **Expose Local Server**: Use **localtunnel** or **ngrok** to create a public bridge:
    ```powershell
    npx localtunnel --port 8000
    ```
    *(Copy the URL provided, e.g., `https://thick-roses-swim.loca.lt`)*

2.  **Configure Twilio Sandbox**:
    - Go to [Twilio Console > Messaging Settings > WhatsApp Sandbox Settings](https://console.twilio.com/).
    - Set the **"When a message comes in"** URL to: `YOUR_TUNNEL_URL/whatsapp/webhook`
    - *Example:* `https://thick-roses-swim.loca.lt/whatsapp/webhook`
    - Set the method to **POST** and click **Save**.

3.  **Join from Mobile**:
    - Add the Twilio Sandbox number to your WhatsApp contacts.
    - Send the join code (e.g., `join sky-blue`) to that number.
    - Send **"Hi"** to start the reporting flow!

---

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
# Core AI & DB
GEMINI_API_KEY=YOUR_GEMINI_API_KEY
PROJECT_ID=YOUR_FIREBASE_PROJECT_ID
FIREBASE_CREDENTIALS_PATH=credentials/firebase-credentials.json
GOOGLE_APPLICATION_CREDENTIALS=credentials/sevasetu-documentai.json
DOCUMENT_AI_LOCATION=us
DOCUMENT_AI_PROCESSOR_ID=YOUR_PROCESSOR_ID

# Media Storage (Cloudinary)
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# Bots
TELEGRAM_BOT_TOKEN=your_telegram_token
TWILIO_ACCOUNT_SID=your_twilio_sid
TWILIO_AUTH_TOKEN=your_twilio_token
TWILIO_WHATSAPP_FROM=whatsapp:+15672298167
