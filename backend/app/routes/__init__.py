from flask import Blueprint
blueprint_bp = Blueprint("routes", __name__)

from .auth import auth_bp
from .departments import dept_bp
from .academic import academic_bp
from .subjects import subjects_bp
from .students import students_bp
from .assignments import assignments_bp
from .submissions import submissions_bp
from .evaluations import evaluations_bp
from .results import results_bp
from .audit import audit_bp
from .dashboard import dashboard_bp
