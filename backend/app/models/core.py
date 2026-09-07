from datetime import datetime, timezone
from werkzeug.security import generate_password_hash, check_password_hash
from ..extensions import db


class User(db.Model):
    __tablename__ = "users"
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(150), nullable=False)
    email = db.Column(db.String(200), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(256), nullable=False)
    role = db.Column(db.String(20), nullable=False)  # 'faculty' | 'student'
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    faculty_profile = db.relationship("Faculty", back_populates="user", uselist=False)
    student_profile = db.relationship("Student", back_populates="user", uselist=False)

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "email": self.email,
            "role": self.role,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


class Department(db.Model):
    __tablename__ = "departments"
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(200), nullable=False)
    code = db.Column(db.String(20), unique=True, nullable=False)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    students = db.relationship("Student", back_populates="department")
    faculties = db.relationship("Faculty", back_populates="department")
    subjects = db.relationship("Subject", back_populates="department")

    def to_dict(self):
        return {"id": self.id, "name": self.name, "code": self.code}


class AcademicYear(db.Model):
    __tablename__ = "academic_years"
    id = db.Column(db.Integer, primary_key=True)
    year_name = db.Column(db.String(20), unique=True, nullable=False)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    students = db.relationship("Student", back_populates="academic_year")

    def to_dict(self):
        return {"id": self.id, "year_name": self.year_name}


class YearOfStudy(db.Model):
    __tablename__ = "years_of_study"
    id = db.Column(db.Integer, primary_key=True)
    year_number = db.Column(db.Integer, nullable=False)
    label = db.Column(db.String(20), nullable=False)  # e.g. "IV Year"

    students = db.relationship("Student", back_populates="year_of_study")

    def to_dict(self):
        return {"id": self.id, "year_number": self.year_number, "label": self.label}


class Section(db.Model):
    __tablename__ = "sections"
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(10), nullable=False)  # A, B, C

    students = db.relationship("Student", back_populates="section")

    def to_dict(self):
        return {"id": self.id, "name": self.name}


class Faculty(db.Model):
    __tablename__ = "faculties"
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    department_id = db.Column(db.Integer, db.ForeignKey("departments.id"), nullable=True)

    user = db.relationship("User", back_populates="faculty_profile")
    department = db.relationship("Department", back_populates="faculties")
    subjects = db.relationship("Subject", back_populates="faculty")

    def to_dict(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "name": self.user.name if self.user else None,
            "email": self.user.email if self.user else None,
            "department_id": self.department_id,
            "department": self.department.to_dict() if self.department else None,
        }


class Student(db.Model):
    __tablename__ = "students"
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    register_number = db.Column(db.String(50), unique=True, nullable=False, index=True)
    department_id = db.Column(db.Integer, db.ForeignKey("departments.id"), nullable=True)
    academic_year_id = db.Column(db.Integer, db.ForeignKey("academic_years.id"), nullable=True)
    year_of_study_id = db.Column(db.Integer, db.ForeignKey("years_of_study.id"), nullable=True)
    section_id = db.Column(db.Integer, db.ForeignKey("sections.id"), nullable=True)

    user = db.relationship("User", back_populates="student_profile")
    department = db.relationship("Department", back_populates="students")
    academic_year = db.relationship("AcademicYear", back_populates="students")
    year_of_study = db.relationship("YearOfStudy", back_populates="students")
    section = db.relationship("Section", back_populates="students")
    submissions = db.relationship("Submission", back_populates="student")

    def to_dict(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "name": self.user.name if self.user else None,
            "email": self.user.email if self.user else None,
            "register_number": self.register_number,
            "department_id": self.department_id,
            "department": self.department.to_dict() if self.department else None,
            "academic_year_id": self.academic_year_id,
            "academic_year": self.academic_year.to_dict() if self.academic_year else None,
            "year_of_study_id": self.year_of_study_id,
            "year_of_study": self.year_of_study.to_dict() if self.year_of_study else None,
            "section_id": self.section_id,
            "section": self.section.to_dict() if self.section else None,
        }


class Subject(db.Model):
    __tablename__ = "subjects"
    id = db.Column(db.Integer, primary_key=True)
    subject_code = db.Column(db.String(20), nullable=False)
    subject_name = db.Column(db.String(200), nullable=False)
    department_id = db.Column(db.Integer, db.ForeignKey("departments.id"), nullable=True)
    faculty_id = db.Column(db.Integer, db.ForeignKey("faculties.id"), nullable=True)

    department = db.relationship("Department", back_populates="subjects")
    faculty = db.relationship("Faculty", back_populates="subjects")
    assignments = db.relationship("Assignment", back_populates="subject")

    def to_dict(self):
        return {
            "id": self.id,
            "subject_code": self.subject_code,
            "subject_name": self.subject_name,
            "department_id": self.department_id,
            "department": self.department.to_dict() if self.department else None,
            "faculty_id": self.faculty_id,
            "faculty_name": self.faculty.user.name if self.faculty and self.faculty.user else None,
        }
