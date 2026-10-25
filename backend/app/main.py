import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from .config import STATIC_DIR
from .database import engine, Base, SessionLocal
from .models import *
from .services.sample_data import seed_default_event_if_empty
from .routers import events, participants, feedback, certificates, emails, analytics, settings

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: create tables and seed default event
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        seed_default_event_if_empty(db)
    finally:
        db.close()
    yield

app = FastAPI(
    title="EventFlow AI API",
    description="Automated Event Closure, Post-Event Surveys, and Certificate Issuance Engine powered by Gemma 4",
    version="1.0.0",
    lifespan=lifespan
)

# Enable CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount static folder for certificates, thumbnails, and custom templates
app.mount("/static", StaticFiles(directory=str(STATIC_DIR)), name="static")

# Include API routers
app.include_router(events.router)
app.include_router(participants.router)
app.include_router(feedback.router)
app.include_router(certificates.router)
app.include_router(emails.router)
app.include_router(analytics.router)
app.include_router(settings.router)

@app.get("/api/health")
def health_check():
    return {
        "status": "healthy",
        "service": "EventFlow AI",
        "engine": "FastAPI + Gemma 4 / Gemini API",
        "version": "1.0.0"
    }
