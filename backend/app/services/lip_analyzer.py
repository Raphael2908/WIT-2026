"""MediaPipe lip analysis service integrated from prototype `extra/`."""

from __future__ import annotations

import os
from pathlib import Path
from typing import Dict, List, Optional
import time

try:
    import cv2  # type: ignore
    import mediapipe as mp  # type: ignore
    import numpy as np  # type: ignore
except Exception:  # pragma: no cover - dependency may not be present in dev env.
    cv2 = None
    mp = None
    np = None


# Contract-aligned 40 lip landmarks.
LIP_IDXS: List[int] = [
    61,
    146,
    91,
    181,
    84,
    17,
    314,
    405,
    321,
    375,
    291,
    308,
    324,
    318,
    402,
    317,
    14,
    87,
    178,
    88,
    95,
    185,
    40,
    39,
    37,
    0,
    267,
    269,
    270,
    409,
    415,
    310,
    311,
    312,
    13,
    82,
    81,
    42,
    183,
    78,
]


def classify_shape(openness: float, width: float, rounding: float) -> str:
    """Rule-based shape classification aligned with CLAUDE_GENERAL contract."""
    if width < 0.30 and rounding > 1.2:
        return "PURSED"
    if openness < 0.10:
        return "CLOSED"
    if 0.10 <= openness < 0.25 and rounding < 0.8:
        return "BARELY_OPEN"
    if openness >= 0.25 and width > 0.50:
        return "OPEN_SPREAD"
    if openness >= 0.25 and rounding > 1.0:
        return "OPEN_ROUND"
    if openness < 0.25 and width > 0.55:
        return "WIDE_SPREAD"
    if width < 0.35 and openness < 0.20:
        return "NARROW"
    return "NEUTRAL"


class LipAnalyzer:
    def __init__(
        self,
        min_detection_confidence: float = 0.5,
        min_tracking_confidence: float = 0.5,
    ):
        if mp is None or cv2 is None or np is None:
            raise RuntimeError("mediapipe is not installed")
        self._mode = None
        self._mp_face_mesh = None
        self._task_landmarker = None

        if hasattr(mp, "solutions") and hasattr(mp.solutions, "face_mesh"):
            self._mode = "solutions"
            self._mp_face_mesh = mp.solutions.face_mesh.FaceMesh(
                static_image_mode=False,
                max_num_faces=1,
                refine_landmarks=True,
                min_detection_confidence=min_detection_confidence,
                min_tracking_confidence=min_tracking_confidence,
            )
            return

        # Newer MediaPipe Python builds (including many Py3.12 wheels) expose only tasks API.
        if hasattr(mp, "tasks"):
            try:
                from mediapipe.tasks.python import BaseOptions
                from mediapipe.tasks.python import vision
            except Exception as exc:
                raise RuntimeError(f"MediaPipe tasks unavailable: {exc}") from exc

            default_model = Path(__file__).resolve().parents[2] / "models" / "face_landmarker.task"
            model_path = Path(
                os.getenv("MEDIAPIPE_FACE_LANDMARKER_TASK", str(default_model))
            )
            if not model_path.exists():
                raise RuntimeError(
                    "tasks-only mediapipe detected, but no face landmarker model was found. "
                    f"Set MEDIAPIPE_FACE_LANDMARKER_TASK to a valid .task file (tried: {model_path})."
                )

            options = vision.FaceLandmarkerOptions(
                base_options=BaseOptions(model_asset_path=str(model_path)),
                running_mode=vision.RunningMode.IMAGE,
                num_faces=1,
                min_face_detection_confidence=min_detection_confidence,
                min_face_presence_confidence=min_detection_confidence,
                min_tracking_confidence=min_tracking_confidence,
                output_face_blendshapes=False,
                output_facial_transformation_matrixes=False,
            )
            self._mode = "tasks"
            self._task_landmarker = vision.FaceLandmarker.create_from_options(options)
            return

        raise RuntimeError("Unsupported mediapipe build: neither solutions nor tasks are available")

    @staticmethod
    def is_available() -> bool:
        return mp is not None and cv2 is not None and np is not None

    @staticmethod
    def _decode_image(data: bytes):
        if np is None or cv2 is None:
            return None
        arr = np.frombuffer(data, np.uint8)
        return cv2.imdecode(arr, cv2.IMREAD_COLOR)

    @staticmethod
    def _distance(a, b) -> float:
        return ((a.x - b.x) ** 2 + (a.y - b.y) ** 2) ** 0.5

    @staticmethod
    def _midpoint(a, b):
        class Point:
            x = 0.0
            y = 0.0
            z = 0.0

        p = Point()
        p.x = (a.x + b.x) / 2.0
        p.y = (a.y + b.y) / 2.0
        p.z = (a.z + b.z) / 2.0
        return p

    @classmethod
    def _lip_metrics(cls, landmarks) -> Dict:
        lip_points = []
        for idx in LIP_IDXS:
            lm = landmarks[idx]
            lip_points.append({"index": idx, "x": lm.x, "y": lm.y, "z": lm.z})

        upper = cls._midpoint(landmarks[13], landmarks[14])
        lower = cls._midpoint(landmarks[17], landmarks[0])
        left = landmarks[61]
        right = landmarks[291]

        openness = cls._distance(upper, lower)
        width = cls._distance(left, right)
        rounding = openness / max(width, 1e-6)
        return {
            "landmarks": lip_points,
            "openness": float(openness),
            "width": float(width),
            "rounding": float(rounding),
        }

    def analyze_frame(self, frame_bgr, timestamp_ms: Optional[int] = None) -> Dict:
        if cv2 is None:
            raise RuntimeError("opencv is not installed")
        if timestamp_ms is None:
            timestamp_ms = int(time.time() * 1000)

        rgb = cv2.cvtColor(frame_bgr, cv2.COLOR_BGR2RGB)
        landmarks = None
        if self._mode == "solutions":
            result = self._mp_face_mesh.process(rgb)
            if not result.multi_face_landmarks:
                raise ValueError("No face detected")
            landmarks = result.multi_face_landmarks[0].landmark
        elif self._mode == "tasks":
            mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb)
            result = self._task_landmarker.detect(mp_image)
            if not result.face_landmarks:
                raise ValueError("No face detected")
            landmarks = result.face_landmarks[0]
        else:
            raise RuntimeError("LipAnalyzer is not initialized")

        metrics = self._lip_metrics(landmarks)
        shape = classify_shape(
            metrics["openness"], metrics["width"], metrics["rounding"]
        )
        return {
            "timestamp_ms": timestamp_ms,
            "landmarks": metrics["landmarks"],
            "openness": metrics["openness"],
            "width": metrics["width"],
            "rounding": metrics["rounding"],
            "shape": shape,
        }

    def analyze_image_bytes(self, data: bytes, timestamp_ms: Optional[int] = None) -> Dict:
        frame = self._decode_image(data)
        if frame is None:
            raise ValueError("Decode failed")
        return self.analyze_frame(frame, timestamp_ms)
