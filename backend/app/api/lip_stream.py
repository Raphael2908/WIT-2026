"""Endpoints for frame and MP4 lip analysis."""

from __future__ import annotations

from pathlib import Path
from tempfile import NamedTemporaryFile
from typing import Optional

from fastapi import APIRouter, File, Form, HTTPException, UploadFile

from app.services.lip_analyzer import LipAnalyzer
from app.services.video_streamer import VideoFrameStreamer

router = APIRouter(prefix="/api/lips", tags=["lips"])

_analyzer: Optional[LipAnalyzer] = None


def get_lip_analyzer() -> LipAnalyzer:
    global _analyzer
    if _analyzer is None:
        try:
            _analyzer = LipAnalyzer()
        except Exception as exc:
            raise HTTPException(
                status_code=503,
                detail=f"MediaPipe unavailable: {exc}",
            ) from exc
    return _analyzer


@router.get("/health")
def lips_health() -> dict:
    return {"status": "ok"}


@router.post("/frame")
async def analyze_frame(frame: UploadFile = File(..., description="JPEG/PNG frame chunk")) -> dict:
    if frame.content_type not in {"image/jpeg", "image/png"}:
        raise HTTPException(status_code=400, detail="Send JPEG or PNG frames.")
    payload = await frame.read()
    if not payload:
        raise HTTPException(status_code=400, detail="Empty frame.")
    analyzer = get_lip_analyzer()
    try:
        return analyzer.analyze_image_bytes(payload)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc


@router.post("/mp4")
async def analyze_mp4(
    video: UploadFile = File(..., description="MP4 upload"),
    every_n: int = Form(2),
    max_frames: int = Form(120),
) -> dict:
    if video.content_type not in {"video/mp4", "application/octet-stream"}:
        raise HTTPException(status_code=400, detail="Upload an MP4 file.")
    if every_n < 1:
        raise HTTPException(status_code=400, detail="every_n must be >= 1")
    if max_frames < 1:
        raise HTTPException(status_code=400, detail="max_frames must be >= 1")

    analyzer = get_lip_analyzer()
    streamer = VideoFrameStreamer(every_n=every_n)

    data = await video.read()
    if not data:
        raise HTTPException(status_code=400, detail="Empty MP4 upload.")

    tmp_path = None
    try:
        with NamedTemporaryFile(suffix=".mp4", delete=False) as tmp:
            tmp.write(data)
            tmp_path = Path(tmp.name)

        frames_processed = 0
        frames_with_face = 0
        frames_without_face = 0
        frame_results = []

        for ts_ms, jpeg_bytes in streamer.iter_frames(str(tmp_path)):
            if frames_processed >= max_frames:
                break
            frames_processed += 1
            try:
                analyzed = analyzer.analyze_image_bytes(jpeg_bytes, timestamp_ms=ts_ms)
                frames_with_face += 1
                frame_results.append(analyzed)
            except ValueError:
                frames_without_face += 1

        return {
            "frames_processed": frames_processed,
            "frames_with_face": frames_with_face,
            "frames_without_face": frames_without_face,
            "sample": frame_results[:10],
        }
    finally:
        if tmp_path and tmp_path.exists():
            tmp_path.unlink(missing_ok=True)
