from flask import Blueprint, request, jsonify
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity
from ..extensions import db
from ..models import User, Faculty, Student, Department, AcademicYear, YearOfStudy, Section

auth_bp = Blueprint("auth", __name__)


@auth_bp.route("/login", methods=["POST"])
def login():
    data = request.get_json()
    if not data or not data.get("email") or not data.get("password"):
        return jsonify({"error": "Email and password required"}), 400

    user = User.query.filter_by(email=data["email"].strip().lower()).first()
    if not user or not user.check_password(data["password"]):
        return jsonify({"error": "Invalid credentials"}), 401

    # Build profile
    profile = None
    if user.role == "faculty" and user.faculty_profile:
        profile = user.faculty_profile.to_dict()
    elif user.role == "student" and user.student_profile:
        profile = user.student_profile.to_dict()

    token = create_access_token(identity=str(user.id))
    return jsonify({
        "access_token": token,
        "user": user.to_dict(),
        "profile": profile,
    }), 200


@auth_bp.route("/register", methods=["POST"])
def register():
    data = request.get_json()
    required = ["name", "email", "password", "register_number"]
    if not all(data.get(k) for k in required):
        return jsonify({"error": "All fields required"}), 400

    email = data["email"].strip().lower()
    if User.query.filter_by(email=email).first():
        return jsonify({"error": "Email already registered"}), 409
    if Student.query.filter_by(register_number=data["register_number"]).first():
        return jsonify({"error": "Register number already exists"}), 409

    user = User(name=data["name"].strip(), email=email, role="student")
    user.set_password(data["password"])
    db.session.add(user)
    db.session.flush()

    student = Student(
        user_id=user.id,
        register_number=data["register_number"].strip(),
        department_id=int(data["department_id"]) if data.get("department_id") else None,
        academic_year_id=int(data["academic_year_id"]) if data.get("academic_year_id") else None,
        year_of_study_id=int(data["year_of_study_id"]) if data.get("year_of_study_id") else None,
        section_id=int(data["section_id"]) if data.get("section_id") else None,
    )
    db.session.add(student)
    db.session.commit()

    token = create_access_token(identity=str(user.id))
    return jsonify({
        "access_token": token,
        "user": user.to_dict(),
        "profile": student.to_dict(),
    }), 201


@auth_bp.route("/me", methods=["GET"])
@jwt_required()
def me():
    user_id = int(get_jwt_identity())
    user = User.query.get_or_404(user_id)
    profile = None
    if user.role == "faculty" and user.faculty_profile:
        profile = user.faculty_profile.to_dict()
    elif user.role == "student" and user.student_profile:
        profile = user.student_profile.to_dict()
    return jsonify({"user": user.to_dict(), "profile": profile}), 200


@auth_bp.route("/change-password", methods=["POST"])
@jwt_required()
def change_password():
    user_id = int(get_jwt_identity())
    user = User.query.get_or_404(user_id)
    data = request.get_json()
    if not user.check_password(data.get("current_password", "")):
        return jsonify({"error": "Current password incorrect"}), 400
    user.set_password(data["new_password"])
    db.session.commit()
    return jsonify({"message": "Password changed"}), 200
