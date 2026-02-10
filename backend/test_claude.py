import asyncio

from app.services.claude_service import ClaudeService


async def test_calibration():
    """Test calibration analysis with sample data."""
    service = ClaudeService()

    expected = [
        "The quick brown fox jumps over the lazy dog",
        "I need help with my medication",
        "Can you please repeat that",
    ]

    # Simulated transcriptions with speech impairment patterns
    actual = [
        "The quik brown fox jumps over the lazy dog",
        "I nee hep with my medication",
        "Can you pease repeat that",
    ]

    print("Testing calibration analysis...")
    print(f"Expected: {expected}")
    print(f"Actual: {actual}")
    print()

    result = await service.analyze_calibration(expected, actual)

    print(f"Category: {result.category.value}")
    print(f"Confidence: {result.confidence}")
    print(f"Phoneme patterns: {result.phoneme_patterns}")
    print(f"Substitutions: {result.common_substitutions}")
    print(f"Analysis: {result.analysis}")


if __name__ == "__main__":
    asyncio.run(test_calibration())
