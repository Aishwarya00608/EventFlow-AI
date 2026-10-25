from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import Event, Participant, EmailLog
from ..schemas import EmailLogResponse
from ..services.email_service import send_feedback_invitation, send_certificate_email

router = APIRouter(tags=["emails"])

class BulkEmailRequest(BaseModel):
    participant_ids: Optional[List[str]] = None  # None means all applicable participants


@router.post("/api/events/{event_id}/emails/send-feedback-invitations")
def dispatch_feedback_invitations(
    event_id: str,
    payload: Optional[BulkEmailRequest] = None,
    db: Session = Depends(get_db)
):
    """
    Send personalized feedback invitation emails with unique tokens.
    Supports live Resend API and high-fidelity Simulation Mode.
    """
    event = db.query(Event).filter(Event.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    query = db.query(Participant).filter(Participant.event_id == event_id)
    if payload and payload.participant_ids:
        query = query.filter(Participant.id.in_(payload.participant_ids))
    else:
        # Default: only those who haven't already submitted feedback
        query = query.filter(Participant.feedback_status != "Submitted")

    recipients = query.all()
    if not recipients:
        raise HTTPException(status_code=400, detail="No eligible participants to send feedback invitations to.")

    event_dict = {
        "id": event.id,
        "title": event.title,
        "organization": event.organization
    }

    sent_count = 0
    sim_count = 0

    for p in recipients:
        part_dict = {
            "id": p.id,
            "name": p.name,
            "email": p.email,
            "feedback_token": p.feedback_token
        }
        res = send_feedback_invitation(part_dict, event_dict)
        if res.get("simulation"):
            sim_count += 1
        else:
            sent_count += 1

    mode_label = "simulated" if sim_count > 0 and sent_count == 0 else "sent"
    return {
        "success": True,
        "total_dispatched": len(recipients),
        "live_sent": sent_count,
        "simulated": sim_count,
        "message": f"Successfully processed {len(recipients)} feedback invitation emails ({mode_label})."
    }


@router.post("/api/events/{event_id}/emails/send-certificates")
def dispatch_certificates(
    event_id: str,
    payload: Optional[BulkEmailRequest] = None,
    db: Session = Depends(get_db)
):
    """
    Send official certificates to participants who have completed feedback.
    """
    event = db.query(Event).filter(Event.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    query = db.query(Participant).filter(Participant.event_id == event_id)
    if payload and payload.participant_ids:
        query = query.filter(Participant.id.in_(payload.participant_ids))
    else:
        # Default: only those whose certificates are generated or feedback submitted
        if event.require_feedback_for_cert:
            query = query.filter(Participant.feedback_status == "Submitted")

    recipients = query.all()
    if not recipients:
        raise HTTPException(
            status_code=400,
            detail="No participants currently eligible for certificate delivery. Participants must submit feedback first."
        )

    event_dict = {
        "id": event.id,
        "title": event.title,
        "organization": event.organization
    }

    sent_count = 0
    sim_count = 0

    for p in recipients:
        part_dict = {
            "id": p.id,
            "name": p.name,
            "email": p.email,
            "certificate_id": p.certificate_id
        }
        res = send_certificate_email(part_dict, event_dict)
        if res.get("simulation"):
            sim_count += 1
        else:
            sent_count += 1

    mode_label = "simulated" if sim_count > 0 and sent_count == 0 else "sent"
    return {
        "success": True,
        "total_dispatched": len(recipients),
        "live_sent": sent_count,
        "simulated": sim_count,
        "message": f"Successfully dispatched {len(recipients)} certificate emails ({mode_label})."
    }


@router.get("/api/events/{event_id}/emails/logs", response_model=List[EmailLogResponse])
def get_email_logs(event_id: str, db: Session = Depends(get_db)):
    """Retrieve full audit history of all dispatched emails for this event."""
    logs = db.query(EmailLog).filter(EmailLog.event_id == event_id).order_by(EmailLog.sent_at.desc()).limit(100).all()
    return logs
