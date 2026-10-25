import json
import uuid
from datetime import datetime
from typing import Dict, Any, List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import Event, Participant, FeedbackForm, FeedbackSubmission, AIAnalysis
from ..schemas import FeedbackFormCreate, FeedbackFormResponse, FeedbackSubmitRequest, AIFormGenerationRequest
from ..services.ai_service import generate_feedback_questions, analyze_feedback_responses
from ..services.certificate_service import generate_single_certificate

router = APIRouter(tags=["feedback"])

@router.get("/api/events/{event_id}/feedback-form")
def get_feedback_form(event_id: str, db: Session = Depends(get_db)):
    """Retrieve the feedback form definition for an event."""
    form = db.query(FeedbackForm).filter(FeedbackForm.event_id == event_id).first()
    if not form:
        event = db.query(Event).filter(Event.id == event_id).first()
        if not event:
            raise HTTPException(status_code=404, detail="Event not found")
        # Auto-create if missing
        form = FeedbackForm(
            id=str(uuid.uuid4()),
            event_id=event_id,
            title=f"Post-{event.event_type} Experience Survey",
            description="Share your feedback to help us improve and unlock your verified certificate.",
            questions="[]",
            is_published=True
        )
        db.add(form)
        db.commit()
        db.refresh(form)

    questions = []
    if form.questions:
        try:
            questions = json.loads(form.questions)
        except Exception:
            questions = []

    return {
        "id": form.id,
        "event_id": form.event_id,
        "title": form.title,
        "description": form.description,
        "questions": questions,
        "is_published": form.is_published,
        "created_at": form.created_at,
        "updated_at": form.updated_at
    }


@router.put("/api/events/{event_id}/feedback-form")
def update_feedback_form(event_id: str, payload: FeedbackFormCreate, db: Session = Depends(get_db)):
    """Update feedback form questions, title, description, or publication status."""
    form = db.query(FeedbackForm).filter(FeedbackForm.event_id == event_id).first()
    if not form:
        raise HTTPException(status_code=404, detail="Feedback form not found")

    form.title = payload.title
    form.description = payload.description
    form.questions = json.dumps([q.dict() for q in payload.questions])
    form.is_published = payload.is_published
    form.updated_at = datetime.utcnow()

    db.commit()
    db.refresh(form)
    
    return {
        "id": form.id,
        "event_id": form.event_id,
        "title": form.title,
        "description": form.description,
        "questions": [q.dict() for q in payload.questions],
        "is_published": form.is_published,
        "created_at": form.created_at,
        "updated_at": form.updated_at
    }


@router.post("/api/events/{event_id}/feedback-form/generate-ai")
def generate_ai_questions(event_id: str, payload: AIFormGenerationRequest, db: Session = Depends(get_db)):
    """Use Gemma 4 via Gemini API to generate context-specific survey questions."""
    event = db.query(Event).filter(Event.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    tracks = json.loads(event.tracks) if event.tracks else []
    speakers = json.loads(event.speakers) if event.speakers else []

    event_dict = {
        "title": event.title,
        "subtitle": event.subtitle,
        "event_type": event.event_type,
        "organization": event.organization,
        "description": event.description,
        "tracks": tracks,
        "speakers": speakers
    }

    ai_result = generate_feedback_questions(
        event=event_dict,
        custom_focus=payload.custom_focus or "",
        target_count=payload.target_question_count or 5
    )

    # Save to feedback form
    form = db.query(FeedbackForm).filter(FeedbackForm.event_id == event_id).first()
    if not form:
        form = FeedbackForm(id=str(uuid.uuid4()), event_id=event_id)
        db.add(form)

    form.title = ai_result.get("title", f"Feedback for {event.title}")
    form.description = ai_result.get("description", "Please share your thoughts.")
    form.questions = json.dumps(ai_result.get("questions", []))
    form.updated_at = datetime.utcnow()

    db.commit()
    db.refresh(form)

    return {
        "id": form.id,
        "event_id": form.event_id,
        "title": form.title,
        "description": form.description,
        "questions": ai_result.get("questions", []),
        "generated_by": ai_result.get("generated_by", "Gemma 4")
    }


@router.get("/api/public/feedback/{token}")
def get_public_feedback_page(token: str, db: Session = Depends(get_db)):
    """Public endpoint for participant to open and submit their feedback."""
    part = db.query(Participant).filter(Participant.feedback_token == token).first()
    if not part:
        raise HTTPException(status_code=404, detail="Invalid feedback link or token expired")

    event = db.query(Event).filter(Event.id == part.event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    form = db.query(FeedbackForm).filter(FeedbackForm.event_id == event.id).first()
    questions = json.loads(form.questions) if (form and form.questions) else []

    return {
        "participant": {
            "name": part.name,
            "email": part.email,
            "role": part.role,
            "status": part.feedback_status,
            "already_submitted": part.feedback_status == "Submitted"
        },
        "event": {
            "title": event.title,
            "organization": event.organization,
            "date": event.date,
            "event_type": event.event_type
        },
        "form": {
            "title": form.title if form else "Event Feedback",
            "description": form.description if form else "",
            "questions": questions
        },
        "certificate_id": part.certificate_id if part.feedback_status == "Submitted" else None
    }


@router.post("/api/public/feedback/{token}")
def submit_public_feedback(token: str, payload: FeedbackSubmitRequest, db: Session = Depends(get_db)):
    """Process participant feedback submission, unlock certificate, and update AI analytics."""
    part = db.query(Participant).filter(Participant.feedback_token == token).first()
    if not part:
        raise HTTPException(status_code=404, detail="Invalid token")

    event = db.query(Event).filter(Event.id == part.event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    # Record submission
    submission = FeedbackSubmission(
        id=str(uuid.uuid4()),
        event_id=event.id,
        participant_id=part.id,
        answers=json.dumps(payload.answers),
        nps_score=payload.nps_score,
        overall_rating=payload.overall_rating,
        comments=payload.comments or "",
        submitted_at=datetime.utcnow()
    )
    db.add(submission)

    # Update participant
    part.feedback_status = "Submitted"
    part.feedback_submitted_at = datetime.utcnow()

    # Automatically generate certificate if not already generated
    event_dict = {
        "id": event.id,
        "title": event.title,
        "organization": event.organization,
        "date": event.date,
        "location": event.location,
        "certificate_template_id": event.certificate_template_id,
        "signature_name": event.signature_name,
        "signature_title": event.signature_title,
        "certificate_title": event.certificate_title,
        "certificate_issue_date": event.certificate_issue_date
    }
    part_dict = {
        "id": part.id,
        "name": part.name,
        "role": part.role,
        "certificate_id": part.certificate_id
    }
    pdf_path = generate_single_certificate(part_dict, event_dict)
    part.certificate_file_path = pdf_path
    part.certificate_status = "Generated"

    db.commit()

    return {
        "success": True,
        "message": "Thank you for your valuable feedback! Your certificate has been unlocked.",
        "certificate_id": part.certificate_id,
        "verify_url": f"/verify/{part.certificate_id}",
        "download_url": f"/static/certificates/{part.certificate_id}.pdf"
    }


@router.get("/api/events/{event_id}/feedback-submissions")
def get_event_submissions(event_id: str, db: Session = Depends(get_db)):
    """List all raw feedback submissions for an event."""
    submissions = db.query(FeedbackSubmission).filter(FeedbackSubmission.event_id == event_id).order_by(FeedbackSubmission.submitted_at.desc()).all()
    results = []
    for s in submissions:
        part_name = s.participant.name if s.participant else "Anonymous"
        results.append({
            "id": s.id,
            "participant_name": part_name,
            "participant_id": s.participant_id,
            "nps_score": s.nps_score,
            "overall_rating": s.overall_rating,
            "comments": s.comments,
            "answers": json.loads(s.answers) if s.answers else {},
            "submitted_at": s.submitted_at
        })
    return results
