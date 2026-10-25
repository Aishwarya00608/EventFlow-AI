import json
import uuid
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func

from ..database import get_db
from ..models import Event, Participant, FeedbackForm, FeedbackSubmission, AIAnalysis
from ..schemas import EventCreate, EventUpdate, EventResponse
from ..services.sample_data import seed_default_event_if_empty, SAMPLE_PARTICIPANTS
from ..services.ai_service import generate_feedback_questions
from ..services.certificate_service import generate_unique_certificate_id

router = APIRouter(prefix="/api/events", tags=["events"])

def enrich_event_stats(event: Event, db: Session) -> dict:
    total_participants = db.query(func.count(Participant.id)).filter(Participant.id == event.id).scalar() or 0
    # Query with correct filter: participant.event_id == event.id
    total_participants = db.query(func.count(Participant.id)).filter(Participant.event_id == event.id).scalar() or 0
    feedback_sent = db.query(func.count(Participant.id)).filter(Participant.event_id == event.id, Participant.feedback_status.in_(["Sent", "Submitted"])).scalar() or 0
    feedback_submitted = db.query(func.count(Participant.id)).filter(Participant.event_id == event.id, Participant.feedback_status == "Submitted").scalar() or 0
    certs_generated = db.query(func.count(Participant.id)).filter(Participant.event_id == event.id, Participant.certificate_status.in_(["Generated", "Emailed"])).scalar() or 0
    certs_emailed = db.query(func.count(Participant.id)).filter(Participant.event_id == event.id, Participant.certificate_status == "Emailed").scalar() or 0
    
    avg_rating = db.query(func.avg(FeedbackSubmission.overall_rating)).filter(FeedbackSubmission.event_id == event.id).scalar()
    if avg_rating is not None:
        avg_rating = round(float(avg_rating), 2)
        
    analysis = db.query(AIAnalysis).filter(AIAnalysis.event_id == event.id).first()
    nps_score = analysis.nps_score if analysis else None

    # Parse JSON fields
    tracks = []
    if event.tracks:
        try:
            tracks = json.loads(event.tracks) if isinstance(event.tracks, str) else event.tracks
        except Exception:
            tracks = []
            
    speakers = []
    if event.speakers:
        try:
            speakers = json.loads(event.speakers) if isinstance(event.speakers, str) else event.speakers
        except Exception:
            speakers = []

    return {
        "id": event.id,
        "title": event.title,
        "subtitle": event.subtitle or "",
        "event_type": event.event_type,
        "organization": event.organization,
        "date": event.date,
        "location": event.location,
        "description": event.description or "",
        "tracks": tracks,
        "speakers": speakers,
        "certificate_template_id": event.certificate_template_id,
        "custom_template_path": event.custom_template_path,
        "signature_name": event.signature_name,
        "signature_title": event.signature_title,
        "signature_image_path": event.signature_image_path,
        "certificate_title": event.certificate_title,
        "certificate_issue_date": event.certificate_issue_date,
        "require_feedback_for_cert": event.require_feedback_for_cert,
        "status": event.status,
        "created_at": event.created_at,
        "updated_at": event.updated_at,
        "total_participants": total_participants,
        "feedback_sent_count": feedback_sent,
        "feedback_submitted_count": feedback_submitted,
        "certificates_generated_count": certs_generated,
        "certificates_emailed_count": certs_emailed,
        "average_rating": avg_rating,
        "nps_score": nps_score
    }


@router.get("", response_model=List[EventResponse])
def get_all_events(db: Session = Depends(get_db)):
    """List all events with real-time aggregated metrics."""
    seed_default_event_if_empty(db)
    events = db.query(Event).order_by(Event.created_at.desc()).all()
    return [enrich_event_stats(e, db) for e in events]


@router.post("", response_model=EventResponse, status_code=status.HTTP_201_CREATED)
def create_event(payload: EventCreate, db: Session = Depends(get_db)):
    """Create a new event and automatically initialize its AI feedback form."""
    new_event = Event(
        id=str(uuid.uuid4()),
        title=payload.title,
        subtitle=payload.subtitle or "",
        event_type=payload.event_type,
        organization=payload.organization,
        date=payload.date,
        location=payload.location,
        description=payload.description or "",
        tracks=json.dumps(payload.tracks),
        speakers=json.dumps(payload.speakers),
        certificate_template_id=payload.certificate_template_id,
        signature_name=payload.signature_name,
        signature_title=payload.signature_title,
        certificate_title=payload.certificate_title,
        certificate_issue_date=payload.certificate_issue_date or payload.date,
        require_feedback_for_cert=payload.require_feedback_for_cert,
        status="Feedback Open"
    )
    db.add(new_event)
    db.flush()

    # Automatically generate tailored AI feedback form questions
    event_dict = {
        "title": new_event.title,
        "subtitle": new_event.subtitle,
        "event_type": new_event.event_type,
        "organization": new_event.organization,
        "description": new_event.description,
        "tracks": payload.tracks,
        "speakers": payload.speakers
    }
    ai_form = generate_feedback_questions(event_dict, target_count=5)
    
    form = FeedbackForm(
        id=str(uuid.uuid4()),
        event_id=new_event.id,
        title=ai_form.get("title", f"Feedback for {new_event.title}"),
        description=ai_form.get("description", "Please take a moment to provide your valuable feedback."),
        questions=json.dumps(ai_form.get("questions", [])),
        is_published=True
    )
    db.add(form)
    db.commit()
    db.refresh(new_event)

    return enrich_event_stats(new_event, db)


@router.get("/{event_id}", response_model=EventResponse)
def get_event(event_id: str, db: Session = Depends(get_db)):
    """Fetch single event details and metrics."""
    event = db.query(Event).filter(Event.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    return enrich_event_stats(event, db)


@router.put("/{event_id}", response_model=EventResponse)
def update_event(event_id: str, payload: EventUpdate, db: Session = Depends(get_db)):
    """Update event configurations or certificate options."""
    event = db.query(Event).filter(Event.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    update_data = payload.dict(exclude_unset=True)
    for field, val in update_data.items():
        if field in ("tracks", "speakers") and val is not None:
            setattr(event, field, json.dumps(val))
        else:
            setattr(event, field, val)

    db.commit()
    db.refresh(event)
    return enrich_event_stats(event, db)


@router.delete("/{event_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_event(event_id: str, db: Session = Depends(get_db)):
    """Delete an event and all associated records."""
    event = db.query(Event).filter(Event.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    db.delete(event)
    db.commit()
    return None


@router.post("/{event_id}/seed-sample-participants")
def seed_participants_for_event(event_id: str, db: Session = Depends(get_db)):
    """Quick helper to populate the event with 12 sample participants for fast demoing."""
    event = db.query(Event).filter(Event.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    created = 0
    generated_cert_ids = set()
    try:
        for idx, p in enumerate(SAMPLE_PARTICIPANTS):
            norm_email = p["email"].strip().lower()
            exists = db.query(Participant).filter(
                Participant.event_id == event_id,
                func.lower(Participant.email) == norm_email
            ).first()
            if not exists:
                cert_code = generate_unique_certificate_id(
                    db=db,
                    event=event,
                    existing_in_batch=generated_cert_ids
                )
                part = Participant(
                    id=str(uuid.uuid4()),
                    event_id=event_id,
                    name=p["name"],
                    email=norm_email,
                    role=p["role"],
                    organization=p["organization"],
                    feedback_token=str(uuid.uuid4()),
                    feedback_status="Not Sent",
                    certificate_id=cert_code,
                    certificate_status="Pending"
                )
                db.add(part)
                created += 1

        db.commit()
        return {"message": f"Successfully loaded {created} sample participants into {event.title}."}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=f"Failed to seed sample participants: {str(e)}")

