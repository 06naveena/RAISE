from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
from ..extensions import db
from ..models import Subject, Faculty, Department
from ..middleware.auth import faculty_required

subjects_bp = Blueprint("subjects", __name__)


@subjects_bp.route("", methods=["GET"])
@jwt_required()
def list_subjects():
    dept_id = request.args.get("department_id", type=int)
    q = Subject.query
    if dept_id:
        q = q.filter_by(department_id=dept_id)
    subjects = q.order_by(Subject.subject_name).all()
    return jsonify([s.to_dict() for s in subjects]), 200


@subjects_bp.route("", methods=["POST"])
@jwt_required()
@faculty_required
def create_subject():
    data = request.get_json()
    if not data.get("subject_code") or not data.get("subject_name"):
        return jsonify({"error": "subject_code and subject_name required"}), 400
    s = Subject(
        subject_code=data["subject_code"].strip().upper(),
        subject_name=data["subject_name"].strip(),
        department_id=data.get("department_id"),
        faculty_id=data.get("faculty_id"),
    )
    db.session.add(s)
    db.session.commit()
    return jsonify(s.to_dict()), 201


@subjects_bp.route("/<int:sid>", methods=["GET"])
@jwt_required()
def get_subject(sid):
    s = Subject.query.get_or_404(sid)
    return jsonify(s.to_dict()), 200


@subjects_bp.route("/<int:sid>", methods=["PUT"])
@jwt_required()
@faculty_required
def update_subject(sid):
    s = Subject.query.get_or_404(sid)
    data = request.get_json()
    for field in ["subject_code", "subject_name", "department_id", "faculty_id"]:
        if field in data:
            setattr(s, field, data[field])
    db.session.commit()
    return jsonify(s.to_dict()), 200


@subjects_bp.route("/<int:sid>", methods=["DELETE"])
@jwt_required()
@faculty_required
def delete_subject(sid):
    s = Subject.query.get_or_404(sid)
    db.session.delete(s)
    db.session.commit()
    return jsonify({"message": "Deleted"}), 200
