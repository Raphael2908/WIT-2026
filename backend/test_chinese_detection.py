"""Test script for Chinese language detection + dual-language output."""

import asyncio
import os

from dotenv import load_dotenv

load_dotenv()


async def test_english_auto_detect():
    """Test that English audio still works with auto_detect=True."""
    from app.services.whisper_service import WhisperService

    test_audio_path = "test.m4a"
    if not os.path.exists(test_audio_path):
        test_audio_path = "test.wav"
        if not os.path.exists(test_audio_path):
            print("SKIP - No test audio file (test.m4a / test.wav)")
            return

    service = WhisperService()

    print("=" * 60)
    print("Test 1 - English audio with auto_detect=True")
    print("=" * 60)

    result = await service.transcribe_file(test_audio_path, auto_detect=True)
    print(f"  Text:            {result.text}")
    print(f"  Language:        {result.language}")
    print(f"  Confidence:      {result.confidence}")
    print(f"  Duration:        {result.duration_ms}ms")
    print(f"  Translated text: {result.translated_text}")

    assert result.translated_text is None, (
        f"English audio should NOT have translated_text, got: {result.translated_text}"
    )
    print("  PASS - No translation generated for English audio\n")


async def test_english_forced_language():
    """Test that English audio with forced language still works (calibration path)."""
    from app.services.whisper_service import WhisperService

    test_audio_path = "test.m4a"
    if not os.path.exists(test_audio_path):
        test_audio_path = "test.wav"
        if not os.path.exists(test_audio_path):
            print("SKIP - No test audio file (test.m4a / test.wav)")
            return

    service = WhisperService()

    print("=" * 60)
    print("Test 2 - English audio with auto_detect=False (calibration path)")
    print("=" * 60)

    result = await service.transcribe_file(test_audio_path, auto_detect=False)
    print(f"  Text:            {result.text}")
    print(f"  Language:        {result.language}")
    print(f"  Confidence:      {result.confidence}")
    print(f"  Translated text: {result.translated_text}")

    assert result.translated_text is None, (
        f"Forced-English should NOT have translated_text, got: {result.translated_text}"
    )
    print("  PASS - Calibration path unchanged\n")


def test_transcription_result_dataclass():
    """Test TranscriptionResult supports the new translated_text field."""
    from app.services.whisper_service import TranscriptionResult

    print("=" * 60)
    print("Test 3 - TranscriptionResult dataclass fields")
    print("=" * 60)

    # Default (no translation)
    r1 = TranscriptionResult(text="hello", confidence=0.9, language="en")
    assert r1.translated_text is None
    print("  PASS - Default translated_text is None")

    # With translation (Chinese scenario)
    r2 = TranscriptionResult(
        text="你好世界",
        confidence=0.85,
        language="chinese",
        translated_text="Hello world",
    )
    assert r2.translated_text == "Hello world"
    assert r2.language == "chinese"
    print("  PASS - Chinese result with translated_text works")
    print()


def test_decode_result_model():
    """Test DecodeResult model has new fields with correct defaults."""
    from app.models.request_model import DecodeResult

    print("=" * 60)
    print("Test 4 - DecodeResult model fields")
    print("=" * 60)

    # Without new fields (backward compat)
    r1 = DecodeResult(
        decode_id="test-1",
        decoded_text="hello",
        raw_whisper="hello",
        whisper_confidence=0.9,
        lip_reading_used=False,
        modality_weights={"audio": 0.7, "lip": 0.8},
    )
    assert r1.detected_language == "en", f"Expected 'en', got {r1.detected_language}"
    assert r1.chinese_text is None, f"Expected None, got {r1.chinese_text}"
    print("  PASS - Defaults: detected_language='en', chinese_text=None")

    # With Chinese fields
    r2 = DecodeResult(
        decode_id="test-2",
        decoded_text="Hello world",
        raw_whisper="Hello world",
        whisper_confidence=0.85,
        lip_reading_used=False,
        modality_weights={"audio": 0.7, "lip": 0.8},
        detected_language="chinese",
        chinese_text="你好世界",
    )
    assert r2.detected_language == "chinese"
    assert r2.chinese_text == "你好世界"
    print("  PASS - Chinese fields populated correctly")

    # Verify JSON serialization includes new fields
    data = r2.model_dump()
    assert "detected_language" in data
    assert "chinese_text" in data
    assert data["detected_language"] == "chinese"
    assert data["chinese_text"] == "你好世界"
    print("  PASS - JSON serialization includes new fields")
    print()


def test_decode_history_entry_model():
    """Test DecodeHistoryEntry model has new fields with correct defaults."""
    from app.models.request_model import DecodeHistoryEntry

    print("=" * 60)
    print("Test 5 - DecodeHistoryEntry model fields")
    print("=" * 60)

    # Without new fields (backward compat)
    h1 = DecodeHistoryEntry(
        decode_id="test-1",
        decoded_text="hello",
        raw_whisper="hello",
        whisper_confidence=0.9,
        lip_used=False,
        created_at="2026-02-11T00:00:00",
    )
    assert h1.detected_language == "en"
    assert h1.chinese_text is None
    print("  PASS - Defaults work for backward compatibility")

    # With Chinese fields
    h2 = DecodeHistoryEntry(
        decode_id="test-2",
        decoded_text="Hello world",
        raw_whisper="Hello world",
        whisper_confidence=0.85,
        lip_used=False,
        created_at="2026-02-11T00:00:00",
        detected_language="chinese",
        chinese_text="你好世界",
    )
    assert h2.detected_language == "chinese"
    assert h2.chinese_text == "你好世界"
    print("  PASS - Chinese fields populated correctly")
    print()


def test_chinese_detection_logic():
    """Test the Chinese detection + swap logic used in recognition.py."""
    from app.services.whisper_service import TranscriptionResult

    print("=" * 60)
    print("Test 6 - Chinese detection routing logic")
    print("=" * 60)

    # Simulate Chinese transcription result
    transcription = TranscriptionResult(
        text="你好我需要帮助",
        confidence=0.85,
        language="chinese",
        translated_text="Hello I need help",
    )

    # Replicate recognition.py logic
    detected_language = (
        transcription.language
        if transcription.language in ("chinese", "zh")
        else "en"
    )
    chinese_text = None
    if detected_language in ("chinese", "zh"):
        chinese_text = transcription.text
        if transcription.translated_text:
            transcription.text = transcription.translated_text

    assert detected_language == "chinese"
    assert chinese_text == "你好我需要帮助"
    assert transcription.text == "Hello I need help", (
        f"Pipeline text should be English translation, got: {transcription.text}"
    )
    print("  PASS - Chinese text preserved, English translation fed to pipeline")

    # Simulate English transcription result
    transcription_en = TranscriptionResult(
        text="Hello I need help",
        confidence=0.9,
        language="english",
    )

    detected_language_en = (
        transcription_en.language
        if transcription_en.language in ("chinese", "zh")
        else "en"
    )
    chinese_text_en = None
    if detected_language_en in ("chinese", "zh"):
        chinese_text_en = transcription_en.text

    assert detected_language_en == "en"
    assert chinese_text_en is None
    assert transcription_en.text == "Hello I need help"
    print("  PASS - English audio passes through unchanged")

    # Test with "zh" language code variant
    transcription_zh = TranscriptionResult(
        text="你好",
        confidence=0.8,
        language="zh",
        translated_text="Hello",
    )

    detected_zh = (
        transcription_zh.language
        if transcription_zh.language in ("chinese", "zh")
        else "en"
    )
    assert detected_zh == "zh"
    print('  PASS - "zh" language code also detected correctly')
    print()


async def main():
    print("\n--- Chinese Language Detection Tests ---\n")

    # Synchronous tests (no API calls)
    test_transcription_result_dataclass()
    test_decode_result_model()
    test_decode_history_entry_model()
    test_chinese_detection_logic()

    # Integration tests (require API key + audio file)
    await test_english_auto_detect()
    await test_english_forced_language()

    print("=" * 60)
    print("ALL TESTS PASSED")
    print("=" * 60)


if __name__ == "__main__":
    asyncio.run(main())
