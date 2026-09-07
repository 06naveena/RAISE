import os
import json
from datetime import timedelta
from flask import Flask
from flask_cors import CORS
from flask_jwt_extended import JWTManager
from .extensions import db
from .config import Config


def create_app(config_class=Config):
    app = Flask(__name__, instance_relative_config=True)
    app.config.from_object(config_class)
    app.config["JWT_ACCESS_TOKEN_EXPIRES"] = timedelta(hours=24)

    # Ensure upload folder exists
    os.makedirs(app.config["UPLOAD_FOLDER"], exist_ok=True)

    # Extensions
    db.init_app(app)
    CORS(app, resources={r"/api/*": {"origins": app.config["CORS_ORIGINS"]}},
         supports_credentials=True)
    JWTManager(app)

    # Register blueprints
    from .routes.auth import auth_bp
    from .routes.departments import dept_bp
    from .routes.academic import academic_bp
    from .routes.subjects import subjects_bp
    from .routes.students import students_bp
    from .routes.assignments import assignments_bp
    from .routes.submissions import submissions_bp
    from .routes.evaluations import evaluations_bp
    from .routes.results import results_bp
    from .routes.audit import audit_bp
    from .routes.dashboard import dashboard_bp

    app.register_blueprint(auth_bp,        url_prefix="/api/auth")
    app.register_blueprint(dept_bp,        url_prefix="/api/departments")
    app.register_blueprint(academic_bp,    url_prefix="/api")
    app.register_blueprint(subjects_bp,    url_prefix="/api/subjects")
    app.register_blueprint(students_bp,    url_prefix="/api/students")
    app.register_blueprint(assignments_bp, url_prefix="/api/assignments")
    app.register_blueprint(submissions_bp, url_prefix="/api/submissions")
    app.register_blueprint(evaluations_bp, url_prefix="/api/evaluations")
    app.register_blueprint(results_bp,     url_prefix="/api/results")
    app.register_blueprint(audit_bp,       url_prefix="/api/audit-logs")
    app.register_blueprint(dashboard_bp,   url_prefix="/api/dashboard")

    with app.app_context():
        db.create_all()

    return app
