from fastapi import FastAPI # type: ignore
from fastapi.middleware.cors import CORSMiddleware # type: ignore
from app.api.routes import scan_routes, report_routes # type: ignore

app = FastAPI(title="SevaSetu Backend")

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

@app.get("/")
async def health_check():
    """
    Health check endpoint.
    """
    return {
        "message": "SevaSetu Backend Running",
        "status": "healthy"
    }
