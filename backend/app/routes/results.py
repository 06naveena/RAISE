import io
from flask import Blueprint, request, jsonify, send_file
from flask_jwt_extended import jwt_required, get_jwt_identity
from ..extensions import db
from ..models import Submission, FinalResult, Student, Assignment, User, Evaluation, Rubric
from ..middleware.auth import faculty_required

results_bp = Blueprint("results", __name__)


@results_bp.route("", methods=["GET"])
@jwt_required()
def list_results():
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)

    page = request.args.get("page", 1, type=int)
    per_page = request.args.get("per_page", 20, type=int)
    assignment_id = request.args.get("assignment_id", type=int)
    dept_id = request.args.get("department_id", type=int)
    search = request.args.get("search", "")

    if user.role == "student":
        student = user.student_profile
        q = Submission.query.filter_by(student_id=student.id)
        subs = q.all()
        results = []
        for sub in subs:
            if sub.final_result:
                results.append(_build_result_dict(sub))
        return jsonify({"results": results, "total": len(results)}), 200

    # Faculty view
    q = Submission.query.join(FinalResult).filter(Submission.status.in_(["approved", "published"]))

    if assignment_id:
        q = q.filter(Submission.assignment_id == assignment_id)
    if dept_id:
        q = q.join(Student).filter(Student.department_id == dept_id)
    if search:
        q = q.join(Student).join(User).filter(
            db.or_(
                User.name.ilike(f"%{search}%"),
                Student.register_number.ilike(f"%{search}%"),
            )
        )

    paginated = q.paginate(page=page, per_page=per_page, error_out=False)
    results = [_build_result_dict(sub) for sub in paginated.items]
    return jsonify({
        "results": results,
        "total": paginated.total,
        "page": page,
        "pages": paginated.pages,
    }), 200


def _build_result_dict(sub: Submission):
    fr = sub.final_result
    student = sub.student
    assignment = sub.assignment

    # Build rubric-wise marks
    rubric_marks = {}
    for ev in sub.evaluations:
        if ev.rubric:
            marks = ev.faculty_marks if ev.faculty_marks is not None else ev.ai_marks
            rubric_marks[ev.rubric.rubric_name] = {
                "ai_marks": ev.ai_marks,
                "faculty_marks": ev.faculty_marks,
                "final_marks": marks,
                "maximum_marks": ev.rubric.maximum_marks,
            }

    return {
        "submission_id": sub.id,
        "student_id": student.id if student else None,
        "register_number": student.register_number if student else None,
        "student_name": student.user.name if student and student.user else None,
        "department": student.department.name if student and student.department else None,
        "academic_year": student.academic_year.year_name if student and student.academic_year else None,
        "year_of_study": student.year_of_study.label if student and student.year_of_study else None,
        "section": student.section.name if student and student.section else None,
        "subject_code": assignment.subject.subject_code if assignment and assignment.subject else None,
        "subject_name": assignment.subject.subject_name if assignment and assignment.subject else None,
        "assignment_title": assignment.title if assignment else None,
        "assignment_id": assignment.id if assignment else None,
        "maximum_marks": assignment.maximum_marks if assignment else None,
        "total_ai_marks": fr.total_ai_marks if fr else None,
        "total_faculty_marks": fr.total_faculty_marks if fr else None,
        "faculty_feedback": fr.faculty_feedback if fr else None,
        "approved_at": fr.approved_at.isoformat() if fr and fr.approved_at else None,
        "status": sub.status,
        "rubric_marks": rubric_marks,
    }


@results_bp.route("/export", methods=["GET"])
@jwt_required()
@faculty_required
def export_excel():
    try:
        import pandas as pd
    except ImportError:
        return jsonify({"error": "pandas not installed"}), 500

    assignment_id = request.args.get("assignment_id", type=int)

    q = Submission.query.filter(Submission.status.in_(["approved", "published"]))
    if assignment_id:
        q = q.filter_by(assignment_id=assignment_id)

    subs = q.all()
    if not subs:
        return jsonify({"error": "No approved results to export"}), 404

    rows = []
    all_rubric_names = set()

    result_dicts = [_build_result_dict(sub) for sub in subs]
    for rd in result_dicts:
        all_rubric_names.update(rd["rubric_marks"].keys())

    rubric_names = sorted(all_rubric_names)

    for rd in result_dicts:
        row = {
            "Register Number": rd.get("register_number"),
            "Student Name": rd.get("student_name"),
            "Department": rd.get("department"),
            "Academic Year": rd.get("academic_year"),
            "Year of Study": rd.get("year_of_study"),
            "Section": rd.get("section"),
            "Subject Code": rd.get("subject_code"),
            "Subject Name": rd.get("subject_name"),
            "Assignment": rd.get("assignment_title"),
        }
        for rn in rubric_names:
            marks = rd["rubric_marks"].get(rn, {})
            row[rn] = marks.get("final_marks", "")
        row["Final Marks"] = rd.get("total_faculty_marks")
        row["Faculty Feedback"] = rd.get("faculty_feedback", "")
        rows.append(row)

    df = pd.DataFrame(rows)
    output = io.BytesIO()
    with pd.ExcelWriter(output, engine="openpyxl") as writer:
        df.to_excel(writer, index=False, sheet_name="Results")
    output.seek(0)

    return send_file(
        output,
        mimetype="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        as_attachment=True,
        download_name="results.xlsx",
    )


@results_bp.route("/<int:sub_id>", methods=["GET"])
@jwt_required()
def get_result(sub_id):
    sub = Submission.query.get_or_404(sub_id)
    return jsonify(_build_result_dict(sub)), 200
