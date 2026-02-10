from fastapi import FastAPI

app = FastAPI(title="Speech Accessibility API")

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