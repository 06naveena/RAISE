"""
Demo seed data script.
Run: python seeds/seed.py
"""
import sys
import os

# Ensure project root is in path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from app import create_app
from app.extensions import db
from app.models import (
    User, Department, AcademicYear, YearOfStudy, Section,
    Faculty, Student, Subject, Assignment, Question, Concept,
    Keyword, Rubric, Submission, ExtractedAnswer, Evaluation, FinalResult
)

app = create_app()

SAMPLE_STUDENT_ANSWER = """
Answer 1: Artificial intelligence is the simulation of human intelligence by computer systems.
AI enables machines to perform tasks that typically require human cognitive abilities such as
learning, reasoning, problem solving, perception and language understanding.
It includes techniques like machine learning, deep learning, and natural language processing.
AI systems learn from data, identify patterns, and make decisions with minimal human intervention.

Answer 2: Machine learning is a subset of artificial intelligence where systems learn from data
to improve performance without explicit programming. It uses algorithms and statistical models
to enable computers to learn from experience.
Types include: supervised learning, unsupervised learning, and reinforcement learning.
Supervised learning uses labeled training data, unsupervised learning finds patterns in unlabeled
data, and reinforcement learning learns through rewards and penalties.

Answer 3: A neural network is a computational model inspired by the structure of the human brain.
It consists of interconnected nodes called neurons organized in layers: input layer, hidden layers,
and output layer. Each connection has a weight that is adjusted during training.
Neural networks are used for image recognition, speech processing, and natural language tasks.
Deep learning uses deep neural networks with many hidden layers to learn complex patterns.

Answer 4: Natural language processing (NLP) is a branch of AI that deals with the interaction
between computers and human languages. It enables machines to read, understand, and generate
human language. Key NLP tasks include tokenization, POS tagging, named entity recognition,
sentiment analysis, and machine translation. NLP uses both rule-based and statistical approaches.

Answer 5: The Turing Test was proposed by Alan Turing in 1950 to determine if a machine can
exhibit intelligent behavior equivalent to a human. In the test, a human evaluator interacts
with both a machine and a human through text. If the evaluator cannot reliably tell which is
the machine, the machine is said to have passed the test. It is a philosophical benchmark for
artificial intelligence rather than a practical evaluation method.
"""


def seed():
    with app.app_context():
        db.drop_all()
        db.create_all()
        print("Database tables created.")

        # ── Departments ───────────────────────────────────────────────────────
        cse = Department(name="Computer Science and Engineering", code="CSE")
        ece = Department(name="Electronics and Communication Engineering", code="ECE")
        db.session.add_all([cse, ece])
        db.session.flush()
        print(f"[OK] Departments: {cse.name}, {ece.name}")

        # ── Academic Years ────────────────────────────────────────────────────
        ay = AcademicYear(year_name="2026-2027")
        ay2 = AcademicYear(year_name="2025-2026")
        db.session.add_all([ay, ay2])
        db.session.flush()

        # ── Years of Study ────────────────────────────────────────────────────
        y1 = YearOfStudy(year_number=1, label="I Year")
        y2 = YearOfStudy(year_number=2, label="II Year")
        y3 = YearOfStudy(year_number=3, label="III Year")
        y4 = YearOfStudy(year_number=4, label="IV Year")
        db.session.add_all([y1, y2, y3, y4])
        db.session.flush()

        # ── Sections ──────────────────────────────────────────────────────────
        sec_a = Section(name="A")
        sec_b = Section(name="B")
        sec_c = Section(name="C")
        db.session.add_all([sec_a, sec_b, sec_c])
        db.session.flush()

        # ── Faculty User ──────────────────────────────────────────────────────
        faculty_user = User(name="Dr. Priya Sharma", email="faculty@example.com", role="faculty")
        faculty_user.set_password("Faculty@123")
        db.session.add(faculty_user)
        db.session.flush()

        faculty = Faculty(user_id=faculty_user.id, department_id=cse.id)
        db.session.add(faculty)
        db.session.flush()
        print(f"[OK] Faculty: {faculty_user.email} / Faculty@123")

        # ── Subject ───────────────────────────────────────────────────────────
        subject = Subject(
            subject_code="CS401",
            subject_name="Artificial Intelligence",
            department_id=cse.id,
            faculty_id=faculty.id,
        )
        db.session.add(subject)
        db.session.flush()

        # ── Students ──────────────────────────────────────────────────────────
        student_data = [
            ("Arun Kumar",    "student@example.com", "Student@123", "23CSE001"),
            ("Priya Rajan",   "priya@example.com",   "Student@123", "23CSE002"),
            ("Karthik Mani",  "karthik@example.com", "Student@123", "23CSE003"),
            ("Divya Sree",    "divya@example.com",   "Student@123", "23CSE004"),
            ("Rahul Verma",   "rahul@example.com",   "Student@123", "23CSE005"),
        ]

        students = []
        for name, email, pwd, reg in student_data:
            u = User(name=name, email=email, role="student")
            u.set_password(pwd)
            db.session.add(u)
            db.session.flush()
            s = Student(
                user_id=u.id,
                register_number=reg,
                department_id=cse.id,
                academic_year_id=ay.id,
                year_of_study_id=y4.id,
                section_id=sec_a.id,
            )
            db.session.add(s)
            db.session.flush()
            students.append(s)

        print(f"[OK] Students: {[s.register_number for s in students]}")
        print(f"  Primary student: student@example.com / Student@123")

        # ── Assignment ────────────────────────────────────────────────────────
        from datetime import datetime, timezone, timedelta
        deadline = datetime.now(timezone.utc) + timedelta(days=30)

        assignment = Assignment(
            title="Unit I – Artificial Intelligence Assignment",
            description=(
                "This assignment covers the foundational concepts of Artificial Intelligence "
                "including its definition, subfields, machine learning types, neural networks, "
                "natural language processing, and the Turing Test. "
                "Answer all 5 questions clearly with proper explanations."
            ),
            subject_id=subject.id,
            department_id=cse.id,
            academic_year_id=ay.id,
            year_of_study_id=y4.id,
            section_id=sec_a.id,
            maximum_marks=100,
            deadline=deadline,
            status="published",
        )
        db.session.add(assignment)
        db.session.flush()

        # ── Questions ─────────────────────────────────────────────────────────
        questions_data = [
            {
                "number": 1,
                "text": "Define Artificial Intelligence and explain its significance in modern computing.",
                "max_marks": 20,
                "reference": (
                    "Artificial Intelligence (AI) is the simulation of human intelligence processes "
                    "by machines, especially computer systems. These processes include learning "
                    "(acquisition of information and rules for using it), reasoning (using the rules "
                    "to reach conclusions), and self-correction. AI is significant because it enables "
                    "automation of complex tasks, improves decision making, powers innovations in "
                    "healthcare, autonomous vehicles, finance and more."
                ),
                "concepts": ["simulation of human intelligence", "machine learning", "reasoning",
                             "self-correction", "automation", "decision making"],
                "keywords": ["artificial intelligence", "AI", "human intelligence", "simulation",
                             "learning", "reasoning", "automation"],
            },
            {
                "number": 2,
                "text": "Explain the types of machine learning with examples.",
                "max_marks": 20,
                "reference": (
                    "Machine Learning has three main types: "
                    "1. Supervised Learning: The model is trained on labeled data. Examples: email spam detection, image classification. "
                    "2. Unsupervised Learning: The model finds patterns in unlabeled data. Examples: customer segmentation, anomaly detection. "
                    "3. Reinforcement Learning: The model learns through rewards and penalties. Examples: game playing AI, robotic control."
                ),
                "concepts": ["supervised learning", "unsupervised learning", "reinforcement learning",
                             "labeled data", "unlabeled data", "rewards and penalties"],
                "keywords": ["machine learning", "supervised", "unsupervised", "reinforcement",
                             "labeled", "training", "algorithm"],
            },
            {
                "number": 3,
                "text": "Describe the architecture of a neural network and explain how it learns.",
                "max_marks": 20,
                "reference": (
                    "A neural network consists of: "
                    "Input Layer: receives input features. "
                    "Hidden Layers: perform intermediate computations using weighted connections and activation functions. "
                    "Output Layer: produces the final prediction. "
                    "Learning process: Forward pass computes predictions. Loss function measures error. "
                    "Backpropagation computes gradients. Gradient descent updates weights to minimize loss."
                ),
                "concepts": ["input layer", "hidden layer", "output layer", "weights",
                             "activation function", "backpropagation", "gradient descent"],
                "keywords": ["neural network", "neuron", "layer", "weights", "activation",
                             "backpropagation", "deep learning", "training"],
            },
            {
                "number": 4,
                "text": "What is Natural Language Processing? Explain any three NLP tasks.",
                "max_marks": 20,
                "reference": (
                    "Natural Language Processing (NLP) is a branch of AI that enables computers to "
                    "understand, interpret, and generate human language. "
                    "Key NLP tasks: "
                    "1. Tokenization: Breaking text into words or sentences. "
                    "2. Named Entity Recognition (NER): Identifying entities like names, locations, dates. "
                    "3. Sentiment Analysis: Determining emotional tone (positive, negative, neutral). "
                    "4. Machine Translation: Translating text from one language to another. "
                    "5. Part-of-Speech Tagging: Labeling words as noun, verb, adjective, etc."
                ),
                "concepts": ["natural language processing", "tokenization", "named entity recognition",
                             "sentiment analysis", "machine translation", "part-of-speech tagging"],
                "keywords": ["NLP", "language", "tokenization", "sentiment", "entity",
                             "translation", "text", "understanding"],
            },
            {
                "number": 5,
                "text": "Explain the Turing Test and its significance in evaluating artificial intelligence.",
                "max_marks": 20,
                "reference": (
                    "The Turing Test was proposed by Alan Turing in 1950 in his paper 'Computing Machinery and Intelligence'. "
                    "Setup: A human evaluator conducts natural language conversations with both a human and a machine. "
                    "If the evaluator cannot reliably distinguish the machine from the human, the machine is said to have passed. "
                    "Significance: It provides a behavioral benchmark for AI intelligence. "
                    "Limitations: It tests only language capability, not true understanding or consciousness."
                ),
                "concepts": ["Alan Turing", "behavioral benchmark", "language capability",
                             "human evaluator", "machine intelligence", "consciousness"],
                "keywords": ["Turing Test", "Alan Turing", "machine", "human", "intelligence",
                             "evaluator", "benchmark", "1950"],
            },
        ]

        q_objects = []
        for qd in questions_data:
            q = Question(
                assignment_id=assignment.id,
                question_number=qd["number"],
                question_text=qd["text"],
                maximum_marks=qd["max_marks"],
                reference_answer=qd["reference"],
            )
            db.session.add(q)
            db.session.flush()

            for c in qd["concepts"]:
                db.session.add(Concept(question_id=q.id, concept_text=c))
            for k in qd["keywords"]:
                db.session.add(Keyword(question_id=q.id, keyword=k))
            q_objects.append(q)

        # ── Rubrics ───────────────────────────────────────────────────────────
        rubrics_data = [
            ("Conceptual Correctness", "Evaluates the accuracy and depth of conceptual understanding", 40),
            ("Problem-Solving Method",  "Evaluates the approach and methodology used to address the question", 24),
            ("Explanation Quality",     "Evaluates clarity, coherence and quality of explanation", 15),
            ("Presentation",            "Evaluates structure, formatting, and professional presentation", 11),
            ("Completeness",            "Evaluates whether all aspects of the question are addressed", 10),
        ]
        rubric_objects = []
        for i, (name, desc, max_m) in enumerate(rubrics_data):
            r = Rubric(
                assignment_id=assignment.id,
                rubric_name=name,
                description=desc,
                maximum_marks=max_m,
                order=i,
            )
            db.session.add(r)
            db.session.flush()
            rubric_objects.append(r)

        # Verify rubric total
        total = sum(r.maximum_marks for r in rubric_objects)
        assert abs(total - 100) < 0.01, f"Rubric total {total} != 100"
        print(f"[OK] Assignment: '{assignment.title}' with 5 questions and 5 rubrics (total: {total} marks)")

        # ── Sample Submissions & Evaluations ──────────────────────────────────
        import os, tempfile

        for idx, student in enumerate(students):
            # Create a fake text file as submission
            fname = f"{student.register_number}_ai_assignment.txt"
            fpath = os.path.join("uploads", "submissions", fname)
            os.makedirs(os.path.dirname(fpath), exist_ok=True)
            with open(fpath, "w") as f:
                f.write(SAMPLE_STUDENT_ANSWER)

            sub = Submission(
                assignment_id=assignment.id,
                student_id=student.id,
                file_path=fpath,
                original_filename=fname,
                file_size=len(SAMPLE_STUDENT_ANSWER),
                status="approved",
                is_scanned=False,
            )
            db.session.add(sub)
            db.session.flush()

            # Mock evaluations with slight variation per student
            variation = [0.9, 0.75, 0.85, 0.65, 0.95][idx]
            total_marks = 0

            for q in q_objects:
                sim = 0.7 * variation + (q.question_number * 0.02)

                for r in rubric_objects:
                    marks = round(r.maximum_marks * variation * (0.85 + q.question_number * 0.03), 1)
                    marks = min(marks, r.maximum_marks)

                    ev = Evaluation(
                        submission_id=sub.id,
                        question_id=q.id,
                        rubric_id=r.id,
                        ai_marks=marks,
                        faculty_marks=marks,
                        justification=f"Student demonstrated {int(variation*100)}% understanding of {r.rubric_name.lower()}.",
                        feedback=f"Good answer. Consider elaborating more on key concepts for {r.rubric_name}.",
                        evaluation_status="approved",
                        semantic_similarity=sim,
                    )
                    ev.identified_concepts = [c.concept_text for c in q.concepts[:3]]
                    ev.missing_concepts = [c.concept_text for c in q.concepts[3:]]
                    ev.errors = []
                    db.session.add(ev)
                    total_marks += marks

            # Scale total to 100
            total_marks = min(total_marks / len(q_objects), 100)

            fr = FinalResult(
                submission_id=sub.id,
                total_ai_marks=round(total_marks, 1),
                total_faculty_marks=round(total_marks, 1),
                faculty_feedback="Good work overall. Continue improving depth of explanation.",
                approved_by=faculty_user.id,
                approved_at=deadline,
            )
            sub.status = "published"
            db.session.add(fr)

        db.session.commit()
        print(f"[OK] Sample submissions and evaluations created for {len(students)} students")
        print("\n" + "="*60)
        print("SEED COMPLETE")
        print("="*60)
        print("Faculty Login:  faculty@example.com  /  Faculty@123")
        print("Student Login:  student@example.com  /  Student@123")
        print("="*60)


if __name__ == "__main__":
    seed()
