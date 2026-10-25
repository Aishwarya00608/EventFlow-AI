import os
import shutil
import uuid
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Query, Response, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import Event, Participant
from ..config import CERTIFICATES_DIR, TEMPLATES_DIR
from ..services.certificate_service import generate_single_certificate, generate_certificates_bulk
from ..schemas import CertificateVerifyResponse

router = APIRouter(tags=["certificates"])

@router.post("/api/events/{event_id}/certificates/generate-all")
def generate_all_certificates(
    event_id: str,
    force_all: bool = Query(False, description="Generate even if participant has not submitted feedback"),
    db: Session = Depends(get_db)
):
    """
    Generate certificates for all eligible participants (or all if force_all=True).
    """
    event = db.query(Event).filter(Event.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    query = db.query(Participant).filter(Participant.event_id == event_id)
    if event.require_feedback_for_cert and not force_all:
        query = query.filter(Participant.feedback_status == "Submitted")

    eligible = query.all()
    if not eligible:
        raise HTTPException(
            status_code=400,
            detail="No participants currently eligible for certificate generation. Participants must submit feedback first, or toggle 'Require Feedback for Certificate' off."
        )

    event_dict = {
        "id": event.id,
        "title": event.title,
        "organization": event.organization,
        "date": event.date,
        "location": event.location,
        "certificate_template_id": event.certificate_template_id,
        "custom_template_path": event.custom_template_path,
        "signature_name": event.signature_name,
        "signature_title": event.signature_title,
        "signature_image_path": event.signature_image_path,
        "certificate_title": event.certificate_title,
        "certificate_issue_date": event.certificate_issue_date
    }

    part_dicts = []
    for p in eligible:
        part_dicts.append({
            "id": p.id,
            "name": p.name,
            "role": p.role,
            "certificate_id": p.certificate_id
        })

    bulk_res = generate_certificates_bulk(part_dicts, event_dict)

    # Update database status
    for p in eligible:
        p.certificate_status = "Generated"
        p.certificate_file_path = str(CERTIFICATES_DIR / f"{p.certificate_id}.pdf")

    event.status = "Certificates Ready"
    db.commit()

    return {
        "success": True,
        "generated_count": bulk_res["generated_count"],
        "zip_url": bulk_res["download_url"],
        "message": f"Successfully generated {bulk_res['generated_count']} certificates."
    }


@router.post("/api/participants/{participant_id}/certificate/generate")
def generate_single_participant_certificate(participant_id: str, db: Session = Depends(get_db)):
    """Generate or re-generate certificate for a specific participant."""
    part = db.query(Participant).filter(Participant.id == participant_id).first()
    if not part:
        raise HTTPException(status_code=404, detail="Participant not found")

    event = db.query(Event).filter(Event.id == part.event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    event_dict = {
        "id": event.id,
        "title": event.title,
        "organization": event.organization,
        "date": event.date,
        "location": event.location,
        "certificate_template_id": event.certificate_template_id,
        "custom_template_path": event.custom_template_path,
        "signature_name": event.signature_name,
        "signature_title": event.signature_title,
        "signature_image_path": event.signature_image_path,
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
    part.certificate_status = "Generated"
    part.certificate_file_path = pdf_path
    db.commit()

    return {
        "success": True,
        "certificate_id": part.certificate_id,
        "download_url": f"/static/certificates/{part.certificate_id}.pdf",
        "thumbnail_url": f"/static/certificates/{part.certificate_id}.png"
    }


@router.get("/api/public/verify/{certificate_id}", response_model=CertificateVerifyResponse)
def verify_certificate(certificate_id: str, db: Session = Depends(get_db)):
    """
    Public verification endpoint to authenticate a certificate ID.
    Used by employers, recruiters, and attendees.
    """
    part = db.query(Participant).filter(Participant.certificate_id == certificate_id).first()
    if not part:
        return CertificateVerifyResponse(
            valid=False,
            certificate_id=certificate_id,
            participant_name="Unknown",
            event_title="Unknown",
            event_organization="Unknown",
            event_date="Unknown",
            role="Unknown",
            issue_date="Unknown",
            certificate_title="Unknown",
            download_url=None,
            verification_hash=None
        )

    event = db.query(Event).filter(Event.id == part.event_id).first()
    
    # Ensure certificate PDF is generated
    pdf_filename = f"{part.certificate_id}.pdf"
    pdf_path = CERTIFICATES_DIR / pdf_filename
    if not pdf_path.exists() and event:
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
        generate_single_certificate(part_dict, event_dict)

    return CertificateVerifyResponse(
        valid=True,
        certificate_id=part.certificate_id,
        participant_name=part.name,
        event_title=event.title if event else "Event",
        event_organization=event.organization if event else "Organization",
        event_date=event.date if event else "",
        role=part.role,
        issue_date=event.certificate_issue_date or event.date if event else "",
        certificate_title=event.certificate_title if event else "Certificate of Participation",
        download_url=f"/static/certificates/{part.certificate_id}.pdf",
        verification_hash=f"SHA256-{uuid.uuid5(uuid.NAMESPACE_DNS, part.certificate_id).hex[:16]}"
    )


@router.get("/api/events/{event_id}/certificates/download-zip")
def download_certificates_zip(event_id: str):
    """Download bundled ZIP of all generated certificates for an event."""
    zip_path = CERTIFICATES_DIR / f"certificates_{event_id}.zip"
    if not zip_path.exists():
        raise HTTPException(status_code=404, detail="No certificate bundle generated yet. Please click 'Generate Certificates' first.")
    return FileResponse(
        path=str(zip_path),
        filename=f"certificates_{event_id}.zip",
        media_type="application/zip"
    )


@router.post("/api/events/{event_id}/certificates/upload-custom-template")
async def upload_custom_template(
    event_id: str,
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    """Upload custom PNG/JPG/PDF background for certificates."""
    event = db.query(Event).filter(Event.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in (".png", ".jpg", ".jpeg", ".pdf"):
        raise HTTPException(status_code=400, detail="Only PNG, JPG, or PDF files are supported as custom templates")

    filename = f"template_{event_id}_{uuid.uuid4().hex[:8]}{ext}"
    dest_path = TEMPLATES_DIR / filename

    with open(dest_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    event.custom_template_path = str(dest_path)
    event.certificate_template_id = "custom"
    db.commit()

    return {
        "success": True,
        "template_path": f"/static/templates/{filename}",
        "message": "Custom certificate background template uploaded successfully."
    }
