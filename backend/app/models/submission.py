import json
from datetime import datetime, timezone
from ..extensions import db


class Submission(db.Model):
    __tablename__ = "submissions"
    id = db.Column(db.Integer, primary_key=True)
    assignment_id = db.Column(db.Integer, db.ForeignKey("assignments.id"), nullable=False)
    student_id = db.Column(db.Integer, db.ForeignKey("students.id"), nullable=False)
    file_path = db.Column(db.String(500), nullable=True)
    original_filename = db.Column(db.String(300), nullable=True)
    file_size = db.Column(db.Integer, nullable=True)
    submission_date = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    status = db.Column(db.String(30), default="submitted")
    # Status progression: submitted → processing → ocr_processing → ai_evaluating
    #                   → pending_review → faculty_modified → approved → published
    ocr_confidence = db.Column(db.Float, nullable=True)
    is_scanned = db.Column(db.Boolean, default=False)

    assignment = db.relationship("Assignment", back_populates="submissions")
    student = db.relationship("Student", back_populates="submissions")
    extracted_answers = db.relationship("ExtractedAnswer", back_populates="submission", cascade="all, delete-orphan")
    evaluations = db.relationship("Evaluation", back_populates="submission", cascade="all, delete-orphan")
    final_result = db.relationship("FinalResult", back_populates="submission", uselist=False)

    def to_dict(self):
        return {
            "id": self.id,
            "assignment_id": self.assignment_id,
            "assignment_title": self.assignment.title if self.assignment else None,
            "student_id": self.student_id,
            "student_name": self.student.user.name if self.student and self.student.user else None,
            "student_register": self.student.register_number if self.student else None,
            "file_path": self.file_path,
            "original_filename": self.original_filename,
            "file_size": self.file_size,
            "submission_date": self.submission_date.isoformat() if self.submission_date else None,
            "status": self.status,
            "ocr_confidence": self.ocr_confidence,
            "is_scanned": self.is_scanned,
        }


class ExtractedAnswer(db.Model):
    __tablename__ = "extracted_answers"
    id = db.Column(db.Integer, primary_key=True)
    submission_id = db.Column(db.Integer, db.ForeignKey("submissions.id"), nullable=False)
    question_id = db.Column(db.Integer, db.ForeignKey("questions.id"), nullable=True)
    question_number = db.Column(db.Integer, nullable=True)
    extracted_text = db.Column(db.Text, nullable=True)
    segmentation_confidence = db.Column(db.Float, default=1.0)
    needs_review = db.Column(db.Boolean, default=False)

    submission = db.relationship("Submission", back_populates="extracted_answers")
    question = db.relationship("Question", back_populates="extracted_answers")

    def to_dict(self):
        return {
            "id": self.id,
            "submission_id": self.submission_id,
            "question_id": self.question_id,
            "question_number": self.question_number,
            "extracted_text": self.extracted_text,
            "segmentation_confidence": self.segmentation_confidence,
            "needs_review": self.needs_review,
        }


class Evaluation(db.Model):
    __tablename__ = "evaluations"
    id = db.Column(db.Integer, primary_key=True)
    submission_id = db.Column(db.Integer, db.ForeignKey("submissions.id"), nullable=False)
    question_id = db.Column(db.Integer, db.ForeignKey("questions.id"), nullable=True)
    rubric_id = db.Column(db.Integer, db.ForeignKey("rubrics.id"), nullable=False)
    ai_marks = db.Column(db.Float, nullable=True)
    faculty_marks = db.Column(db.Float, nullable=True)
    justification = db.Column(db.Text, nullable=True)
    feedback = db.Column(db.Text, nullable=True)
    faculty_comment = db.Column(db.Text, nullable=True)
    _identified_concepts = db.Column("identified_concepts", db.Text, nullable=True)
    _missing_concepts = db.Column("missing_concepts", db.Text, nullable=True)
    _errors = db.Column("errors", db.Text, nullable=True)
    evaluation_status = db.Column(db.String(30), default="pending")
    semantic_similarity = db.Column(db.Float, nullable=True)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc),
                           onupdate=lambda: datetime.now(timezone.utc))

    submission = db.relationship("Submission", back_populates="evaluations")
    question = db.relationship("Question", back_populates="evaluations")
    rubric = db.relationship("Rubric", back_populates="evaluations")

    @property
    def identified_concepts(self):
        return json.loads(self._identified_concepts) if self._identified_concepts else []

    @identified_concepts.setter
    def identified_concepts(self, value):
        self._identified_concepts = json.dumps(value)

    @property
    def missing_concepts(self):
        return json.loads(self._missing_concepts) if self._missing_concepts else []

    @missing_concepts.setter
    def missing_concepts(self, value):
        self._missing_concepts = json.dumps(value)

    @property
    def errors(self):
        return json.loads(self._errors) if self._errors else []

    @errors.setter
    def errors(self, value):
        self._errors = json.dumps(value)

    def to_dict(self):
        return {
            "id": self.id,
            "submission_id": self.submission_id,
            "question_id": self.question_id,
            "rubric_id": self.rubric_id,
            "rubric": self.rubric.to_dict() if self.rubric else None,
            "ai_marks": self.ai_marks,
            "faculty_marks": self.faculty_marks,
            "justification": self.justification,
            "feedback": self.feedback,
            "faculty_comment": self.faculty_comment,
            "identified_concepts": self.identified_concepts,
            "missing_concepts": self.missing_concepts,
            "errors": self.errors,
            "evaluation_status": self.evaluation_status,
            "semantic_similarity": self.semantic_similarity,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }


class FinalResult(db.Model):
    __tablename__ = "final_results"
    id = db.Column(db.Integer, primary_key=True)
    submission_id = db.Column(db.Integer, db.ForeignKey("submissions.id"), unique=True, nullable=False)
    total_ai_marks = db.Column(db.Float, nullable=True)
    total_faculty_marks = db.Column(db.Float, nullable=True)
    faculty_feedback = db.Column(db.Text, nullable=True)
    approved_by = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=True)
    approved_at = db.Column(db.DateTime, nullable=True)

    submission = db.relationship("Submission", back_populates="final_result")
    approver = db.relationship("User")

    def to_dict(self):
        return {
            "id": self.id,
            "submission_id": self.submission_id,
            "total_ai_marks": self.total_ai_marks,
            "total_faculty_marks": self.total_faculty_marks,
            "faculty_feedback": self.faculty_feedback,
            "approved_by": self.approved_by,
            "approved_at": self.approved_at.isoformat() if self.approved_at else None,
        }


class AuditLog(db.Model):
    __tablename__ = "audit_logs"
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=True)
    action = db.Column(db.String(300), nullable=False)
    entity_type = db.Column(db.String(50), nullable=True)
    entity_id = db.Column(db.Integer, nullable=True)
    submission_id = db.Column(db.Integer, db.ForeignKey("submissions.id"), nullable=True)
    previous_value = db.Column(db.Text, nullable=True)
    new_value = db.Column(db.Text, nullable=True)
    reason = db.Column(db.Text, nullable=True)
    timestamp = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    user = db.relationship("User")

    def to_dict(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "user_name": self.user.name if self.user else None,
            "action": self.action,
            "entity_type": self.entity_type,
            "entity_id": self.entity_id,
            "submission_id": self.submission_id,
            "previous_value": self.previous_value,
            "new_value": self.new_value,
            "reason": self.reason,
            "timestamp": self.timestamp.isoformat() if self.timestamp else None,
        }
