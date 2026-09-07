from datetime import datetime, timezone
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from ..extensions import db
from ..models import Assignment, Question, Concept, Keyword, Rubric, Subject, Student, User
from ..middleware.auth import faculty_required

assignments_bp = Blueprint("assignments", __name__)


@assignments_bp.route("", methods=["GET"])
@jwt_required()
def list_assignments():
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)

    if user.role == "faculty":
        assignments = Assignment.query.order_by(Assignment.created_at.desc()).all()
    else:
        # Student: get assignments for their subject/section/year
        student = user.student_profile
        assignments = Assignment.query.filter(
            db.or_(
                db.and_(
                    Assignment.department_id == student.department_id,
                    Assignment.academic_year_id == student.academic_year_id,
                    Assignment.year_of_study_id == student.year_of_study_id,
                    Assignment.section_id == student.section_id,
                ),
                Assignment.department_id.is_(None)
            ),
            Assignment.status == "published"
        ).order_by(Assignment.created_at.desc()).all()

    return jsonify([a.to_dict() for a in assignments]), 200


@assignments_bp.route("/<int:aid>", methods=["GET"])
@jwt_required()
def get_assignment(aid):
    a = Assignment.query.get_or_404(aid)
    return jsonify(a.to_dict(include_questions=True, include_rubrics=True)), 200


@assignments_bp.route("", methods=["POST"])
@jwt_required()
@faculty_required
def create_assignment():
    data = request.get_json()
    if not data.get("title") or not data.get("subject_id"):
        return jsonify({"error": "title and subject_id required"}), 400

    deadline = None
    if data.get("deadline"):
        try:
            deadline = datetime.fromisoformat(data["deadline"])
        except ValueError:
            return jsonify({"error": "Invalid deadline format"}), 400

    a = Assignment(
        title=data["title"].strip(),
        description=data.get("description", ""),
        subject_id=data["subject_id"],
        department_id=data.get("department_id"),
        academic_year_id=data.get("academic_year_id"),
        year_of_study_id=data.get("year_of_study_id"),
        section_id=data.get("section_id"),
        maximum_marks=data.get("maximum_marks", 100),
        deadline=deadline,
        status=data.get("status", "draft"),
        allow_late=data.get("allow_late", False),
    )
    db.session.add(a)
    db.session.commit()
    return jsonify(a.to_dict()), 201


@assignments_bp.route("/<int:aid>", methods=["PUT"])
@jwt_required()
@faculty_required
def update_assignment(aid):
    a = Assignment.query.get_or_404(aid)
    data = request.get_json()
    for field in ["title", "description", "maximum_marks", "status", "allow_late",
                  "department_id", "academic_year_id", "year_of_study_id", "section_id", "subject_id"]:
        if field in data:
            setattr(a, field, data[field])
    if "deadline" in data and data["deadline"]:
        a.deadline = datetime.fromisoformat(data["deadline"])
    db.session.commit()
    return jsonify(a.to_dict(include_questions=True, include_rubrics=True)), 200


@assignments_bp.route("/<int:aid>", methods=["DELETE"])
@jwt_required()
@faculty_required
def delete_assignment(aid):
    a = Assignment.query.get_or_404(aid)
    db.session.delete(a)
    db.session.commit()
    return jsonify({"message": "Deleted"}), 200


# ─── Questions ────────────────────────────────────────────────────────────────

@assignments_bp.route("/<int:aid>/questions", methods=["POST"])
@jwt_required()
@faculty_required
def add_questions(aid):
    a = Assignment.query.get_or_404(aid)
    data = request.get_json()
    questions = data.get("questions", [])

    # Clear existing
    for q in a.questions:
        db.session.delete(q)
    db.session.flush()

    for q_data in questions:
        q = Question(
            assignment_id=a.id,
            question_number=q_data.get("question_number", 1),
            question_text=q_data.get("question_text", ""),
            maximum_marks=q_data.get("maximum_marks", 0),
            reference_answer=q_data.get("reference_answer", ""),
        )
        db.session.add(q)
        db.session.flush()

        for c in q_data.get("concepts", []):
            if c.strip():
                db.session.add(Concept(question_id=q.id, concept_text=c.strip()))
        for k in q_data.get("keywords", []):
            if k.strip():
                db.session.add(Keyword(question_id=q.id, keyword=k.strip()))

    db.session.commit()
    return jsonify({"message": "Questions saved", "count": len(questions)}), 201


# ─── Rubrics ──────────────────────────────────────────────────────────────────

@assignments_bp.route("/<int:aid>/rubrics", methods=["POST"])
@jwt_required()
@faculty_required
def add_rubrics(aid):
    a = Assignment.query.get_or_404(aid)
    data = request.get_json()
    rubrics = data.get("rubrics", [])

    # Validate total marks
    total = sum(r.get("maximum_marks", 0) for r in rubrics)
    if abs(total - a.maximum_marks) > 0.01:
        return jsonify({"error": f"Rubric marks ({total}) must equal assignment maximum marks ({a.maximum_marks})"}), 400

    for r in a.rubrics:
        db.session.delete(r)
    db.session.flush()

    for i, r_data in enumerate(rubrics):
        r = Rubric(
            assignment_id=a.id,
            rubric_name=r_data.get("rubric_name", "").strip(),
            description=r_data.get("description", ""),
            maximum_marks=r_data.get("maximum_marks", 0),
            order=i,
        )
        db.session.add(r)

    db.session.commit()
    return jsonify({"message": "Rubrics saved", "count": len(rubrics)}), 201


@assignments_bp.route("/<int:aid>/publish", methods=["POST"])
@jwt_required()
@faculty_required
def publish_assignment(aid):
    a = Assignment.query.get_or_404(aid)
    if not a.rubrics:
        return jsonify({"error": "Add rubrics before publishing"}), 400
    if not a.questions:
        return jsonify({"error": "Add questions before publishing"}), 400
    a.status = "published"
    db.session.commit()
    return jsonify(a.to_dict()), 200
