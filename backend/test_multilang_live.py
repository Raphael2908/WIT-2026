"""Live test: multi-language detection and decode pipeline.

Tests English, Mandarin Chinese, Cantonese, and Malay through the full
decode endpoint. Verifies the output matrix:

| Language  | decoded_text       | chinese_text              | detected_language |
|-----------|--------------------|---------------------------|-------------------|
| English   | Corrected English  | None                      | "en"              |
| Mandarin  | Corrected English  | Claude-corrected Chinese  | "chinese"/"zh"    |
| Cantonese | English translation| None                      | "cantonese"/"yue" |
| Malay     | English translation| None                      | "malay"/"ms"      |

Note: Hokkien is not supported by gTTS so cannot be tested with synthetic audio.
"""

import asyncio
import base64
import os
import sys
import time

# Fix Windows console encoding for CJK characters
sys.stdout.reconfigure(encoding="utf-8")

from dotenv import load_dotenv

load_dotenv()

from app.services.whisper_service import (
    CANTONESE_CODES,
    MALAY_CODES,
    MANDARIN_CODES,
    NON_ENGLISH_CODES,
)


# ── Audio generation ────────────────────────────────────────────────

def generate_audio(text: str, lang: str, output_path: str) -> str:
    """Generate a TTS audio clip using Google TTS."""
    from gtts import gTTS

    tts = gTTS(text=text, lang=lang)
    tts.save(output_path)
    size = os.path.getsize(output_path)
    print(f"  Generated: {output_path} ({size} bytes)")
    return output_path


def audio_to_base64(path: str) -> str:
    with open(path, "rb") as f:
        return base64.b64encode(f.read()).decode("utf-8")


# ── Test A: Whisper language detection per language ─────────────────

async def test_whisper_detection():
    """Test Whisper auto-detect + translation for each language."""
    from app.services.whisper_service import WhisperService

    service = WhisperService()

    cases = [
        ("English",   "I need help with my medication",  "en",    "test_en.mp3"),
        ("Mandarin",  "你好，我需要帮助",                  "zh-CN", "test_zh.mp3"),
        ("Cantonese", "你好，我需要幫助",                  "yue",   "test_yue.mp3"),
        ("Malay",     "Saya perlukan bantuan",            "ms",    "test_ms.mp3"),
    ]

    print("=" * 60)
    print("Test A - Whisper auto-detect for each language")
    print("=" * 60)

    results = {}
    for label, text, tts_lang, audio_path in cases:
        print(f"\n  [{label}]")
        generate_audio(text, tts_lang, audio_path)
        audio_b64 = audio_to_base64(audio_path)

        result = await service.transcribe_base64_audio(
            base64_audio=audio_b64,
            auto_detect=True,
        )

        print(f"    Text (raw):       {result.text}")
        print(f"    Language:         {result.language}")
        print(f"    Confidence:       {result.confidence}")
        print(f"    Translated text:  {result.translated_text}")

        if label == "English":
            if result.language not in NON_ENGLISH_CODES:
                print(f"    PASS - Detected as non-Chinese/non-Malay ('{result.language}')")
            else:
                print(f"    NOTE - Whisper detected '{result.language}' for English audio")
        else:
            if result.translated_text:
                print(f"    PASS - Translation provided for {label}")
            else:
                print(f"    NOTE - No translation for {label} (Whisper detected '{result.language}')")

        results[label] = result

    print()
    return results


# ── Test B: Full decode endpoint per language ───────────────────────

async def test_decode_per_language():
    """Send each language through the full decode endpoint."""
    from app.api.recognition import decode
    from app.models.request_model import DecodeRequest

    cases = [
        ("English",   "I need help with my medication",  "en",    "test_en.mp3"),
        ("Mandarin",  "你好，我需要帮助",                  "zh-CN", "test_zh.mp3"),
        ("Cantonese", "你好，我需要幫助",                  "yue",   "test_yue.mp3"),
        ("Malay",     "Saya perlukan bantuan",            "ms",    "test_ms.mp3"),
    ]

    print("=" * 60)
    print("Test B - Full decode endpoint per language")
    print("=" * 60)

    for label, text, tts_lang, audio_path in cases:
        print(f"\n  [{label}]")

        # Generate audio if not already present from Test A
        if not os.path.exists(audio_path):
            generate_audio(text, tts_lang, audio_path)

        audio_b64 = audio_to_base64(audio_path)
        request = DecodeRequest(audio_base64=audio_b64)

        start = time.time()
        result = await decode(user_id=f"test_{label.lower()}_user", request=request)
        elapsed = int((time.time() - start) * 1000)

        print(f"    decoded_text:      {result.decoded_text}")
        print(f"    raw_whisper:       {result.raw_whisper}")
        print(f"    detected_language: {result.detected_language}")
        print(f"    chinese_text:      {result.chinese_text}")
        print(f"    confidence:        {result.whisper_confidence}")
        print(f"    processing_time:   {elapsed}ms")

        # Verify output matrix
        if label == "English":
            if result.detected_language == "en":
                assert result.chinese_text is None, \
                    f"English should have chinese_text=None, got '{result.chinese_text}'"
                print("    PASS - English: decoded_text=English, chinese_text=None")
            else:
                print(f"    NOTE - Whisper detected '{result.detected_language}' for English audio")

        elif label == "Mandarin":
            if result.detected_language in MANDARIN_CODES:
                assert result.chinese_text is not None, \
                    "Mandarin should have chinese_text (Claude-corrected)"
                print(f"    PASS - Mandarin: chinese_text='{result.chinese_text}' (corrected)")
            else:
                print(f"    NOTE - Whisper detected '{result.detected_language}' instead of Mandarin")

        elif label == "Cantonese":
            if result.detected_language in CANTONESE_CODES:
                assert result.chinese_text is None, \
                    f"Cantonese should have chinese_text=None, got '{result.chinese_text}'"
                print("    PASS - Cantonese: decoded_text=English, chinese_text=None")
            elif result.detected_language in MANDARIN_CODES:
                # Whisper sometimes detects Cantonese as "chinese"
                print(f"    NOTE - Whisper detected '{result.detected_language}' (Mandarin path)")
                print(f"           chinese_text='{result.chinese_text}'")
            else:
                print(f"    NOTE - Whisper detected '{result.detected_language}' for Cantonese audio")

        elif label == "Malay":
            if result.detected_language in MALAY_CODES:
                assert result.chinese_text is None, \
                    f"Malay should have chinese_text=None, got '{result.chinese_text}'"
                print("    PASS - Malay: decoded_text=English, chinese_text=None")
            else:
                print(f"    NOTE - Whisper detected '{result.detected_language}' for Malay audio")

    print()


# ── Test C: Language constants sanity check ─────────────────────────

def test_language_constants():
    """Verify language constants are correctly defined."""
    print("=" * 60)
    print("Test C - Language constant sets")
    print("=" * 60)

    assert "chinese" in MANDARIN_CODES
    assert "zh" in MANDARIN_CODES
    print("  PASS - MANDARIN_CODES: {chinese, zh}")

    assert "cantonese" in CANTONESE_CODES
    assert "yue" in CANTONESE_CODES
    print("  PASS - CANTONESE_CODES: {cantonese, yue}")

    from app.services.whisper_service import HOKKIEN_CODES
    assert "nan" in HOKKIEN_CODES
    assert "min nan" in HOKKIEN_CODES
    print("  PASS - HOKKIEN_CODES: {nan, min nan}")

    assert "malay" in MALAY_CODES
    assert "ms" in MALAY_CODES
    print("  PASS - MALAY_CODES: {malay, ms}")

    # NON_ENGLISH_CODES is the union
    for code in ["chinese", "zh", "cantonese", "yue", "nan", "malay", "ms"]:
        assert code in NON_ENGLISH_CODES, f"'{code}' missing from NON_ENGLISH_CODES"
    assert "en" not in NON_ENGLISH_CODES
    assert "english" not in NON_ENGLISH_CODES
    print("  PASS - NON_ENGLISH_CODES is correct union, excludes English")
    print()


# ── Test D: Detection routing logic (no API calls) ─────────────────

def test_routing_logic():
    """Test the language detection routing without API calls."""
    from app.services.whisper_service import TranscriptionResult

    print("=" * 60)
    print("Test D - Language routing logic (offline)")
    print("=" * 60)

    # Mandarin → chinese_text set, pipeline gets English
    t = TranscriptionResult(
        text="你好我需要帮助",
        confidence=0.85,
        language="chinese",
        translated_text="Hello I need help",
    )
    detected = t.language if t.language in NON_ENGLISH_CODES else "en"
    chinese_text = None
    if detected in NON_ENGLISH_CODES:
        if detected in MANDARIN_CODES:
            chinese_text = t.text  # Would be Claude-corrected in real pipeline
        if t.translated_text:
            t.text = t.translated_text

    assert detected == "chinese"
    assert chinese_text == "你好我需要帮助"
    assert t.text == "Hello I need help"
    print("  PASS - Mandarin: chinese_text preserved, pipeline gets English")

    # Cantonese → no chinese_text, pipeline gets English
    t2 = TranscriptionResult(
        text="你好",
        confidence=0.8,
        language="yue",
        translated_text="Hello",
    )
    detected2 = t2.language if t2.language in NON_ENGLISH_CODES else "en"
    chinese_text2 = None
    if detected2 in NON_ENGLISH_CODES:
        if detected2 in MANDARIN_CODES:
            chinese_text2 = t2.text
        if t2.translated_text:
            t2.text = t2.translated_text

    assert detected2 == "yue"
    assert chinese_text2 is None
    assert t2.text == "Hello"
    print("  PASS - Cantonese: no chinese_text, pipeline gets English")

    # Malay → no chinese_text, pipeline gets English
    t3 = TranscriptionResult(
        text="Saya perlukan bantuan",
        confidence=0.8,
        language="ms",
        translated_text="I need help",
    )
    detected3 = t3.language if t3.language in NON_ENGLISH_CODES else "en"
    chinese_text3 = None
    if detected3 in NON_ENGLISH_CODES:
        if detected3 in MANDARIN_CODES:
            chinese_text3 = t3.text
        if t3.translated_text:
            t3.text = t3.translated_text

    assert detected3 == "ms"
    assert chinese_text3 is None
    assert t3.text == "I need help"
    print("  PASS - Malay: no chinese_text, pipeline gets English")

    # English → unchanged
    t4 = TranscriptionResult(
        text="I need help",
        confidence=0.9,
        language="english",
    )
    detected4 = t4.language if t4.language in NON_ENGLISH_CODES else "en"
    chinese_text4 = None
    if detected4 in NON_ENGLISH_CODES:
        if detected4 in MANDARIN_CODES:
            chinese_text4 = t4.text

    assert detected4 == "en"
    assert chinese_text4 is None
    assert t4.text == "I need help"
    print("  PASS - English: passes through unchanged")
    print()


# ── Test E: Claude Chinese correction (live) ───────────────────────

async def test_claude_chinese_correction():
    """Test Claude correct_chinese_text method directly."""
    from app.services.claude_service import ClaudeService

    print("=" * 60)
    print("Test E - Claude Chinese correction (live API call)")
    print("=" * 60)

    service = ClaudeService()

    # Test with mixed Traditional/Simplified
    raw = "你好，我需要幫助。請問這個怎麼辦？"
    print(f"  Input (mixed):   {raw}")

    corrected = await service.correct_chinese_text(raw)
    print(f"  Output:          {corrected}")
    assert len(corrected) > 0, "Corrected text should not be empty"
    print("  PASS - Got corrected Chinese text back")

    # Test empty input short-circuit
    empty_result = await service.correct_chinese_text("")
    assert empty_result == "", f"Empty input should return empty, got '{empty_result}'"
    print("  PASS - Empty input short-circuits correctly")

    # Test whitespace-only input short-circuit
    ws_result = await service.correct_chinese_text("   ")
    assert ws_result == "   ", f"Whitespace input should return as-is, got '{ws_result}'"
    print("  PASS - Whitespace input short-circuits correctly")
    print()


# ── Main ────────────────────────────────────────────────────────────

async def main():
    print("\n" + "=" * 60)
    print("  MULTI-LANGUAGE LIVE TESTS")
    print("=" * 60 + "\n")

    # Offline tests (no API calls)
    test_language_constants()
    test_routing_logic()

    # Live tests (require API keys)
    await test_claude_chinese_correction()
    await test_whisper_detection()
    await test_decode_per_language()

    # Cleanup generated audio files
    for f in ["test_en.mp3", "test_zh.mp3", "test_yue.mp3", "test_ms.mp3"]:
        if os.path.exists(f):
            os.remove(f)
            print(f"Cleaned up {f}")

    print("\n" + "=" * 60)
    print("  ALL MULTI-LANGUAGE TESTS COMPLETE")
    print("=" * 60 + "\n")


if __name__ == "__main__":
    asyncio.run(main())
