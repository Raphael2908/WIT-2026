"""Test script for calibration endpoint."""

import asyncio
import base64
import os

from dotenv import load_dotenv

load_dotenv()


async def test_calibrate():
    """Test the calibration endpoint with a real audio file."""
    from app.api.calibration import calibrate
    from app.models.request_model import CalibrationRequest

    # Check for test audio file
    test_audio_path = "test.m4a"
    if not os.path.exists(test_audio_path):
        # Try wav as alternative
        test_audio_path = "test.wav"
        if not os.path.exists(test_audio_path):
            print("No test audio file found. Please provide test.m4a or test.wav")
            return

    # Read and encode audio
    with open(test_audio_path, "rb") as f:
        audio_bytes = f.read()

    base64_audio = base64.b64encode(audio_bytes).decode("utf-8")

    # Create request
    request = CalibrationRequest(
        user_id="test_user_001",
        audio_file=base64_audio,
        expected_sentences=[
            "The quick brown fox jumps over the lazy dog",
            "I need help with my medication",
        ],
    )

    print("Sending calibration request...")
    try:
        response = await calibrate(request)
        print("\nCalibration successful!")
        print(f"Status: {response.status}")
        print(f"Category: {response.category}")
        print(f"Confidence: {response.confidence:.2f}")
        print(f"Phoneme patterns: {response.phoneme_patterns}")
        print(f"Message: {response.message}")
    except Exception as e:
        print(f"Calibration failed: {e}")
        raise


if __name__ == "__main__":
    asyncio.run(test_calibrate())
