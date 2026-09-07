"""
Main evaluation orchestrator.
Wires together: text extraction → segmentation → semantic → LLM → DB save
"""
import logging
from datetime import datetime, timezone

logger = logging.getLogger(__name__)


def evaluate_submission(submission_id: int):
    """
    Full evaluation pipeline for a submission.
    Called in a background thread.
    """
    from ..extensions import db
    from ..models import (Submission, ExtractedAnswer, Evaluation,
                          Question, Rubric, Concept, Keyword)
    from .text_extractor import extract_text
    from .segmenter import segment_answers
    from .semantic import compute_similarity, match_concepts, match_keywords
    from .llm_evaluator import evaluate_rubric

    try:
        sub = Submission.query.get(submission_id)
        if not sub:
            logger.error(f"Submission {submission_id} not found")
            return

        assignment = sub.assignment
        if not assignment:
            _fail(sub, "Assignment not found")
            return

        # ── Step 1: Extract text ─────────────────────────────────────────────
        sub.status = "processing"
        db.session.commit()

        extract_result = extract_text(sub.file_path)
        if extract_result["error"] and not extract_result["text"]:
            _fail(sub, f"Text extraction failed: {extract_result['error']}")
            return

        full_text = extract_result["text"]
        sub.is_scanned = extract_result["is_scanned"]
        sub.ocr_confidence = extract_result["ocr_confidence"]

        if extract_result["is_scanned"]:
            sub.status = "ocr_processing"
            db.session.commit()

        # ── Step 2: Segment answers ──────────────────────────────────────────
        questions = assignment.questions
        num_q = len(questions)
        segments = segment_answers(full_text, num_q)

        # Build lookup: question_number → segment text
        seg_map = {s["question_number"]: s for s in segments}

        # Clear old extracted answers
        for ea in sub.extracted_answers:
            db.session.delete(ea)
        db.session.flush()

        # Save extracted answers
        for q in questions:
            seg = seg_map.get(q.question_number, None)
            ea = ExtractedAnswer(
                submission_id=sub.id,
                question_id=q.id,
                question_number=q.question_number,
                extracted_text=seg["extracted_text"] if seg else full_text,
                segmentation_confidence=seg["confidence"] if seg else 0.3,
                needs_review=seg.get("needs_review", True) if seg else True,
            )
            db.session.add(ea)
        db.session.commit()

        # ── Step 3: AI Evaluation ─────────────────────────────────────────────
        sub.status = "ai_evaluating"
        db.session.commit()

        rubrics = assignment.rubrics
        if not rubrics:
            _fail(sub, "No rubrics defined")
            return

        # Clear old evaluations
        for ev in sub.evaluations:
            db.session.delete(ev)
        db.session.flush()

        assignment_max = assignment.maximum_marks
        total_ai_marks = 0.0

        for q in questions:
            seg = seg_map.get(q.question_number)
            student_answer = seg["extracted_text"] if seg else full_text
            reference_answer = q.reference_answer or ""
            concepts = [c.concept_text for c in q.concepts]
            keywords = [k.keyword for k in q.keywords]

            # Semantic similarity
            sim = compute_similarity(student_answer, reference_answer)
            matched_c, missing_c = match_concepts(student_answer, concepts)
            matched_k, missing_k = match_keywords(student_answer, keywords)

            # Evaluate each rubric
            for rubric in rubrics:
                try:
                    result = evaluate_rubric(
                        question=q.question_text,
                        reference_answer=reference_answer,
                        student_answer=student_answer,
                        concepts=concepts,
                        keywords=keywords,
                        rubric_name=rubric.rubric_name,
                        rubric_description=rubric.description or "",
                        max_marks=rubric.maximum_marks,
                        similarity=sim,
                        matched_concepts=matched_c,
                        missing_concepts=missing_c,
                    )
                except Exception as e:
                    logger.error(f"LLM evaluation failed for rubric {rubric.id}: {e}")
                    result = {
                        "rubric_name": rubric.rubric_name,
                        "maximum_marks": rubric.maximum_marks,
                        "marks_awarded": 0,
                        "justification": f"Evaluation failed: {e}",
                        "identified_concepts": [],
                        "missing_concepts": concepts,
                        "errors": [str(e)],
                        "feedback": "Evaluation failed. Please review manually.",
                    }

                # Clamp to rubric max
                marks = min(float(result.get("marks_awarded", 0)), rubric.maximum_marks)

                ev = Evaluation(
                    submission_id=sub.id,
                    question_id=q.id,
                    rubric_id=rubric.id,
                    ai_marks=marks,
                    faculty_marks=None,
                    justification=result.get("justification", ""),
                    feedback=result.get("feedback", ""),
                    evaluation_status="pending",
                    semantic_similarity=sim,
                )
                ev.identified_concepts = result.get("identified_concepts", [])
                ev.missing_concepts = result.get("missing_concepts", [])
                ev.errors = result.get("errors", [])
                db.session.add(ev)
                total_ai_marks += marks

        # Clamp total to assignment max
        # (per-rubric marks already clamped; this is a final safety check)
        # For per-question assignments with multiple rubrics, total may exceed max.
        # If so, proportionally scale down.
        rubric_total = sum(r.maximum_marks for r in rubrics)
        if total_ai_marks > assignment_max:
            scale = assignment_max / total_ai_marks
            # Re-scale (simplified — faculty will review anyway)
            for ev in sub.evaluations:
                if ev.ai_marks:
                    ev.ai_marks = round(ev.ai_marks * scale, 1)
            total_ai_marks = assignment_max

        sub.status = "pending_review"
        db.session.commit()
        logger.info(f"Evaluation complete for submission {submission_id}. AI marks: {total_ai_marks}")

    except Exception as e:
        logger.error(f"Evaluation pipeline error for submission {submission_id}: {e}", exc_info=True)
        try:
            sub = Submission.query.get(submission_id)
            if sub:
                _fail(sub, str(e))
        except Exception:
            pass


def _fail(sub, reason: str):
    from ..extensions import db
    sub.status = "evaluation_failed"
    db.session.commit()
    logger.error(f"Submission {sub.id} evaluation failed: {reason}")
