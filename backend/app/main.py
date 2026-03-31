from fastapi import FastAPI # type: ignore
from fastapi.middleware.cors import CORSMiddleware # type: ignore
from fastapi.staticfiles import StaticFiles # type: ignore
import os
from app.api.routes import scan_routes, report_routes, prediction_routes # type: ignore

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

@app.get("/")
async def health_check():
    """
    Health check endpoint.
    """
    return {
        "message": "SevaSetu Backend Running",
        "status": "healthy"
    }
