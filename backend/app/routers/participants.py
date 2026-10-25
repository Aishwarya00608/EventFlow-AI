import csv
import io
import uuid
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import or_, func
from sqlalchemy.exc import SQLAlchemyError

from ..database import get_db
from ..models import Event, Participant
from ..schemas import ParticipantCreate, ParticipantResponse
from ..services.certificate_service import generate_unique_certificate_id

router = APIRouter(tags=["participants"])

@router.get("/api/events/{event_id}/participants", response_model=List[ParticipantResponse])
def get_participants(
    event_id: str,
    search: Optional[str] = None,
    feedback_status: Optional[str] = None,
    cert_status: Optional[str] = None,
    role: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """List participants for an event with search and filtering."""
    query = db.query(Participant).filter(Participant.event_id == event_id)
    
    if search:
        search_pattern = f"%{search}%"
        query = query.filter(
            or_(
                Participant.name.ilike(search_pattern),
                Participant.email.ilike(search_pattern),
                Participant.organization.ilike(search_pattern),
                Participant.certificate_id.ilike(search_pattern)
            )
        )
    
    if feedback_status:
        query = query.filter(Participant.feedback_status == feedback_status)
        
    if cert_status:
        query = query.filter(Participant.certificate_status == cert_status)
        
    if role:
        query = query.filter(Participant.role == role)
        
    return query.order_by(Participant.created_at.asc()).all()


@router.post("/api/events/{event_id}/participants", response_model=ParticipantResponse, status_code=status.HTTP_201_CREATED)
def add_participant(event_id: str, payload: ParticipantCreate, db: Session = Depends(get_db)):
    """Add a participant manually."""
    event = db.query(Event).filter(Event.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
        
    norm_email = payload.email.strip().lower()
    existing = db.query(Participant).filter(
        Participant.event_id == event_id,
        func.lower(Participant.email) == norm_email
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Participant with this email already registered in this event")

    cert_code = generate_unique_certificate_id(db=db, event=event)

    part = Participant(
        id=str(uuid.uuid4()),
        event_id=event_id,
        name=payload.name.strip(),
        email=norm_email,
        role=payload.role or "Attendee",
        organization=payload.organization or "",
        feedback_token=str(uuid.uuid4()),
        feedback_status="Not Sent",
        certificate_id=cert_code,
        certificate_status="Pending"
    )
    try:
        db.add(part)
        db.commit()
        db.refresh(part)
        return part
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=f"Failed to add participant: {str(e)}")


@router.post("/api/events/{event_id}/participants/upload-csv")
async def upload_participants_csv(
    event_id: str,
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    """
    Upload and parse participant CSV file.
    Intelligently maps column variations (Name, Full Name, Email, E-mail, Role, Track, Organization, College, University, School).
    """
    event = db.query(Event).filter(Event.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    content = await file.read()
    try:
        text_content = content.decode("utf-8-sig")
    except UnicodeDecodeError:
        text_content = content.decode("latin-1")

    csv_reader = csv.reader(io.StringIO(text_content))
    rows = list(csv_reader)
    if not rows:
        raise HTTPException(status_code=400, detail="The uploaded CSV file is empty")

    header = [h.strip().lower() for h in rows[0]]
    
    # Column mapping heuristic
    name_idx = -1
    email_idx = -1
    role_idx = -1
    org_idx = -1

    for idx, col in enumerate(header):
        if col in ("name", "full name", "participant name", "attendee name", "hacker name", "first name"):
            name_idx = idx
        elif col in ("email", "e-mail", "email address"):
            email_idx = idx
        elif col in ("role", "track", "participant role", "type"):
            role_idx = idx
        elif col in ("organization", "org", "college", "university", "school", "company", "team"):
            org_idx = idx

    if email_idx == -1:
        raise HTTPException(status_code=400, detail="CSV must contain an 'Email' or 'Email Address' column")
    if name_idx == -1:
        # If no name column, use portion of email
        name_idx = None

    created_count = 0
    skipped_count = 0
    updated_count = 0
    seen_emails_in_batch = set()
    generated_cert_ids_in_batch = set()

    try:
        for row in rows[1:]:
            if not row or len(row) <= email_idx or not row[email_idx].strip():
                continue
                
            email = row[email_idx].strip().lower()

            # Deduplicate duplicate rows within the same uploaded CSV batch
            if email in seen_emails_in_batch:
                skipped_count += 1
                continue
            seen_emails_in_batch.add(email)

            if name_idx is not None and len(row) > name_idx and row[name_idx].strip():
                name = row[name_idx].strip()
            else:
                name = email.split("@")[0].replace(".", " ").title()

            role = row[role_idx].strip() if (role_idx != -1 and len(row) > role_idx and row[role_idx].strip()) else "Attendee"
            org = row[org_idx].strip() if (org_idx != -1 and len(row) > org_idx and row[org_idx].strip()) else ""

            # Check existing participant in this event
            existing = db.query(Participant).filter(
                Participant.event_id == event_id,
                func.lower(Participant.email) == email
            ).first()
            if existing:
                # Update existing participant details if new non-empty information is provided
                updated = False
                if name and name != existing.name:
                    existing.name = name
                    updated = True
                if role and role != "Attendee" and role != existing.role:
                    existing.role = role
                    updated = True
                if org and org != existing.organization:
                    existing.organization = org
                    updated = True

                if updated:
                    updated_count += 1
                else:
                    skipped_count += 1
                continue

            # Generate collision-free certificate ID checking both DB and batch
            cert_code = generate_unique_certificate_id(
                db=db,
                event=event,
                existing_in_batch=generated_cert_ids_in_batch
            )
            part = Participant(
                id=str(uuid.uuid4()),
                event_id=event_id,
                name=name,
                email=email,
                role=role,
                organization=org,
                feedback_token=str(uuid.uuid4()),
                feedback_status="Not Sent",
                certificate_id=cert_code,
                certificate_status="Pending"
            )
            db.add(part)
            created_count += 1

        db.commit()
    except HTTPException:
        db.rollback()
        raise
    except SQLAlchemyError as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Database error during participant upload: {str(e)}"
        )
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to process CSV upload: {str(e)}"
        )

    total_existing_handled = skipped_count + updated_count
    if updated_count > 0:
        msg = f"Successfully imported {created_count} participants ({skipped_count} skipped, {updated_count} updated)."
    elif total_existing_handled > 0:
        msg = f"Successfully imported {created_count} participants ({total_existing_handled} duplicates skipped)."
    else:
        msg = f"Successfully imported {created_count} participants."

    return {
        "success": True,
        "created_count": created_count,
        "skipped_count": total_existing_handled,
        "updated_count": updated_count,
        "message": msg
    }


@router.delete("/api/participants/{participant_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_participant(participant_id: str, db: Session = Depends(get_db)):
    """Delete a participant."""
    part = db.query(Participant).filter(Participant.id == participant_id).first()
    if not part:
        raise HTTPException(status_code=404, detail="Participant not found")
    try:
        db.delete(part)
        db.commit()
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=f"Failed to delete participant: {str(e)}")
    return None

