from fastapi import FastAPI

from app.api.calibration import router as calibration_router

app = FastAPI(title="Speech Accessibility API")

app.include_router(calibration_router)

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