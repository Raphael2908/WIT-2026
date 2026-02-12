"""Live test: real recorded audio files for each language/dialect.

Files:
  - Test_chinese.m4a   (Mandarin Chinese)
  - Test_cantou.m4a    (Cantonese)
  - Test_hokk.m4a      (Hokkien)
  - Test_ms.m4a        (Malay)
"""

import asyncio
import base64
import os
import sys
import time

sys.stdout.reconfigure(encoding="utf-8")

from dotenv import load_dotenv

load_dotenv()

from app.services.whisper_service import (
    CANTONESE_CODES,
    HOKKIEN_CODES,
    MALAY_CODES,
    MANDARIN_CODES,
    NON_ENGLISH_CODES,
)


def audio_to_base64(path: str) -> str:
    with open(path, "rb") as f:
        return base64.b64encode(f.read()).decode("utf-8")


async def test_file(label: str, audio_path: str):
    """Run a single audio file through Whisper detection + full decode."""
    from app.api.recognition import decode
    from app.models.request_model import DecodeRequest
    from app.services.whisper_service import WhisperService

    print("=" * 60)
    print(f"  {label}  —  {audio_path}")
    print("=" * 60)

    if not os.path.exists(audio_path):
        print(f"  SKIP - File not found: {audio_path}\n")
        return

    size = os.path.getsize(audio_path)
    print(f"  File size: {size} bytes")

    audio_b64 = audio_to_base64(audio_path)

    # ── Step 1: Whisper auto-detect ──
    print("\n  [Whisper Auto-Detect]")
    whisper = WhisperService()
    whisper_result = await whisper.transcribe_base64_audio(
        base64_audio=audio_b64,
        auto_detect=True,
    )
    print(f"    Raw text:         {whisper_result.text}")
    print(f"    Detected lang:    {whisper_result.language}")
    print(f"    Confidence:       {whisper_result.confidence}")
    print(f"    English translation: {whisper_result.translated_text}")

    # Categorize what Whisper detected
    lang = whisper_result.language
    if lang in MANDARIN_CODES:
        print(f"    -> Categorized as: MANDARIN")
    elif lang in CANTONESE_CODES:
        print(f"    -> Categorized as: CANTONESE")
    elif lang in HOKKIEN_CODES:
        print(f"    -> Categorized as: HOKKIEN")
    elif lang in MALAY_CODES:
        print(f"    -> Categorized as: MALAY")
    elif lang in NON_ENGLISH_CODES:
        print(f"    -> Categorized as: NON-ENGLISH ({lang})")
    else:
        print(f"    -> Categorized as: ENGLISH (or unrecognized: '{lang}')")

    # ── Step 2: Full decode endpoint ──
    print("\n  [Full Decode Pipeline]")
    request = DecodeRequest(audio_base64=audio_b64)
    user_id = f"test_{label.lower().replace(' ', '_')}"

    start = time.time()
    result = await decode(user_id=user_id, request=request)
    elapsed = int((time.time() - start) * 1000)

    print(f"    decoded_text:      {result.decoded_text}")
    print(f"    raw_whisper:       {result.raw_whisper}")
    print(f"    detected_language: {result.detected_language}")
    print(f"    chinese_text:      {result.chinese_text}")
    print(f"    confidence:        {result.whisper_confidence}")
    print(f"    processing_time:   {elapsed}ms")

    # ── Verify output matrix ──
    print("\n  [Verification]")
    if result.detected_language in MANDARIN_CODES:
        if result.chinese_text:
            print(f"    OK - Mandarin path: chinese_text present (Claude-corrected)")
        else:
            print(f"    WARN - Mandarin detected but chinese_text is None")
    elif result.detected_language in (CANTONESE_CODES | HOKKIEN_CODES | MALAY_CODES):
        if result.chinese_text is None:
            print(f"    OK - {result.detected_language}: no chinese_text, English output")
        else:
            print(f"    WARN - {result.detected_language} should have chinese_text=None")
    elif result.detected_language == "en":
        if result.chinese_text is None:
            print(f"    OK - English path: no chinese_text")
        else:
            print(f"    WARN - English detected but chinese_text is set")
    else:
        print(f"    INFO - Unexpected detected_language: '{result.detected_language}'")

    print()
    return result


async def main():
    print("\n" + "=" * 60)
    print("  REAL AUDIO MULTI-LANGUAGE TESTS")
    print("=" * 60 + "\n")

    files = [
        ("Mandarin Chinese", "Test_chinese.m4a"),
        ("Cantonese",        "Test_cantou.m4a"),
        ("Hokkien",          "Test_hokk.m4a"),
        ("Malay",            "Test_ms.m4a"),
    ]

    results = {}
    for label, path in files:
        results[label] = await test_file(label, path)

    # ── Summary ──
    print("=" * 60)
    print("  SUMMARY")
    print("=" * 60)
    for label, r in results.items():
        if r is None:
            print(f"  {label:20s}  SKIPPED")
        else:
            lang = r.detected_language
            cn = r.chinese_text[:30] + "..." if r.chinese_text and len(r.chinese_text) > 30 else r.chinese_text
            dec = r.decoded_text[:40] + "..." if len(r.decoded_text) > 40 else r.decoded_text
            print(f"  {label:20s}  lang={lang:10s}  chinese_text={cn}  decoded={dec}")

    print("\n" + "=" * 60)
    print("  ALL TESTS COMPLETE")
    print("=" * 60 + "\n")


if __name__ == "__main__":
    asyncio.run(main())
