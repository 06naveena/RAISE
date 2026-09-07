import os
from datetime import datetime, timezone
from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity
from werkzeug.utils import secure_filename
from ..extensions import db
from ..models import Submission, Assignment, Student, User
from ..middleware.auth import student_required

submissions_bp = Blueprint("submissions", __name__)

ALLOWED_EXTENSIONS = {"pdf", "docx", "jpg", "jpeg", "png"}


def allowed_file(filename):
    return "." in filename and filename.rsplit(".", 1)[1].lower() in ALLOWED_EXTENSIONS


@submissions_bp.route("", methods=["POST"])
@jwt_required()
def submit_file():
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)

    if user.role != "student":
        return jsonify({"error": "Only students can submit"}), 403

    student = user.student_profile
    if not student:
        return jsonify({"error": "Student profile not found"}), 404

    assignment_id = request.form.get("assignment_id", type=int)
    if not assignment_id:
        return jsonify({"error": "assignment_id required"}), 400

    assignment = Assignment.query.get_or_404(assignment_id)

    # Deadline check
    if assignment.deadline and not assignment.allow_late:
        now = datetime.now(timezone.utc)
        deadline = assignment.deadline
        if deadline.tzinfo is None:
            deadline = deadline.replace(tzinfo=timezone.utc)
        if now > deadline:
            return jsonify({"error": "Submission deadline has passed"}), 403

    # Check existing submission
    existing = Submission.query.filter_by(
        assignment_id=assignment_id, student_id=student.id
    ).first()
    if existing:
        return jsonify({"error": "Already submitted. Contact faculty to resubmit."}), 409

    if "file" not in request.files:
        return jsonify({"error": "No file uploaded"}), 400

    file = request.files["file"]
    if not file or file.filename == "":
        return jsonify({"error": "Empty filename"}), 400
    if not allowed_file(file.filename):
        return jsonify({"error": "File type not allowed. Use PDF, DOCX, JPG, JPEG, or PNG"}), 400

    # Save file
    filename = secure_filename(f"{student.register_number}_{assignment_id}_{file.filename}")
    upload_folder = current_app.config["UPLOAD_FOLDER"]
    os.makedirs(upload_folder, exist_ok=True)
    filepath = os.path.join(upload_folder, filename)
    file.save(filepath)
    file_size = os.path.getsize(filepath)

    submission = Submission(
        assignment_id=assignment_id,
        student_id=student.id,
        file_path=filepath,
        original_filename=file.filename,
        file_size=file_size,
        status="submitted",
    )
    db.session.add(submission)
    db.session.commit()
    return jsonify(submission.to_dict()), 201


@submissions_bp.route("", methods=["GET"])
@jwt_required()
def list_submissions():
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    assignment_id = request.args.get("assignment_id", type=int)

    if user.role == "faculty":
        q = Submission.query
        if assignment_id:
            q = q.filter_by(assignment_id=assignment_id)
        submissions = q.order_by(Submission.submission_date.desc()).all()
    else:
        student = user.student_profile
        q = Submission.query.filter_by(student_id=student.id)
        if assignment_id:
            q = q.filter_by(assignment_id=assignment_id)
        submissions = q.order_by(Submission.submission_date.desc()).all()

    return jsonify([s.to_dict() for s in submissions]), 200


@submissions_bp.route("/<int:sub_id>", methods=["GET"])
@jwt_required()
def get_submission(sub_id):
    sub = Submission.query.get_or_404(sub_id)
    data = sub.to_dict()
    data["extracted_answers"] = [ea.to_dict() for ea in sub.extracted_answers]
    data["evaluations"] = [ev.to_dict() for ev in sub.evaluations]
    if sub.final_result:
        data["final_result"] = sub.final_result.to_dict()
    return jsonify(data), 200
