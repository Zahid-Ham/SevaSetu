# Website Backend (FastAPI)

This is the backend for the SevaSetu website, built with FastAPI.

## 🚀 Setup

1. **Navigate to the backend**:
   ```bash
   cd websitebackend
   ```

2. **Create & Start Virtual Environment**:
   ```bash
   python -m venv venv
   source venv/bin/activate  # Windows: venv\Scripts\activate
   ```

3. **Install Dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

4. **Environment Configuration**:
   Create a `.env` file in the root of this directory (`websitebackend/`) with the following keys:

   ```ini
   GEMINI_API_KEY=YOUR_GEMINI_API_KEY
   PROJECT_ID=YOUR_PROJECT_ID
   FIREBASE_CREDENTIALS_PATH=credentials/firebase-credentials.json
   FRONTEND_URL=your_frontend_url (e.g., http://localhost:5173)
   CLOUDINARY_URL=your_cloudinary_url
   FIREBASE_STORAGE_BUCKET=your_bucket_name (e.g., bank-a1d2a.firebasestorage.app)
   ```

5. **Firebase Credentials**:
   Place your `firebase-credentials.json` file in the `websitebackend/credentials/` directory.

6. **Run Server**:
   ```bash
   uvicorn app.main:app --reload
   ```
