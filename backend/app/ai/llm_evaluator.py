"""
LLM-based rubric evaluation service.
Supports: openai | anthropic | mock (fallback)
"""
import json
import logging
from flask import current_app

logger = logging.getLogger(__name__)

EVALUATION_PROMPT = """You are an academic assessment assistant evaluating a student's answer.

Evaluate ONLY based on the instructor-provided question, reference answer, expected concepts, keywords, and rubric.

Do NOT award marks merely because the answer contains keywords.
Consider semantically equivalent wording as correct when the underlying concept is demonstrated.
Do NOT introduce concepts not required by the instructor.

Question: {question}
Reference Answer: {reference_answer}
Expected Concepts: {concepts}
Important Keywords: {keywords}
Semantic Similarity Score: {similarity:.2f} (0=unrelated, 1=identical)
Matched Concepts: {matched_concepts}
Missing Concepts: {missing_concepts}

Student Answer: {student_answer}

Rubric to evaluate: {rubric_name}
Rubric Description: {rubric_description}
Maximum Marks: {max_marks}

Instructions:
- Assign marks between 0 and {max_marks}
- Explain WHY the marks were awarded (cite specific parts of the student answer)
- List correctly covered concepts
- List missing concepts
- List factual or logical errors found
- Provide constructive feedback for improvement

Return ONLY valid JSON in this exact format:
{{
  "rubric_name": "{rubric_name}",
  "maximum_marks": {max_marks},
  "marks_awarded": <number 0-{max_marks}>,
  "justification": "<detailed explanation>",
  "identified_concepts": ["<concept>", ...],
  "missing_concepts": ["<concept>", ...],
  "errors": ["<error>", ...],
  "feedback": "<constructive feedback>"
}}"""


def evaluate_rubric(
    question: str,
    reference_answer: str,
    student_answer: str,
    concepts: list,
    keywords: list,
    rubric_name: str,
    rubric_description: str,
    max_marks: float,
    similarity: float,
    matched_concepts: list,
    missing_concepts: list,
) -> dict:
    """Evaluate a single rubric. Returns structured dict."""

    prompt = EVALUATION_PROMPT.format(
        question=question,
        reference_answer=reference_answer,
        student_answer=student_answer,
        concepts=", ".join(concepts) if concepts else "Not specified",
        keywords=", ".join(keywords) if keywords else "Not specified",
        similarity=similarity,
        matched_concepts=", ".join(matched_concepts) if matched_concepts else "None",
        missing_concepts=", ".join(missing_concepts) if missing_concepts else "None",
        rubric_name=rubric_name,
        rubric_description=rubric_description or rubric_name,
        max_marks=max_marks,
    )

    try:
        provider = current_app.config.get("LLM_PROVIDER", "mock")
    except RuntimeError:
        provider = "mock"

    raw = None
    if provider == "openai":
        raw = _call_openai(prompt)
    elif provider == "anthropic":
        raw = _call_anthropic(prompt)
    else:
        raw = None  # Fall through to mock

    if raw:
        result = _parse_and_validate(raw, rubric_name, max_marks)
        if result:
            return result

    # Fallback: mock evaluation using similarity
    return _mock_evaluate(
        rubric_name, max_marks, similarity, matched_concepts, missing_concepts, student_answer
    )


def _call_openai(prompt: str) -> str | None:
    try:
        from openai import OpenAI
        client = OpenAI(api_key=current_app.config.get("OPENAI_API_KEY"))
        model = current_app.config.get("LLM_MODEL", "gpt-4o")
        response = client.chat.completions.create(
            model=model,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.2,
            max_tokens=1000,
            response_format={"type": "json_object"},
        )
        return response.choices[0].message.content
    except Exception as e:
        logger.error(f"OpenAI call failed: {e}")
        return None


def _call_anthropic(prompt: str) -> str | None:
    try:
        import anthropic
        client = anthropic.Anthropic(api_key=current_app.config.get("ANTHROPIC_API_KEY"))
        message = client.messages.create(
            model="claude-3-haiku-20240307",
            max_tokens=1000,
            messages=[{"role": "user", "content": prompt}],
        )
        return message.content[0].text
    except Exception as e:
        logger.error(f"Anthropic call failed: {e}")
        return None


def _parse_and_validate(raw: str, rubric_name: str, max_marks: float) -> dict | None:
    """Parse LLM JSON output and validate schema/marks."""
    try:
        # Extract JSON block if surrounded by other text
        import re
        json_match = re.search(r"\{.*\}", raw, re.DOTALL)
        if not json_match:
            return None
        data = json.loads(json_match.group())

        required = ["marks_awarded", "justification", "identified_concepts",
                    "missing_concepts", "errors", "feedback"]
        if not all(k in data for k in required):
            logger.warning(f"LLM response missing required keys: {data.keys()}")
            return None

        # Clamp marks
        marks = float(data["marks_awarded"])
        marks = max(0.0, min(marks, max_marks))
        data["marks_awarded"] = marks
        data["maximum_marks"] = max_marks
        data["rubric_name"] = rubric_name

        # Ensure lists
        for k in ["identified_concepts", "missing_concepts", "errors"]:
            if not isinstance(data[k], list):
                data[k] = []

        return data
    except Exception as e:
        logger.error(f"Failed to parse LLM output: {e}\nRaw: {raw[:500]}")
        return None


def _mock_evaluate(
    rubric_name: str,
    max_marks: float,
    similarity: float,
    matched_concepts: list,
    missing_concepts: list,
    student_answer: str,
) -> dict:
    """
    Rule-based mock evaluation using semantic similarity + concept matching.
    Used when no LLM API is configured.
    """
    # Base score from semantic similarity
    base_ratio = similarity * 0.7  # similarity contributes 70%

    # Concept match bonus
    total_concepts = len(matched_concepts) + len(missing_concepts)
    if total_concepts > 0:
        concept_ratio = len(matched_concepts) / total_concepts
    else:
        concept_ratio = 0.5

    # Combined score
    score_ratio = base_ratio + concept_ratio * 0.3
    score_ratio = max(0.0, min(score_ratio, 1.0))
    marks = round(score_ratio * max_marks, 1)

    # Generate feedback
    if similarity >= 0.8:
        quality = "excellent"
    elif similarity >= 0.6:
        quality = "good"
    elif similarity >= 0.4:
        quality = "satisfactory"
    else:
        quality = "needs improvement"

    feedback = (
        f"The answer shows {quality} understanding with a semantic similarity of {similarity:.0%}. "
        f"{len(matched_concepts)} out of {total_concepts} expected concepts were covered. "
    )
    if missing_concepts:
        feedback += f"Missing concepts: {', '.join(missing_concepts[:3])}. "

    errors = []
    if not student_answer or len(student_answer.strip()) < 20:
        errors.append("Answer appears incomplete or very brief")
    if similarity < 0.2:
        errors.append("Answer may not address the question correctly")

    return {
        "rubric_name": rubric_name,
        "maximum_marks": max_marks,
        "marks_awarded": marks,
        "justification": (
            f"[Mock Evaluation] Semantic similarity: {similarity:.2f}. "
            f"Concept coverage: {len(matched_concepts)}/{total_concepts}. "
            f"Computed score: {score_ratio:.2f} × {max_marks} = {marks}."
        ),
        "identified_concepts": matched_concepts,
        "missing_concepts": missing_concepts,
        "errors": errors,
        "feedback": feedback,
    }
