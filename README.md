# RAISE — AI-Powered Assignment Evaluation System

> **R**ubric-driven **A**I-powered **I**ntelligent **S**tudent **E**valuation

A full-stack production-ready platform for AI-assisted assignment evaluation with human-in-the-loop faculty moderation.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + Vite + Tailwind CSS + React Router + Axios + Recharts + Lucide |
| Backend | Python 3.10+ + Flask + Flask-JWT-Extended + SQLAlchemy |
| Database | SQLite (dev) / PostgreSQL (prod) |
| AI/OCR | Tesseract + OpenCV + PyMuPDF + Sentence-BERT + OpenAI/Anthropic |
| Export | pandas + openpyxl |

---

## Quick Start

### Prerequisites
- Python 3.10+
- Node.js 18+
- (Optional) Tesseract OCR for scanned document support

### 1. Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv
venv\Scripts\activate   # Windows
# source venv/bin/activate  # Mac/Linux

# Install dependencies
pip install -r requirements.txt

# Configure environment
copy .env.example .env
# Edit .env if needed (defaults work out of the box with SQLite + mock AI)

# Seed demo data
python seeds/seed.py

# Start server
python run.py
# Backend runs at http://localhost:5000
```

### 2. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Start dev server
npm run dev
# Frontend runs at http://localhost:5173
```

### 3. Demo Login

| Role | Email | Password |
|---|---|---|
| Faculty | faculty@example.com | Faculty@123 |
| Student | student@example.com | Student@123 |

---

## AI Configuration

Edit `backend/.env`:

```env
# Options: mock | openai | anthropic
LLM_PROVIDER=mock

# For OpenAI:
OPENAI_API_KEY=sk-...
LLM_MODEL=gpt-4o

# For Anthropic:
ANTHROPIC_API_KEY=sk-ant-...
```

> **Mock mode** works without any API key — uses Sentence-BERT cosine similarity for grading.

---

## Tesseract OCR (Optional)

For scanned PDF/image OCR support:

1. Download Tesseract: https://github.com/UB-Mannheim/tesseract/wiki
2. Install and note the path
3. Add to `.env`:
   ```env
   TESSERACT_CMD=C:\Program Files\Tesseract-OCR\tesseract.exe
   ```

If Tesseract is not installed, the system gracefully falls back to direct text extraction.

---

## Project Structure

```
RAISE/
├── frontend/                  # React + Vite app
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   │   ├── auth/
│   │   │   ├── faculty/
│   │   │   └── student/
│   │   ├── layouts/
│   │   ├── services/
│   │   ├── context/
│   │   └── routes/
│   └── package.json
│
└── backend/                   # Flask REST API
    ├── app/
    │   ├── models/            # SQLAlchemy models
    │   ├── routes/            # Blueprint routes
    │   ├── ai/                # OCR + NLP + LLM pipeline
    │   └── middleware/        # JWT + RBAC
    ├── seeds/seed.py          # Demo data
    ├── requirements.txt
    └── run.py
```

---

## User Roles

### Faculty
- Create/manage academic hierarchy (Department → Year → Section → Subject)
- Create assignments with 6-step wizard (questions + reference answers + concepts + keywords + rubrics)
- View student submissions and trigger AI evaluation
- Review, modify, and approve AI-generated marks
- Export results to Excel
- View performance analytics and audit logs

### Student
- Register and login
- View published assignments with instructions
- Upload PDF/DOCX/image submissions (drag & drop)
- View evaluation status
- View approved marks and faculty feedback with rubric-wise breakdown

---

## Evaluation Pipeline

```
File Upload
  → File Validation (type, size)
  → Text Extraction (PyMuPDF for digital PDF, Tesseract OCR for scanned)
  → OpenCV Preprocessing (grayscale, denoise, threshold)
  → Q-A Segmentation (regex + heuristics)
  → Sentence-BERT Semantic Similarity (cosine similarity)
  → Concept + Keyword Matching
  → LLM Rubric Evaluation (per rubric, structured JSON)
  → Schema Validation + Mark Capping
  → Pending Faculty Review
  → Faculty Moderation (modify marks, add feedback)
  → Approve + Publish
  → Excel Export
```

---

## API Reference

See `backend/app/routes/` for full route definitions.

Key endpoints:
- `POST /api/auth/login` — Login
- `POST /api/auth/register` — Student registration
- `GET/POST /api/departments` — Department management
- `GET/POST /api/assignments` — Assignment management
- `POST /api/assignments/:id/questions` — Save questions
- `POST /api/assignments/:id/rubrics` — Save rubrics (validates total = max marks)
- `POST /api/submissions` — File upload
- `POST /api/evaluations/:id/start` — Trigger AI evaluation
- `PUT /api/evaluations/item/:id` — Faculty modifies marks
- `POST /api/evaluations/:id/approve` — Approve evaluation
- `GET /api/results/export` — Excel download

---

## Security

- JWT Bearer token authentication
- Password hashing via Werkzeug (PBKDF2-SHA256)
- Role-based access control (faculty vs student)
- File type + size validation
- SQL injection prevention via SQLAlchemy ORM
- CORS configured via `CORS_ORIGINS` env var
- API keys never exposed to frontend

---

## Demo Seed Data

Running `python seeds/seed.py` creates:
- 1 faculty, 5 students
- Department: Computer Science and Engineering
- Subject: Artificial Intelligence (CS401)
- Academic Year: 2026-2027 / IV Year / Section A
- Assignment: Unit I – Artificial Intelligence Assignment (5 questions, 5 rubrics, 100 marks total)
- Sample approved submissions with evaluations for all 5 students
