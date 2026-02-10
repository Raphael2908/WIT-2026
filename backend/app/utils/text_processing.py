def calculate_similarity(text1: str, text2: str) -> float:
    """Calculate word-based Jaccard similarity between two texts.

    Args:
        text1: First text string.
        text2: Second text string.

    Returns:
        Similarity score between 0.0 and 1.0.
    """
    if not text1 or not text2:
        return 0.0

    words1 = set(text1.lower().split())
    words2 = set(text2.lower().split())

    if not words1 or not words2:
        return 0.0

    intersection = words1 & words2
    union = words1 | words2

    return len(intersection) / len(union)
