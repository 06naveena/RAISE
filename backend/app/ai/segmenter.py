"""
Question-Answer segmentation module.
Identifies question-answer pairs from extracted text.
"""
import re
import logging

logger = logging.getLogger(__name__)

# Patterns that indicate a question start
QUESTION_PATTERNS = [
    r"^(?:Q|Question|Ques|Q\.)\s*(\d+)[.:\-\)]\s*(.+)",  # Q1. / Question 1: / Ques.1 -
    r"^(\d+)[.:\-\)]\s+(.+)",                             # 1. / 1: / 1)
    r"^\((\d+)\)\s*(.+)",                                  # (1)
    r"^(?:Answer|Ans|A)\s*(\d+)[.:\-\)]\s*(.+)",          # Ans 1:
]

ANSWER_PATTERNS = [
    r"^(?:Answer|Ans|A)[.:\-\)]\s*(.+)",
    r"^(?:Answer|Ans|A)\s*(\d+)[.:\-\)]\s*(.+)",
    r"^Solution[.:\-\)]\s*(.+)",
]


def segment_answers(text: str, num_questions: int) -> list:
    """
    Segment extracted text into question-answer pairs.

    Returns:
        List of dicts: [{question_number, extracted_text, confidence}, ...]
    """
    lines = [l.rstrip() for l in text.split("\n") if l.strip()]

    # Strategy 1: Detect numbered question markers
    segments = _detect_question_sections(lines, num_questions)

    if segments and len(segments) >= max(1, num_questions // 2):
        logger.info(f"Segmented {len(segments)} answers via question markers")
        return segments

    # Strategy 2: Split by common answer separators
    segments = _split_by_separators(text, num_questions)
    if segments:
        logger.info(f"Segmented {len(segments)} answers via separators")
        return segments

    # Strategy 3: Treat entire text as answer to Q1 (fallback)
    logger.warning("Could not segment answers; treating full text as single answer")
    return [{
        "question_number": 1,
        "extracted_text": text.strip(),
        "confidence": 0.3,
        "needs_review": True,
    }]


def _detect_question_sections(lines: list, num_questions: int) -> list:
    """
    Find positions where each question/answer starts and collect text between.
    """
    # Find lines that start a question section
    section_starts = []
    for i, line in enumerate(lines):
        for pat in QUESTION_PATTERNS:
            m = re.match(pat, line.strip(), re.IGNORECASE)
            if m:
                try:
                    q_num = int(m.group(1))
                except (IndexError, ValueError):
                    continue
                if 1 <= q_num <= max(num_questions + 2, 20):
                    section_starts.append((i, q_num))
                    break

    if not section_starts:
        return []

    # Deduplicate
    seen = set()
    unique_starts = []
    for (idx, q_num) in section_starts:
        if q_num not in seen:
            seen.add(q_num)
            unique_starts.append((idx, q_num))

    # Extract text blocks
    results = []
    for pos, (line_idx, q_num) in enumerate(unique_starts):
        start = line_idx
        end = unique_starts[pos + 1][0] if pos + 1 < len(unique_starts) else len(lines)
        block = "\n".join(lines[start:end]).strip()
        # Remove the question line itself from the answer
        block_lines = block.split("\n")
        answer_lines = block_lines[1:] if len(block_lines) > 1 else block_lines

        results.append({
            "question_number": q_num,
            "extracted_text": "\n".join(answer_lines).strip(),
            "confidence": 0.85,
            "needs_review": False,
        })

    return results


def _split_by_separators(text: str, num_questions: int) -> list:
    """Split text by common separators like blank lines or dashes."""
    # Try splitting by double newlines
    parts = [p.strip() for p in re.split(r"\n{3,}", text) if p.strip()]
    if len(parts) >= num_questions:
        return [
            {
                "question_number": i + 1,
                "extracted_text": parts[i],
                "confidence": 0.5,
                "needs_review": True,
            }
            for i in range(min(len(parts), num_questions))
        ]
    return []
