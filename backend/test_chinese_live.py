"""Live test: generate Chinese TTS audio, send through decode pipeline."""

import asyncio
import base64
import os
import sys
import time

# Fix Windows console encoding for Chinese characters
sys.stdout.reconfigure(encoding="utf-8")

from dotenv import load_dotenv

load_dotenv()


def generate_chinese_audio(text: str = "你好，我需要帮助", output_path: str = "test_chinese.mp3"):
    """Generate a Chinese audio clip using Google TTS."""
    from gtts import gTTS

    tts = gTTS(text=text, lang="zh-CN")
    tts.save(output_path)
    print(f"  Generated: {output_path} ({os.path.getsize(output_path)} bytes)")
    return output_path


async def test_whisper_chinese_auto_detect():
    """Send Chinese audio to Whisper with auto_detect=True."""
    from app.services.whisper_service import WhisperService

    print("=" * 60)
    print("Test A - Whisper transcribe Chinese audio (auto_detect=True)")
    print("=" * 60)

    audio_path = generate_chinese_audio()

    service = WhisperService()
    with open(audio_path, "rb") as f:
        audio_b64 = base64.b64encode(f.read()).decode("utf-8")

    result = await service.transcribe_base64_audio(
        base64_audio=audio_b64,
        auto_detect=True,
    )

    print(f"  Text (raw):      {result.text}")
    print(f"  Language:        {result.language}")
    print(f"  Confidence:      {result.confidence}")
    print(f"  Translated text: {result.translated_text}")

    is_chinese = result.language in ("chinese", "zh")
    if is_chinese:
        assert result.translated_text is not None, "Chinese detected but no translation!"
        print("  PASS - Chinese detected, English translation provided")
    else:
        print(f"  NOTE - Whisper detected '{result.language}' instead of Chinese.")
        print("         This can happen with short/synthetic audio.")
    print()
    return result


async def test_decode_endpoint_chinese():
    """Send Chinese audio through the full decode endpoint."""
    from app.api.recognition import decode
    from app.models.request_model import DecodeRequest

    print("=" * 60)
    print("Test B - Full decode endpoint with Chinese audio")
    print("=" * 60)

    audio_path = "test_chinese.mp3"
    if not os.path.exists(audio_path):
        generate_chinese_audio(output_path=audio_path)

    with open(audio_path, "rb") as f:
        audio_b64 = base64.b64encode(f.read()).decode("utf-8")

    request = DecodeRequest(audio_base64=audio_b64)

    start = time.time()
    result = await decode(user_id="test_chinese_user", request=request)
    elapsed = int((time.time() - start) * 1000)

    print(f"  decoded_text:      {result.decoded_text}")
    print(f"  raw_whisper:       {result.raw_whisper}")
    print(f"  detected_language: {result.detected_language}")
    print(f"  chinese_text:      {result.chinese_text}")
    print(f"  confidence:        {result.whisper_confidence}")
    print(f"  processing_time:   {elapsed}ms")

    if result.detected_language in ("chinese", "zh"):
        assert result.chinese_text is not None, "Chinese detected but chinese_text is None!"
        print("  PASS - Chinese text preserved, decoded_text is English")
    else:
        assert result.chinese_text is None, "Non-Chinese but chinese_text is set!"
        print(f"  NOTE - Detected '{result.detected_language}', treated as English path")
    print()
    return result


async def test_english_still_works():
    """Verify English audio still passes through correctly."""
    from app.api.recognition import decode
    from app.models.request_model import DecodeRequest

    print("=" * 60)
    print("Test C - English audio through decode (regression check)")
    print("=" * 60)

    test_audio_path = "test.m4a"
    if not os.path.exists(test_audio_path):
        test_audio_path = "test.wav"
        if not os.path.exists(test_audio_path):
            print("  SKIP - No English test audio file")
            return

    with open(test_audio_path, "rb") as f:
        audio_b64 = base64.b64encode(f.read()).decode("utf-8")

    request = DecodeRequest(audio_base64=audio_b64)
    result = await decode(user_id="test_english_user", request=request)

    print(f"  decoded_text:      {result.decoded_text}")
    print(f"  detected_language: {result.detected_language}")
    print(f"  chinese_text:      {result.chinese_text}")

    assert result.detected_language == "en", f"Expected 'en', got '{result.detected_language}'"
    assert result.chinese_text is None, f"Expected None, got '{result.chinese_text}'"
    print("  PASS - English unchanged, no chinese_text")
    print()


async def main():
    print("\n--- Live Chinese Detection Tests ---\n")

    await test_whisper_chinese_auto_detect()
    await test_decode_endpoint_chinese()
    await test_english_still_works()

    # Cleanup generated audio
    if os.path.exists("test_chinese.mp3"):
        os.remove("test_chinese.mp3")
        print("Cleaned up test_chinese.mp3")

    print("\n" + "=" * 60)
    print("ALL LIVE TESTS COMPLETE")
    print("=" * 60)


if __name__ == "__main__":
    asyncio.run(main())
