"""Backend app entrypoint."""

from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import lip_stream_router

app = FastAPI(title="WIT-2026 Backend")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(lip_stream_router)


@app.get("/health")
def health() -> dict:
    return {"status": "ok"}
