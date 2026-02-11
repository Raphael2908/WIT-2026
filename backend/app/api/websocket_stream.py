"""WebSocket endpoint for real-time streaming decode."""

import base64
import json
import logging
import time
from datetime import datetime
from typing import Optional
from uuid import uuid4

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from app.models.request_model import DecodeResult, LipFrame, LipMatch, LipSignature
from app.services.claude_service import ClaudeService
from app.services.fusion_service import FusionService
from app.services.lip_matching_service import frames_to_shape_sequence, find_top_lip_matches
from app.services.whisper_service import WhisperService
from app.storage.file_storage import FileManager

logger = logging.getLogger(__name__)

router = APIRouter()


@router.websocket("/decode/{user_id}/stream")
async def decode_stream(websocket: WebSocket, user_id: str):
    """WebSocket endpoint for streaming decode.

    Protocol:
    - Client sends: {type: "audio", data: base64_string}
    - Client sends: {type: "landmarks", data: LipFrame}
    - Client sends: {type: "end_utterance"}
    - Server sends: {type: "partial", text: "..."}
    - Server sends: {type: "final", result: DecodeResult}
    - Server sends: {type: "error", message: "..."}
    """
    await websocket.accept()

    file_manager = FileManager()
    whisper_service = WhisperService()
    fusion_service = FusionService()
    claude_service = ClaudeService()

    # Load user profile
    try:
        profile = await file_manager.load_profile(user_id)
    except Exception as e:
        await websocket.send_json({"type": "error", "message": f"Failed to load profile: {e}"})
        await websocket.close()
        return

    if profile is None:
        await websocket.send_json({"type": "error", "message": f"User '{user_id}' not found"})
        await websocket.close()
        return

    audio_chunks: list[str] = []
    lip_frames: list[LipFrame] = []

    try:
        while True:
            data = await websocket.receive_text()
            msg = json.loads(data)
            msg_type = msg.get("type")

            if msg_type == "audio":
                audio_chunks.append(msg["data"])

            elif msg_type == "landmarks":
                try:
                    frame = LipFrame(**msg["data"])
                    lip_frames.append(frame)
                except Exception:
                    pass  # Skip malformed frames

            elif msg_type == "end_utterance":
                start = time.time()

                if not audio_chunks:
                    await websocket.send_json({"type": "error", "message": "No audio received"})
                    continue

                # Concatenate audio chunks (all are base64)
                combined_audio = "".join(audio_chunks)

                # Transcribe with Whisper
                try:
                    transcription = await whisper_service.transcribe_base64_audio(
                        base64_audio=combined_audio,
                    )
                except Exception as e:
                    await websocket.send_json({"type": "error", "message": f"Transcription failed: {e}"})
                    audio_chunks.clear()
                    lip_frames.clear()
                    continue

                # Process lip frames
                lip_reading_text: Optional[str] = None
                lip_matches: list[LipMatch] = []
                lip_reading_used = bool(lip_frames)

                if lip_frames:
                    try:
                        shape_sequence = frames_to_shape_sequence(lip_frames)
                        if shape_sequence:
                            raw_sigs = await file_manager.load_lip_signatures(user_id)
                            signatures = [LipSignature(**s) for s in raw_sigs]
                            if signatures:
                                lip_matches = find_top_lip_matches(shape_sequence, signatures)
                                if lip_matches and lip_matches[0].similarity > 0.5:
                                    lip_reading_text = lip_matches[0].phrase_text
                    except Exception:
                        pass

                # Fuse
                fusion_result = fusion_service.fuse(
                    audio_text=transcription.text,
                    audio_confidence=transcription.confidence,
                    weights=profile.modality_weights,
                    lip_reading_text=lip_reading_text,
                )

                # Correct with Claude
                try:
                    recognition_result = await claude_service.correct_transcription(
                        transcription=fusion_result.text,
                        user_profile=profile,
                        lip_reading_text=lip_reading_text,
                    )
                except Exception as e:
                    await websocket.send_json({"type": "error", "message": f"Correction failed: {e}"})
                    audio_chunks.clear()
                    lip_frames.clear()
                    continue

                decode_id = str(uuid4())
                processing_time_ms = int((time.time() - start) * 1000)

                result = DecodeResult(
                    decode_id=decode_id,
                    decoded_text=recognition_result.corrected_text,
                    raw_whisper=transcription.text,
                    whisper_confidence=transcription.confidence,
                    lip_reading_used=lip_reading_used,
                    modality_weights={
                        "audio": profile.modality_weights.audio,
                        "lip": profile.modality_weights.lip,
                    },
                    lip_matches=lip_matches,
                    processing_time_ms=processing_time_ms,
                )

                # Save to decode history
                history_entry = {
                    "decode_id": decode_id,
                    "decoded_text": recognition_result.corrected_text,
                    "raw_whisper": transcription.text,
                    "whisper_confidence": transcription.confidence,
                    "lip_used": lip_reading_used,
                    "feedback_status": "pending",
                    "corrected_text": None,
                    "created_at": datetime.utcnow().isoformat(),
                }
                try:
                    await file_manager.save_decode_history_entry(user_id, history_entry)
                except Exception:
                    pass

                await websocket.send_json({
                    "type": "final",
                    "result": result.model_dump(),
                })

                # Reset for next utterance
                audio_chunks.clear()
                lip_frames.clear()

    except WebSocketDisconnect:
        logger.info(f"WebSocket disconnected for user {user_id}")
    except Exception as e:
        logger.error(f"WebSocket error for user {user_id}: {e}")
        try:
            await websocket.send_json({"type": "error", "message": str(e)})
        except Exception:
            pass
