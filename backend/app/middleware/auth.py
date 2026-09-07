from functools import wraps
from flask_jwt_extended import get_jwt_identity
from flask import jsonify
from ..models import User


def faculty_required(fn):
    @wraps(fn)
    def wrapper(*args, **kwargs):
        user_id = int(get_jwt_identity())
        user = User.query.get(user_id)
        if not user or user.role != "faculty":
            return jsonify({"error": "Faculty access required"}), 403
        return fn(*args, **kwargs)
    return wrapper


def student_required(fn):
    @wraps(fn)
    def wrapper(*args, **kwargs):
        user_id = int(get_jwt_identity())
        user = User.query.get(user_id)
        if not user or user.role != "student":
            return jsonify({"error": "Student access required"}), 403
        return fn(*args, **kwargs)
    return wrapper
