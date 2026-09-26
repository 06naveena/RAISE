import os
from dotenv import load_dotenv

load_dotenv()


class Config:
    SECRET_KEY = os.getenv("SECRET_KEY", "dev-secret-key")
    JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "dev-jwt-secret")
    SQLALCHEMY_DATABASE_URI = os.getenv("DATABASE_URL", "sqlite:///raise.db")
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    MAX_CONTENT_LENGTH = int(os.getenv("MAX_CONTENT_LENGTH", 16 * 1024 * 1024))
    UPLOAD_FOLDER = os.getenv("UPLOAD_FOLDER", "uploads/submissions")
    ALLOWED_EXTENSIONS = set(os.getenv("ALLOWED_EXTENSIONS", "pdf,docx,jpg,jpeg,png").split(","))
    CORS_ORIGINS = os.getenv("CORS_ORIGINS", "http://localhost:5173").split(",")

    LLM_PROVIDER = os.getenv("LLM_PROVIDER", "mock")
    OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")
    ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY", "")
    GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
    LLM_MODEL = os.getenv("LLM_MODEL", "gpt-4o-mini")

    TESSERACT_CMD = os.getenv("TESSERACT_CMD", "")
