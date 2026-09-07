from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
from ..extensions import db
from ..models import AcademicYear, YearOfStudy, Section
from ..middleware.auth import faculty_required

academic_bp = Blueprint("academic", __name__)

# ─── Academic Years ───────────────────────────────────────────────────────────

@academic_bp.route("/academic-years", methods=["GET"])
@jwt_required()
def list_academic_years():
    years = AcademicYear.query.order_by(AcademicYear.year_name).all()
    return jsonify([y.to_dict() for y in years]), 200


@academic_bp.route("/academic-years", methods=["POST"])
@jwt_required()
@faculty_required
def create_academic_year():
    data = request.get_json()
    if not data.get("year_name"):
        return jsonify({"error": "year_name required"}), 400
    if AcademicYear.query.filter_by(year_name=data["year_name"]).first():
        return jsonify({"error": "Academic year already exists"}), 409
    y = AcademicYear(year_name=data["year_name"].strip())
    db.session.add(y)
    db.session.commit()
    return jsonify(y.to_dict()), 201


@academic_bp.route("/academic-years/<int:yid>", methods=["PUT"])
@jwt_required()
@faculty_required
def update_academic_year(yid):
    y = AcademicYear.query.get_or_404(yid)
    data = request.get_json()
    if data.get("year_name"):
        y.year_name = data["year_name"].strip()
    db.session.commit()
    return jsonify(y.to_dict()), 200


@academic_bp.route("/academic-years/<int:yid>", methods=["DELETE"])
@jwt_required()
@faculty_required
def delete_academic_year(yid):
    y = AcademicYear.query.get_or_404(yid)
    db.session.delete(y)
    db.session.commit()
    return jsonify({"message": "Deleted"}), 200

# ─── Years of Study ───────────────────────────────────────────────────────────

@academic_bp.route("/years-of-study", methods=["GET"])
@jwt_required()
def list_years_of_study():
    years = YearOfStudy.query.order_by(YearOfStudy.year_number).all()
    return jsonify([y.to_dict() for y in years]), 200


@academic_bp.route("/years-of-study", methods=["POST"])
@jwt_required()
@faculty_required
def create_year_of_study():
    data = request.get_json()
    if not data.get("year_number") or not data.get("label"):
        return jsonify({"error": "year_number and label required"}), 400
    y = YearOfStudy(year_number=data["year_number"], label=data["label"].strip())
    db.session.add(y)
    db.session.commit()
    return jsonify(y.to_dict()), 201


@academic_bp.route("/years-of-study/<int:yid>", methods=["PUT"])
@jwt_required()
@faculty_required
def update_year_of_study(yid):
    y = YearOfStudy.query.get_or_404(yid)
    data = request.get_json()
    if data.get("year_number"):
        y.year_number = data["year_number"]
    if data.get("label"):
        y.label = data["label"].strip()
    db.session.commit()
    return jsonify(y.to_dict()), 200


@academic_bp.route("/years-of-study/<int:yid>", methods=["DELETE"])
@jwt_required()
@faculty_required
def delete_year_of_study(yid):
    y = YearOfStudy.query.get_or_404(yid)
    db.session.delete(y)
    db.session.commit()
    return jsonify({"message": "Deleted"}), 200

# ─── Sections ─────────────────────────────────────────────────────────────────

@academic_bp.route("/sections", methods=["GET"])
@jwt_required()
def list_sections():
    secs = Section.query.order_by(Section.name).all()
    return jsonify([s.to_dict() for s in secs]), 200


@academic_bp.route("/sections", methods=["POST"])
@jwt_required()
@faculty_required
def create_section():
    data = request.get_json()
    if not data.get("name"):
        return jsonify({"error": "name required"}), 400
    s = Section(name=data["name"].strip().upper())
    db.session.add(s)
    db.session.commit()
    return jsonify(s.to_dict()), 201


@academic_bp.route("/sections/<int:sid>", methods=["PUT"])
@jwt_required()
@faculty_required
def update_section(sid):
    s = Section.query.get_or_404(sid)
    data = request.get_json()
    if data.get("name"):
        s.name = data["name"].strip().upper()
    db.session.commit()
    return jsonify(s.to_dict()), 200


@academic_bp.route("/sections/<int:sid>", methods=["DELETE"])
@jwt_required()
@faculty_required
def delete_section(sid):
    s = Section.query.get_or_404(sid)
    db.session.delete(s)
    db.session.commit()
    return jsonify({"message": "Deleted"}), 200
