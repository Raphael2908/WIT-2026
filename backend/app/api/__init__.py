"""API router exports."""

from .correction import router as correction_router
from .lip_stream import router as lip_stream_router
from .recognition import router as recognition_router

__all__ = ["lip_stream_router", "recognition_router", "correction_router"]
