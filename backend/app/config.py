import os
from pathlib import Path
from dotenv import load_dotenv

# Base directory for backend
BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BASE_DIR.parent / ".env")
load_dotenv(BASE_DIR / ".env")

DATABASE_URL = os.getenv("DATABASE_URL", f"sqlite:///{BASE_DIR}/eventflow.db")
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173").rstrip("/")

# AI Settings (Gemma 4 through Gemini API)
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY") or ""
GEMMA_MODEL_ID = os.getenv("GEMMA_MODEL_ID", "gemini-2.5-flash")

# Email Settings (Resend)
RESEND_API_KEY = os.getenv("RESEND_API_KEY", "")
RESEND_FROM_EMAIL = os.getenv("RESEND_FROM_EMAIL", "EventFlow AI <onboarding@resend.dev>")
SIMULATION_MODE = os.getenv("SIMULATION_MODE", "true").lower() in ("true", "1", "yes")

# Directories
STATIC_DIR = BASE_DIR / "static"
CERTIFICATES_DIR = STATIC_DIR / "certificates"
TEMPLATES_DIR = STATIC_DIR / "templates"
UPLOADS_DIR = STATIC_DIR / "uploads"

# Ensure all directories exist
for folder in [CERTIFICATES_DIR, TEMPLATES_DIR, UPLOADS_DIR]:
    folder.mkdir(parents=True, exist_ok=True)
