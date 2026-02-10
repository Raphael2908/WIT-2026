"""Test script for FileManager."""

import asyncio
from datetime import datetime

from app.models.user_profile import ImpairmentCategory, ModalityWeights, UserProfile
from app.storage.file_storage import FileManager


async def test_file_manager():
    """Test FileManager operations."""
    print("Testing FileManager...")

    fm = FileManager()
    test_user_id = "test_user_123"

    # 1. Create a UserProfile
    print("\n1. Creating UserProfile...")
    profile = UserProfile(
        user_id=test_user_id,
        category=ImpairmentCategory.ADAPTIVE_SPEECH_DECODING,
        confidence=0.87,
        calibration_date=datetime(2025, 2, 10, 14, 30, 0),
        phoneme_patterns={"/k/": "often_dropped", "/d/": "often_dropped_word_final"},
        common_substitutions={"quick": "quik", "help": "hep", "need": "nee"},
        weights=ModalityWeights(audio=0.7, visual=0.8, gesture=0.5),
        confidence_threshold=0.7,
        last_updated=datetime(2025, 2, 10, 14, 30, 0),
    )
    print(f"   Created profile for user: {profile.user_id}")
    print(f"   Category: {profile.category.value}")

    # 2. Save profile
    print("\n2. Saving profile...")
    await fm.save_profile(profile)
    print("   Profile saved successfully!")

    # 3. Check profile exists
    print("\n3. Checking profile exists...")
    exists = fm.profile_exists(test_user_id)
    print(f"   Profile exists: {exists}")
    assert exists, "Profile should exist after saving"

    # 4. Load profile back
    print("\n4. Loading profile...")
    loaded_profile = await fm.load_profile(test_user_id)
    assert loaded_profile is not None, "Loaded profile should not be None"
    print(f"   Loaded user_id: {loaded_profile.user_id}")
    print(f"   Loaded category: {loaded_profile.category.value}")
    print(f"   Loaded confidence: {loaded_profile.confidence}")
    print(f"   Loaded phoneme_patterns: {loaded_profile.phoneme_patterns}")
    print(f"   Loaded common_substitutions: {loaded_profile.common_substitutions}")
    print(f"   Loaded weights: audio={loaded_profile.weights.audio}, visual={loaded_profile.weights.visual}, gesture={loaded_profile.weights.gesture}")

    # Verify data matches
    assert loaded_profile.user_id == profile.user_id, "user_id mismatch"
    assert loaded_profile.category == profile.category, "category mismatch"
    assert loaded_profile.confidence == profile.confidence, "confidence mismatch"
    assert loaded_profile.phoneme_patterns == profile.phoneme_patterns, "phoneme_patterns mismatch"
    assert loaded_profile.common_substitutions == profile.common_substitutions, "common_substitutions mismatch"
    assert loaded_profile.weights.audio == profile.weights.audio, "weights.audio mismatch"
    assert loaded_profile.weights.visual == profile.weights.visual, "weights.visual mismatch"
    assert loaded_profile.weights.gesture == profile.weights.gesture, "weights.gesture mismatch"
    print("   All profile data verified!")

    # 5. Log corrections
    print("\n5. Logging corrections...")
    await fm.log_correction(test_user_id, "I nee hep", "I need help")
    await fm.log_correction(test_user_id, "quik fox", "quick fox")
    print("   Corrections logged successfully!")

    # 6. Read corrections back
    print("\n6. Reading corrections...")
    corrections = await fm.get_corrections(test_user_id)
    print(f"   Found {len(corrections)} corrections:")
    for c in corrections:
        print(f"     - '{c['original']}' -> '{c['corrected']}' at {c['timestamp']}")
    assert len(corrections) == 2, f"Expected 2 corrections, got {len(corrections)}"
    assert corrections[0]["original"] == "I nee hep", "First correction original mismatch"
    assert corrections[0]["corrected"] == "I need help", "First correction corrected mismatch"
    print("   Corrections data verified!")

    # 7. Test save_calibration_audio
    print("\n7. Saving calibration audio...")
    test_audio_bytes = b"RIFF" + b"\x00" * 100  # Fake WAV header
    audio_path = await fm.save_calibration_audio(test_user_id, test_audio_bytes)
    print(f"   Audio saved to: {audio_path}")

    # 8. Test loading non-existent profile
    print("\n8. Testing non-existent profile...")
    non_existent = await fm.load_profile("non_existent_user")
    assert non_existent is None, "Non-existent profile should return None"
    print("   Correctly returned None for non-existent profile")

    print("\n" + "=" * 50)
    print("All tests passed!")
    print("=" * 50)


if __name__ == "__main__":
    asyncio.run(test_file_manager())
