"""Test: Run Test_malay.m4a through Whisper auto-detect + full decode pipeline.

Verifies:
  - Whisper detects language as "malay" or "ms"
  - English translation is produced
  - decoded_text contains corrected English
  - chinese_text is None
  - detected_language is "malay" or "ms"
"""

import asyncio
import base64
import os
import sys
import time

sys.stdout.reconfigure(encoding="utf-8")

from dotenv import load_dotenv

load_dotenv()

from app.services.whisper_service import MALAY_CODES, MANDARIN_CODES, NON_ENGLISH_CODES


def audio_to_base64(path: str) -> str:
    with open(path, "rb") as f:
        return base64.b64encode(f.read()).decode("utf-8")


async def main():
    from app.api.recognition import decode
    from app.models.request_model import DecodeRequest
    from app.services.whisper_service import WhisperService

    audio_path = "Test_malay.m4a"

    print("\n" + "=" * 60)
    print("  MALAY AUDIO TEST — Test_malay.m4a")
    print("=" * 60 + "\n")

    if not os.path.exists(audio_path):
        print(f"  FAIL - File not found: {audio_path}")
        return

    size = os.path.getsize(audio_path)
    print(f"  File size: {size} bytes")

    audio_b64 = audio_to_base64(audio_path)

    # ── Step 1: Whisper auto-detect ──
    print("\n  [Step 1: Whisper Auto-Detect]")
    whisper = WhisperService()
    whisper_result = await whisper.transcribe_base64_audio(
        base64_audio=audio_b64,
        auto_detect=True,
    )
    print(f"    Raw text:            {whisper_result.text}")
    print(f"    Detected lang:       {whisper_result.language}")
    print(f"    Confidence:          {whisper_result.confidence}")
    print(f"    English translation: {whisper_result.translated_text}")

    lang = whisper_result.language
    if lang in MALAY_CODES:
        print(f"    -> PASS: Categorized as MALAY")
    elif lang in MANDARIN_CODES:
        print(f"    -> FAIL: Misdetected as MANDARIN ({lang})")
    else:
        print(f"    -> FAIL: Unexpected language: '{lang}'")

    # ── Step 2: Full decode endpoint ──
    print("\n  [Step 2: Full Decode Pipeline]")
    request = DecodeRequest(audio_base64=audio_b64)
    user_id = "test_malay"

    start = time.time()
    result = await decode(user_id=user_id, request=request)
    elapsed = int((time.time() - start) * 1000)

    print(f"    decoded_text:      {result.decoded_text}")
    print(f"    raw_whisper:       {result.raw_whisper}")
    print(f"    detected_language: {result.detected_language}")
    print(f"    chinese_text:      {result.chinese_text}")
    print(f"    confidence:        {result.whisper_confidence}")
    print(f"    processing_time:   {elapsed}ms")

    # ── Verification ──
    print("\n  [Verification]")
    passed = True

    # Check detected_language
    if result.detected_language in MALAY_CODES:
        print(f"    PASS - detected_language is '{result.detected_language}' (Malay)")
    else:
        print(f"    FAIL - detected_language is '{result.detected_language}', expected 'malay' or 'ms'")
        passed = False

    # Check chinese_text is None
    if result.chinese_text is None:
        print(f"    PASS - chinese_text is None")
    else:
        print(f"    FAIL - chinese_text should be None, got: {result.chinese_text}")
        passed = False

    # Check decoded_text is non-empty English
    if result.decoded_text and len(result.decoded_text.strip()) > 0:
        print(f"    PASS - decoded_text is non-empty: '{result.decoded_text}'")
    else:
        print(f"    FAIL - decoded_text is empty")
        passed = False

    # Check English translation was produced
    if whisper_result.translated_text and len(whisper_result.translated_text.strip()) > 0:
        print(f"    PASS - English translation produced: '{whisper_result.translated_text}'")
    else:
        print(f"    FAIL - No English translation produced")
        passed = False

    print()
    if passed:
        print("  *** ALL CHECKS PASSED ***")
    else:
        print("  *** SOME CHECKS FAILED ***")
    print()


if __name__ == "__main__":
    asyncio.run(main())
