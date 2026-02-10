import asyncio

from app.services.whisper_service import WhisperService


async def test():
    # Send file directly to Whisper API (skips conversion)
    service = WhisperService()
    result = await service.transcribe_file("test.m4a")

    print(f"Text: {result.text}")
    print(f"Confidence: {result.confidence}")
    print(f"Language: {result.language}")
    print(f"Duration: {result.duration_ms}ms")


if __name__ == "__main__":
    asyncio.run(test())
