import threading
from datetime import datetime, timezone
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from ..extensions import db
from ..models import (Submission, Evaluation, FinalResult, Assignment,
                      Question, Rubric, AuditLog, User)
from ..middleware.auth import faculty_required

evaluations_bp = Blueprint("evaluations", __name__)


def _run_evaluation(app, submission_id):
    """Run AI evaluation in a background thread."""
    with app.app_context():
        from ..ai.evaluator import evaluate_submission
        evaluate_submission(submission_id)


@evaluations_bp.route("/<int:sub_id>/start", methods=["POST"])
@jwt_required()
@faculty_required
def start_evaluation(sub_id):
    from flask import current_app
    sub = Submission.query.get_or_404(sub_id)
    if sub.status in ("processing", "ai_evaluating"):
        return jsonify({"error": "Evaluation already in progress"}), 409

    sub.status = "processing"
    db.session.commit()

    app = current_app._get_current_object()
    t = threading.Thread(target=_run_evaluation, args=(app, sub_id), daemon=True)
    t.start()

    return jsonify({"message": "Evaluation started", "submission_id": sub_id}), 200


@evaluations_bp.route("/<int:sub_id>", methods=["GET"])
@jwt_required()
def get_evaluation(sub_id):
    sub = Submission.query.get_or_404(sub_id)
    data = sub.to_dict()
    data["extracted_answers"] = [ea.to_dict() for ea in sub.extracted_answers]
    data["evaluations"] = [ev.to_dict() for ev in sub.evaluations]
    if sub.final_result:
        data["final_result"] = sub.final_result.to_dict()

    # Attach question/rubric details
    assignment = sub.assignment
    if assignment:
        data["assignment"] = assignment.to_dict(include_questions=True, include_rubrics=True)

    return jsonify(data), 200


@evaluations_bp.route("/item/<int:eval_id>", methods=["PUT"])
@jwt_required()
@faculty_required
def update_evaluation(eval_id):
    """Faculty modifies AI-generated marks."""
    user_id = int(get_jwt_identity())
    ev = Evaluation.query.get_or_404(eval_id)
    data = request.get_json()

    old_marks = ev.faculty_marks if ev.faculty_marks is not None else ev.ai_marks
    new_marks = data.get("faculty_marks")

    if new_marks is not None:
        # Validate against rubric max
        if ev.rubric and new_marks > ev.rubric.maximum_marks:
            return jsonify({"error": f"Marks cannot exceed rubric maximum ({ev.rubric.maximum_marks})"}), 400
        ev.faculty_marks = float(new_marks)

    if data.get("faculty_comment") is not None:
        ev.faculty_comment = data["faculty_comment"]
    if data.get("feedback") is not None:
        ev.feedback = data["feedback"]

    ev.evaluation_status = "faculty_modified"
    ev.updated_at = datetime.now(timezone.utc)
    db.session.flush()

    # Update submission status
    sub = ev.submission
    sub.status = "faculty_modified"

    # Audit log
    if new_marks is not None and old_marks != new_marks:
        log = AuditLog(
            user_id=user_id,
            action=f"Faculty changed {ev.rubric.rubric_name} marks from {old_marks} to {new_marks}",
            entity_type="evaluation",
            entity_id=eval_id,
            submission_id=ev.submission_id,
            previous_value=str(old_marks),
            new_value=str(new_marks),
            reason=data.get("reason", ""),
        )
        db.session.add(log)

    db.session.commit()
    return jsonify(ev.to_dict()), 200


@evaluations_bp.route("/<int:sub_id>/approve", methods=["POST"])
@jwt_required()
@faculty_required
def approve_evaluation(sub_id):
    user_id = int(get_jwt_identity())
    sub = Submission.query.get_or_404(sub_id)
    data = request.get_json() or {}

    evaluations = sub.evaluations
    if not evaluations:
        return jsonify({"error": "No evaluations found"}), 400

    # Calculate totals
    total_ai = sum(ev.ai_marks or 0 for ev in evaluations)
    # Use faculty marks if set, else AI marks
    total_faculty = sum(
        ev.faculty_marks if ev.faculty_marks is not None else (ev.ai_marks or 0)
        for ev in evaluations
    )

    # Validate against assignment max
    assignment = sub.assignment
    if assignment and total_faculty > assignment.maximum_marks:
        total_faculty = assignment.maximum_marks

    # Create or update FinalResult
    fr = sub.final_result
    if not fr:
        fr = FinalResult(submission_id=sub_id)
        db.session.add(fr)

    fr.total_ai_marks = total_ai
    fr.total_faculty_marks = total_faculty
    fr.faculty_feedback = data.get("faculty_feedback", "")
    fr.approved_by = user_id
    fr.approved_at = datetime.now(timezone.utc)

    # Update all evaluations to approved
    for ev in evaluations:
        ev.evaluation_status = "approved"

    sub.status = "approved"

    log = AuditLog(
        user_id=user_id,
        action=f"Faculty approved evaluation. Final marks: {total_faculty}/{assignment.maximum_marks if assignment else '?'}",
        entity_type="submission",
        entity_id=sub_id,
        submission_id=sub_id,
    )
    db.session.add(log)
    db.session.commit()

    return jsonify({
        "message": "Approved",
        "final_result": fr.to_dict(),
    }), 200


@evaluations_bp.route("/<int:sub_id>/publish", methods=["POST"])
@jwt_required()
@faculty_required
def publish_result(sub_id):
    sub = Submission.query.get_or_404(sub_id)
    if sub.status != "approved":
        return jsonify({"error": "Must be approved before publishing"}), 400
    sub.status = "published"
    db.session.commit()
    return jsonify({"message": "Published"}), 200
