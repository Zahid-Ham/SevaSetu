from fastapi import FastAPI  # type: ignore
from fastapi.middleware.cors import CORSMiddleware  # type: ignore
from app.api.routes import auth_routes, email_routes, report_routes

app = FastAPI(
    title="SevaSetu Website Backend",
    description="Backend API for SevaSetu Community Service Platform — Email-to-Survey pipeline with Gemini AI",
    version="1.0.0",
)

# Enable CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",   # Vite dev server
        "http://localhost:3000",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth_routes.router)
app.include_router(email_routes.router)
app.include_router(report_routes.router)


@app.get("/")
async def health_check():
    """Health check endpoint."""
    return {
        "message": "SevaSetu Website Backend Running",
        "status": "healthy",
        "version": "1.0.0",
        "endpoints": {
            "auth": "/auth/google",
            "scan_emails": "/emails/scan",
            "generate_report": "/emails/report",
            "list_reports": "/reports",
        },
    }
