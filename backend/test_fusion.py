import logging
from app.services.fusion_service import FusionService
from app.models.user_profile import ModalityWeights
from app.models.request_model import GestureSignal

def test_fusion():
    service = FusionService()

    # Test 1: Audio only
    print("\n" + "="*60)
    print("Test 1 - Audio only")
    print("="*60)
    weights = ModalityWeights(audio=0.7, visual=0.8, gesture=0.5)
    result = service.fuse("hello world", 0.85, weights)
    print(f"Result: {result}")

    # Test 2: Audio + lip reading (lip reading should win for multimodal_input_fusion weights)
    print("\n" + "="*60)
    print("Test 2 - Audio + Lip reading (MIF weights - lip should win)")
    print("="*60)
    weights = ModalityWeights(audio=0.5, visual=0.9, gesture=0.7)  # MIF weights
    result = service.fuse("helo worl", 0.7, weights, lip_reading_text="hello world")
    print(f"Result: {result}")

    # Test 3: With CONFIRM gesture
    print("\n" + "="*60)
    print("Test 3 - With CONFIRM gesture")
    print("="*60)
    result = service.fuse("hello", 0.6, weights, gesture_signal=GestureSignal.CONFIRM)
    print(f"Result: {result}")

    # Test 4: With NEGATE gesture
    print("\n" + "="*60)
    print("Test 4 - With NEGATE gesture")
    print("="*60)
    result = service.fuse("hello", 0.8, weights, gesture_signal=GestureSignal.NEGATE)
    print(f"Result: {result}")

    # Test 5: With PUNCTUATE gesture
    print("\n" + "="*60)
    print("Test 5 - With PUNCTUATE gesture")
    print("="*60)
    result = service.fuse("hello world", 0.8, weights, gesture_signal=GestureSignal.PUNCTUATE)
    print(f"Result: {result}")

    # Test 6: Audio wins over lip reading (ASD weights with high audio confidence)
    print("\n" + "="*60)
    print("Test 6 - Audio wins (ASD weights, high audio confidence)")
    print("="*60)
    weights = ModalityWeights(audio=0.7, visual=0.8, gesture=0.5)  # ASD weights
    result = service.fuse("hello world", 0.95, weights, lip_reading_text="hello world")
    print(f"Result: {result}")

if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO, format='%(levelname)s: %(message)s')
    test_fusion()
