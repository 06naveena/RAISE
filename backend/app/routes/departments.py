from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
from ..extensions import db
from ..models import Department
from ..middleware.auth import faculty_required

dept_bp = Blueprint("departments", __name__)


@dept_bp.route("", methods=["GET"])
@jwt_required()
def list_departments():
    depts = Department.query.order_by(Department.name).all()
    return jsonify([d.to_dict() for d in depts]), 200


@dept_bp.route("", methods=["POST"])
@jwt_required()
@faculty_required
def create_department():
    data = request.get_json()
    if not data.get("name") or not data.get("code"):
        return jsonify({"error": "Name and code required"}), 400
    if Department.query.filter_by(code=data["code"].upper()).first():
        return jsonify({"error": "Department code already exists"}), 409
    dept = Department(name=data["name"].strip(), code=data["code"].upper().strip())
    db.session.add(dept)
    db.session.commit()
    return jsonify(dept.to_dict()), 201


@dept_bp.route("/<int:dept_id>", methods=["PUT"])
@jwt_required()
@faculty_required
def update_department(dept_id):
    dept = Department.query.get_or_404(dept_id)
    data = request.get_json()
    if data.get("name"):
        dept.name = data["name"].strip()
    if data.get("code"):
        dept.code = data["code"].upper().strip()
    db.session.commit()
    return jsonify(dept.to_dict()), 200


@dept_bp.route("/<int:dept_id>", methods=["DELETE"])
@jwt_required()
@faculty_required
def delete_department(dept_id):
    dept = Department.query.get_or_404(dept_id)
    db.session.delete(dept)
    db.session.commit()
    return jsonify({"message": "Deleted"}), 200
