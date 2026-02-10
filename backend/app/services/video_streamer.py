"""Utility to extract JPEG frame chunks from local video files."""

from __future__ import annotations

from typing import Iterator, Tuple

try:
    import cv2  # type: ignore
except Exception:  # pragma: no cover
    cv2 = None


class VideoFrameStreamer:
    def __init__(self, every_n: int = 1, jpeg_quality: int = 90):
        self.every_n = max(every_n, 1)
        self.jpeg_quality = jpeg_quality

    def iter_frames(self, path: str) -> Iterator[Tuple[int, bytes]]:
        if cv2 is None:
            raise RuntimeError("opencv is not installed")
        cap = cv2.VideoCapture(path)
        if not cap.isOpened():
            raise FileNotFoundError(f"Could not open video: {path}")

        fps = cap.get(cv2.CAP_PROP_FPS) or 30.0
        frame_idx = 0
        while True:
            ok, frame = cap.read()
            if not ok:
                break
            if frame_idx % self.every_n != 0:
                frame_idx += 1
                continue
            ts_ms = int((frame_idx / fps) * 1000)
            success, buf = cv2.imencode(
                ".jpg", frame, [cv2.IMWRITE_JPEG_QUALITY, self.jpeg_quality]
            )
            if success:
                yield ts_ms, buf.tobytes()
            frame_idx += 1
        cap.release()
