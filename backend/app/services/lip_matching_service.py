"""Utilities for lip shape sequence generation and similarity matching."""

from __future__ import annotations

import re
from typing import Iterable, List

from app.models.request_model import LipFrame, LipMatch, LipSignature
from app.services.lip_analyzer import classify_shape


SHAPE_TOKEN_RE = re.compile(r"([A-Z_]+)\((\d+)ms\)")


def frames_to_shape_sequence(frames: List[LipFrame]) -> str:
    if not frames:
        return ""
    ordered = sorted(frames, key=lambda row: row.timestamp_ms)

    labels: List[str] = []
    times: List[int] = []
    for row in ordered:
        labels.append(row.shape or classify_shape(row.openness, row.width, row.rounding))
        times.append(row.timestamp_ms)

    parts = []
    current = labels[0]
    start_ts = times[0]
    prev_ts = times[0]

    for idx in range(1, len(labels)):
        label = labels[idx]
        ts = times[idx]
        if label != current:
            duration = max(prev_ts - start_ts + 33, 33)
            parts.append(f"{current}({duration}ms)")
            current = label
            start_ts = ts
        prev_ts = ts

    duration = max(prev_ts - start_ts + 33, 33)
    parts.append(f"{current}({duration}ms)")
    return " -> ".join(parts)


def sequence_labels(shape_sequence: str) -> List[str]:
    if not shape_sequence:
        return []
    return [match.group(1) for match in SHAPE_TOKEN_RE.finditer(shape_sequence)]


def _levenshtein(a: List[str], b: List[str]) -> int:
    if not a:
        return len(b)
    if not b:
        return len(a)
    rows = len(a) + 1
    cols = len(b) + 1
    dp = [[0] * cols for _ in range(rows)]
    for i in range(rows):
        dp[i][0] = i
    for j in range(cols):
        dp[0][j] = j
    for i in range(1, rows):
        for j in range(1, cols):
            cost = 0 if a[i - 1] == b[j - 1] else 1
            dp[i][j] = min(
                dp[i - 1][j] + 1,
                dp[i][j - 1] + 1,
                dp[i - 1][j - 1] + cost,
            )
    return dp[-1][-1]


def sequence_similarity(seq_a: str, seq_b: str) -> float:
    a = sequence_labels(seq_a)
    b = sequence_labels(seq_b)
    if not a and not b:
        return 1.0
    if not a or not b:
        return 0.0
    distance = _levenshtein(a, b)
    denom = max(len(a), len(b))
    return max(0.0, 1.0 - (distance / denom))


def find_top_lip_matches(
    current_sequence: str,
    signatures: Iterable[LipSignature],
    top_k: int = 3,
) -> List[LipMatch]:
    if not current_sequence:
        return []
    scored: List[LipMatch] = []
    for sig in signatures:
        sim = sequence_similarity(current_sequence, sig.shape_sequence)
        scored.append(LipMatch(phrase_text=sig.phrase_text, similarity=sim))
    scored.sort(key=lambda row: row.similarity, reverse=True)
    return scored[:top_k]
