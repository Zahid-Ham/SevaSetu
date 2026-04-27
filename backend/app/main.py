from fastapi import FastAPI # type: ignore
from fastapi.middleware.cors import CORSMiddleware # type: ignore
from fastapi.staticfiles import StaticFiles # type: ignore
import os
from app.api.routes import scan_routes, report_routes, prediction_routes, chat_routes, ngo_routes, bot_routes, task_routes, whatsapp_routes, sms_routes, ivr_routes, auth_routes, translation_routes, certificate_routes # type: ignore

app = FastAPI(title="SevaSetu Backend")

# Ensure uploads directory exists
os.makedirs("uploads", exist_ok=True)

# Mount local uploads folder as static server (Free Media Alternative)
app.mount("/static", StaticFiles(directory="uploads"), name="static")

# Enable CORS for mobile frontend and local development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Adjust this in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(scan_routes.router, tags=["Scanner"])
app.include_router(report_routes.router, tags=["Reports"])
app.include_router(prediction_routes.router, tags=["Predictions & Assignments"])
app.include_router(chat_routes.router, tags=["Chat Management"])
app.include_router(ngo_routes.router, tags=["NGO & Volunteer Management"])
app.include_router(bot_routes.router, tags=["Bot Reporting"])
app.include_router(task_routes.router, tags=["Mission Tasks"])
app.include_router(whatsapp_routes.router, tags=["WhatsApp Bot"])
app.include_router(sms_routes.router, tags=["SMS Bot"])
app.include_router(ivr_routes.router, tags=["IVR Voice Bot"])
app.include_router(auth_routes.router, prefix="/auth", tags=["Authentication Utilities"])
app.include_router(translation_routes.router, prefix="/api/ai", tags=["Translation"])
app.include_router(certificate_routes.router, prefix="/certificates", tags=["Certificates & Badges"])

@app.get("/")
async def health_check():
    """
    Health check endpoint.
    """
    return {
        "message": "SevaSetu Backend Running",
        "status": "healthy"
    }
