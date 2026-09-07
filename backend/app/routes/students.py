from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
from ..extensions import db
from ..models import Student, User
from ..middleware.auth import faculty_required

students_bp = Blueprint("students", __name__)


@students_bp.route("", methods=["GET"])
@jwt_required()
def list_students():
    page = request.args.get("page", 1, type=int)
    per_page = request.args.get("per_page", 20, type=int)
    search = request.args.get("search", "")
    dept_id = request.args.get("department_id", type=int)
    year_id = request.args.get("year_of_study_id", type=int)
    section_id = request.args.get("section_id", type=int)
    acad_id = request.args.get("academic_year_id", type=int)

    q = Student.query.join(User)
    if search:
        q = q.filter(
            db.or_(
                User.name.ilike(f"%{search}%"),
                Student.register_number.ilike(f"%{search}%"),
                User.email.ilike(f"%{search}%"),
            )
        )
    if dept_id:
        q = q.filter(Student.department_id == dept_id)
    if year_id:
        q = q.filter(Student.year_of_study_id == year_id)
    if section_id:
        q = q.filter(Student.section_id == section_id)
    if acad_id:
        q = q.filter(Student.academic_year_id == acad_id)

    paginated = q.paginate(page=page, per_page=per_page, error_out=False)
    return jsonify({
        "students": [s.to_dict() for s in paginated.items],
        "total": paginated.total,
        "page": page,
        "pages": paginated.pages,
    }), 200


@students_bp.route("/<int:sid>", methods=["GET"])
@jwt_required()
def get_student(sid):
    s = Student.query.get_or_404(sid)
    return jsonify(s.to_dict()), 200


@students_bp.route("", methods=["POST"])
@jwt_required()
@faculty_required
def create_student():
    data = request.get_json()
    required = ["name", "email", "password", "register_number"]
    if not all(data.get(k) for k in required):
        return jsonify({"error": "name, email, password, register_number required"}), 400

    email = data["email"].strip().lower()
    if User.query.filter_by(email=email).first():
        return jsonify({"error": "Email already exists"}), 409
    if Student.query.filter_by(register_number=data["register_number"]).first():
        return jsonify({"error": "Register number already exists"}), 409

    user = User(name=data["name"].strip(), email=email, role="student")
    user.set_password(data["password"])
    db.session.add(user)
    db.session.flush()

    student = Student(
        user_id=user.id,
        register_number=data["register_number"].strip(),
        department_id=data.get("department_id"),
        academic_year_id=data.get("academic_year_id"),
        year_of_study_id=data.get("year_of_study_id"),
        section_id=data.get("section_id"),
    )
    db.session.add(student)
    db.session.commit()
    return jsonify(student.to_dict()), 201


@students_bp.route("/<int:sid>", methods=["PUT"])
@jwt_required()
@faculty_required
def update_student(sid):
    student = Student.query.get_or_404(sid)
    data = request.get_json()
    user = student.user
    if data.get("name"):
        user.name = data["name"].strip()
    if data.get("email"):
        user.email = data["email"].strip().lower()
    for field in ["department_id", "academic_year_id", "year_of_study_id", "section_id", "register_number"]:
        if field in data:
            setattr(student, field, data[field])
    db.session.commit()
    return jsonify(student.to_dict()), 200


@students_bp.route("/<int:sid>", methods=["DELETE"])
@jwt_required()
@faculty_required
def delete_student(sid):
    student = Student.query.get_or_404(sid)
    user = student.user
    db.session.delete(student)
    db.session.delete(user)
    db.session.commit()
    return jsonify({"message": "Deleted"}), 200
