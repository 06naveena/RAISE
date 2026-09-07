from datetime import datetime, timezone
from ..extensions import db


class Assignment(db.Model):
    __tablename__ = "assignments"
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(300), nullable=False)
    description = db.Column(db.Text, nullable=True)
    subject_id = db.Column(db.Integer, db.ForeignKey("subjects.id"), nullable=False)
    department_id = db.Column(db.Integer, db.ForeignKey("departments.id"), nullable=True)
    academic_year_id = db.Column(db.Integer, db.ForeignKey("academic_years.id"), nullable=True)
    year_of_study_id = db.Column(db.Integer, db.ForeignKey("years_of_study.id"), nullable=True)
    section_id = db.Column(db.Integer, db.ForeignKey("sections.id"), nullable=True)
    maximum_marks = db.Column(db.Float, nullable=False, default=100)
    deadline = db.Column(db.DateTime, nullable=True)
    status = db.Column(db.String(20), default="draft")  # draft | published | closed
    allow_late = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    subject = db.relationship("Subject", back_populates="assignments")
    questions = db.relationship("Question", back_populates="assignment", cascade="all, delete-orphan")
    rubrics = db.relationship("Rubric", back_populates="assignment", cascade="all, delete-orphan")
    submissions = db.relationship("Submission", back_populates="assignment")

    def to_dict(self, include_questions=False, include_rubrics=False):
        data = {
            "id": self.id,
            "title": self.title,
            "description": self.description,
            "subject_id": self.subject_id,
            "subject": self.subject.to_dict() if self.subject else None,
            "department_id": self.department_id,
            "academic_year_id": self.academic_year_id,
            "year_of_study_id": self.year_of_study_id,
            "section_id": self.section_id,
            "maximum_marks": self.maximum_marks,
            "deadline": self.deadline.isoformat() if self.deadline else None,
            "status": self.status,
            "allow_late": self.allow_late,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
        if include_questions:
            data["questions"] = [q.to_dict() for q in self.questions]
        if include_rubrics:
            data["rubrics"] = [r.to_dict() for r in self.rubrics]
        return data


class Question(db.Model):
    __tablename__ = "questions"
    id = db.Column(db.Integer, primary_key=True)
    assignment_id = db.Column(db.Integer, db.ForeignKey("assignments.id"), nullable=False)
    question_number = db.Column(db.Integer, nullable=False)
    question_text = db.Column(db.Text, nullable=False)
    maximum_marks = db.Column(db.Float, default=0)
    reference_answer = db.Column(db.Text, nullable=True)

    assignment = db.relationship("Assignment", back_populates="questions")
    concepts = db.relationship("Concept", back_populates="question", cascade="all, delete-orphan")
    keywords = db.relationship("Keyword", back_populates="question", cascade="all, delete-orphan")
    extracted_answers = db.relationship("ExtractedAnswer", back_populates="question")
    evaluations = db.relationship("Evaluation", back_populates="question")

    def to_dict(self):
        return {
            "id": self.id,
            "assignment_id": self.assignment_id,
            "question_number": self.question_number,
            "question_text": self.question_text,
            "maximum_marks": self.maximum_marks,
            "reference_answer": self.reference_answer,
            "concepts": [c.to_dict() for c in self.concepts],
            "keywords": [k.to_dict() for k in self.keywords],
        }


class Concept(db.Model):
    __tablename__ = "concepts"
    id = db.Column(db.Integer, primary_key=True)
    question_id = db.Column(db.Integer, db.ForeignKey("questions.id"), nullable=False)
    concept_text = db.Column(db.String(300), nullable=False)

    question = db.relationship("Question", back_populates="concepts")

    def to_dict(self):
        return {"id": self.id, "concept_text": self.concept_text}


class Keyword(db.Model):
    __tablename__ = "keywords"
    id = db.Column(db.Integer, primary_key=True)
    question_id = db.Column(db.Integer, db.ForeignKey("questions.id"), nullable=False)
    keyword = db.Column(db.String(100), nullable=False)

    question = db.relationship("Question", back_populates="keywords")

    def to_dict(self):
        return {"id": self.id, "keyword": self.keyword}


class Rubric(db.Model):
    __tablename__ = "rubrics"
    id = db.Column(db.Integer, primary_key=True)
    assignment_id = db.Column(db.Integer, db.ForeignKey("assignments.id"), nullable=False)
    rubric_name = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text, nullable=True)
    maximum_marks = db.Column(db.Float, nullable=False)
    order = db.Column(db.Integer, default=0)

    assignment = db.relationship("Assignment", back_populates="rubrics")
    evaluations = db.relationship("Evaluation", back_populates="rubric")

    def to_dict(self):
        return {
            "id": self.id,
            "assignment_id": self.assignment_id,
            "rubric_name": self.rubric_name,
            "description": self.description,
            "maximum_marks": self.maximum_marks,
            "order": self.order,
        }
