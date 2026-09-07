from flask import Blueprint, jsonify
from flask_jwt_extended import jwt_required
from ..extensions import db
from ..models import Student, Subject, Assignment, Submission, FinalResult
from ..middleware.auth import faculty_required
import sqlalchemy as sa

dashboard_bp = Blueprint("dashboard", __name__)


@dashboard_bp.route("", methods=["GET"])
@jwt_required()
@faculty_required
def get_dashboard():
    total_students = Student.query.count()
    total_subjects = Subject.query.count()
    active_assignments = Assignment.query.filter_by(status="published").count()
    pending_evaluations = Submission.query.filter_by(status="pending_review").count()
    completed_evaluations = Submission.query.filter(
        Submission.status.in_(["approved", "published"])
    ).count()

    # Average score across approved results
    avg_result = db.session.query(
        sa.func.avg(FinalResult.total_faculty_marks)
    ).scalar()
    avg_score = round(avg_result, 1) if avg_result else 0

    # Assignment performance
    assignment_perf = []
    for a in Assignment.query.filter_by(status="published").order_by(Assignment.created_at.desc()).limit(8).all():
        subs = Submission.query.filter_by(assignment_id=a.id).all()
        approved = [s for s in subs if s.final_result]
        if approved:
            avg = sum(s.final_result.total_faculty_marks or 0 for s in approved) / len(approved)
        else:
            avg = 0
        assignment_perf.append({
            "assignment": a.title[:30],
            "average": round(avg, 1),
            "submissions": len(subs),
            "approved": len(approved),
        })

    # Score distribution
    results = FinalResult.query.all()
    distribution = {"0-40": 0, "41-60": 0, "61-75": 0, "76-90": 0, "91-100": 0}
    for r in results:
        s = r.total_faculty_marks or 0
        if s <= 40:
            distribution["0-40"] += 1
        elif s <= 60:
            distribution["41-60"] += 1
        elif s <= 75:
            distribution["61-75"] += 1
        elif s <= 90:
            distribution["76-90"] += 1
        else:
            distribution["91-100"] += 1

    return jsonify({
        "stats": {
            "total_students": total_students,
            "total_subjects": total_subjects,
            "active_assignments": active_assignments,
            "pending_evaluations": pending_evaluations,
            "completed_evaluations": completed_evaluations,
            "average_score": avg_score,
        },
        "assignment_performance": assignment_perf,
        "score_distribution": [
            {"range": k, "count": v} for k, v in distribution.items()
        ],
    }), 200
