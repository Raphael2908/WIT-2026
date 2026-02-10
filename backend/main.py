from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.calibration import router as calibration_router
from app.api import correction_router, lip_stream_router, recognition_router

app = FastAPI(title="WIT-2026 Backend")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(calibration_router)
app.include_router(recognition_router)
app.include_router(correction_router)
app.include_router(lip_stream_router)

@app.get("/")
def root():
    """Root endpoint"""
    return {"message": "API is running"}

@app.get("/health")
def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "services": {
            "whisper": "available",
            "claude": "available",
            "storage": "available"
        }
    }
