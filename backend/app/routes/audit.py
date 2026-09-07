from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
from ..models import AuditLog
from ..middleware.auth import faculty_required

audit_bp = Blueprint("audit", __name__)


@audit_bp.route("", methods=["GET"])
@jwt_required()
@faculty_required
def list_audit_logs():
    page = request.args.get("page", 1, type=int)
    per_page = request.args.get("per_page", 30, type=int)
    submission_id = request.args.get("submission_id", type=int)

    q = AuditLog.query
    if submission_id:
        q = q.filter_by(submission_id=submission_id)

    paginated = q.order_by(AuditLog.timestamp.desc()).paginate(page=page, per_page=per_page, error_out=False)
    return jsonify({
        "logs": [l.to_dict() for l in paginated.items],
        "total": paginated.total,
        "page": page,
        "pages": paginated.pages,
    }), 200
