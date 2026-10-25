import os
import io
import re
import secrets
import zipfile
from pathlib import Path
from typing import Dict, Any, Optional, List, Set
from reportlab.lib.pagesizes import letter, landscape
from reportlab.lib import colors
from reportlab.pdfgen import canvas
from reportlab.graphics.shapes import Drawing, Rect, Circle, String, Group
import qrcode
from PIL import Image
import pymupdf  # PyMuPDF
from sqlalchemy.orm import Session

from ..config import CERTIFICATES_DIR, FRONTEND_URL
from ..models import Participant, Event

PAGE_WIDTH, PAGE_HEIGHT = landscape(letter)  # 792 x 612 pt

def generate_unique_certificate_id(
    db: Session,
    event: Optional[Event] = None,
    existing_in_batch: Optional[Set[str]] = None,
    prefix_override: Optional[str] = None
) -> str:
    """
    Generate a cryptographically collision-free, human-readable certificate ID.
    Format: EF-{TYPE_CODE}-{RANDOM_HEX} (e.g., EF-HACK-9A4B7C2D).
    
    Verifies that the generated ID does not exist in:
    1. The `existing_in_batch` set (for multiple participants generated in the same transaction/batch).
    2. The database across all participants across all events.
    """
    if prefix_override:
        cleaned = re.sub(r"[^A-Za-z0-9]", "", prefix_override).upper()
        type_prefix = cleaned[:4] if cleaned else "EVNT"
    elif event and event.event_type:
        cleaned = re.sub(r"[^A-Za-z0-9]", "", event.event_type).upper()
        type_prefix = cleaned[:4] if cleaned else "EVNT"
    else:
        type_prefix = "EVNT"

    prefix = f"EF-{type_prefix}"

    # Generate random uppercase hexadecimal suffix (4 bytes = 8 hex chars -> 4.29 billion possibilities)
    max_attempts = 1000
    for _ in range(max_attempts):
        suffix = secrets.token_hex(4).upper()
        candidate = f"{prefix}-{suffix}"

        # 1. Check in-memory batch set
        if existing_in_batch is not None and candidate in existing_in_batch:
            continue

        # 2. Check database globally across participants table
        exists = db.query(Participant.id).filter(Participant.certificate_id == candidate).first()
        if exists:
            continue

        # Candidate is globally and batch-locally unique
        if existing_in_batch is not None:
            existing_in_batch.add(candidate)
        return candidate

    # Fallback to longer hex if 1000 attempts collide
    fallback_candidate = f"{prefix}-{secrets.token_hex(8).upper()}"
    if existing_in_batch is not None:
        existing_in_batch.add(fallback_candidate)
    return fallback_candidate


def generate_qr_code_image(verify_url: str, size: int = 140) -> io.BytesIO:
    """Generate high-resolution QR code pointing to certificate verification URL."""
    qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_M,
        box_size=10,
        border=2,
    )
    qr.add_data(verify_url)
    qr.make(fit=True)
    img = qr.make_image(fill_color="#1e293b", back_color="#ffffff")
    
    img_byte_arr = io.BytesIO()
    img.save(img_byte_arr, format='PNG')
    img_byte_arr.seek(0)
    return img_byte_arr

def draw_official_seal(c: canvas.Canvas, cx: float, cy: float, radius: float = 38):
    """Draw a vector seal badge with star emblem and circular certification stamp."""
    c.saveState()
    
    # Outer serrated / dual ring
    c.setStrokeColor(colors.HexColor("#d97706"))
    c.setFillColor(colors.HexColor("#fffbeb"))
    c.setLineWidth(2)
    c.circle(cx, cy, radius, stroke=1, fill=1)
    
    c.setStrokeColor(colors.HexColor("#f59e0b"))
    c.setLineWidth(1)
    c.circle(cx, cy, radius - 4, stroke=1, fill=0)
    
    c.setStrokeColor(colors.HexColor("#b45309"))
    c.setLineWidth(0.5)
    c.circle(cx, cy, radius - 8, stroke=1, fill=0)
    
    # Central verified emblem text
    c.setFillColor(colors.HexColor("#92400e"))
    c.setFont("Helvetica-Bold", 8)
    c.drawCentredString(cx, cy + 10, "★ ★ ★")
    c.setFont("Helvetica-Bold", 9)
    c.drawCentredString(cx, cy - 2, "VERIFIED")
    c.setFont("Helvetica", 6.5)
    c.drawCentredString(cx, cy - 12, "EVENTFLOW AI")
    c.drawCentredString(cx, cy - 20, "AUTHENTIC")
    
    c.restoreState()

def draw_template_borders(c: canvas.Canvas, template_id: str):
    """Draw themed decorative border and background graphics."""
    c.saveState()
    
    if template_id == "academic_gold":
        # Warm cream background
        c.setFillColor(colors.HexColor("#fefdf9"))
        c.rect(0, 0, PAGE_WIDTH, PAGE_HEIGHT, stroke=0, fill=1)
        
        # Dual gold foil border
        c.setStrokeColor(colors.HexColor("#b45309"))
        c.setLineWidth(3)
        c.rect(28, 28, PAGE_WIDTH - 56, PAGE_HEIGHT - 56, stroke=1, fill=0)
        
        c.setStrokeColor(colors.HexColor("#d97706"))
        c.setLineWidth(1)
        c.rect(34, 34, PAGE_WIDTH - 68, PAGE_HEIGHT - 68, stroke=1, fill=0)
        
        # Elegant corner flourishes
        for x, y, dx, dy in [(34, 34, 25, 25), (PAGE_WIDTH-34, 34, -25, 25),
                            (34, PAGE_HEIGHT-34, 25, -25), (PAGE_WIDTH-34, PAGE_HEIGHT-34, -25, -25)]:
            c.setStrokeColor(colors.HexColor("#b45309"))
            c.setLineWidth(1.5)
            c.line(x, y, x + dx, y)
            c.line(x, y, x, y + dy)
            
    elif template_id == "tech_hackathon":
        # Crisp off-white with dark charcoal tech borders
        c.setFillColor(colors.HexColor("#fafafc"))
        c.rect(0, 0, PAGE_WIDTH, PAGE_HEIGHT, stroke=0, fill=1)
        
        # Deep indigo/slate geometric border
        c.setStrokeColor(colors.HexColor("#0f172a"))
        c.setLineWidth(2.5)
        c.rect(30, 30, PAGE_WIDTH - 60, PAGE_HEIGHT - 60, stroke=1, fill=0)
        
        # Cyan neon accent bar at top
        c.setFillColor(colors.HexColor("#0284c7"))
        c.rect(30, PAGE_HEIGHT - 38, PAGE_WIDTH - 60, 8, stroke=0, fill=1)
        
        # Subtle tech corner marks
        c.setStrokeColor(colors.HexColor("#0284c7"))
        c.setLineWidth(2)
        c.rect(40, 40, 12, 12, stroke=1, fill=0)
        c.rect(PAGE_WIDTH - 52, 40, 12, 12, stroke=1, fill=0)
        c.rect(40, PAGE_HEIGHT - 52, 12, 12, stroke=1, fill=0)
        c.rect(PAGE_WIDTH - 52, PAGE_HEIGHT - 52, 12, 12, stroke=1, fill=0)
        
    elif template_id == "creative_cyan":
        # Fresh pastel background
        c.setFillColor(colors.HexColor("#f8fafc"))
        c.rect(0, 0, PAGE_WIDTH, PAGE_HEIGHT, stroke=0, fill=1)
        
        # Sky blue top banner
        c.setFillColor(colors.HexColor("#0ea5e9"))
        c.rect(30, PAGE_HEIGHT - 45, PAGE_WIDTH - 60, 15, stroke=0, fill=1)
        
        # Mint bottom accent
        c.setFillColor(colors.HexColor("#10b981"))
        c.rect(30, 30, PAGE_WIDTH - 60, 6, stroke=0, fill=1)
        
        # Border
        c.setStrokeColor(colors.HexColor("#cbd5e1"))
        c.setLineWidth(1)
        c.rect(30, 30, PAGE_WIDTH - 60, PAGE_HEIGHT - 60, stroke=1, fill=0)
        
    else:  # modern_minimal (default)
        # Warm pure card aesthetic
        c.setFillColor(colors.HexColor("#ffffff"))
        c.rect(0, 0, PAGE_WIDTH, PAGE_HEIGHT, stroke=0, fill=1)
        
        # Soft outer frame
        c.setStrokeColor(colors.HexColor("#e2e8f0"))
        c.setLineWidth(1.5)
        c.rect(30, 30, PAGE_WIDTH - 60, PAGE_HEIGHT - 60, stroke=1, fill=0)
        
        # Inner fine line
        c.setStrokeColor(colors.HexColor("#f1f5f9"))
        c.setLineWidth(0.75)
        c.rect(38, 38, PAGE_WIDTH - 76, PAGE_HEIGHT - 76, stroke=1, fill=0)
        
        # Top brand pill
        c.setFillColor(colors.HexColor("#6366f1"))
        c.rect(PAGE_WIDTH / 2 - 40, PAGE_HEIGHT - 34, 80, 4, stroke=0, fill=1)

    c.restoreState()

def generate_single_certificate(
    participant_data: Dict[str, Any],
    event_data: Dict[str, Any],
    output_filename: Optional[str] = None
) -> str:
    """
    Generate a personalized vector PDF certificate with QR verification code and digital seal.
    Returns the absolute path to the generated PDF.
    """
    cert_id = participant_data.get("certificate_id") or f"EF-{participant_data.get('id', 'CERT')[:8].upper()}"
    if not output_filename:
        output_filename = f"{cert_id}.pdf"
    
    pdf_path = CERTIFICATES_DIR / output_filename
    
    # Check if custom template image/pdf is provided
    custom_template = event_data.get("custom_template_path")
    template_id = event_data.get("certificate_template_id", "modern_minimal")

    c = canvas.Canvas(str(pdf_path), pagesize=landscape(letter))
    c.setTitle(f"Certificate - {participant_data.get('name')} - {event_data.get('title')}")
    c.setAuthor(event_data.get("organization", "EventFlow AI"))
    
    # 1. Background / Template
    if custom_template and os.path.exists(custom_template):
        try:
            c.drawImage(custom_template, 0, 0, width=PAGE_WIDTH, height=PAGE_HEIGHT)
        except Exception:
            draw_template_borders(c, template_id)
    else:
        draw_template_borders(c, template_id)
        
    # 2. Organization & Header
    org_name = (event_data.get("organization") or "ORGANIZING COMMITTEE").upper()
    c.setFont("Helvetica-Bold", 11)
    c.setFillColor(colors.HexColor("#64748b"))
    c.drawCentredString(PAGE_WIDTH / 2, PAGE_HEIGHT - 80, org_name)
    
    # 3. Certificate Title
    cert_title = (event_data.get("certificate_title") or "CERTIFICATE OF PARTICIPATION").upper()
    c.setFont("Helvetica-Bold", 26)
    c.setFillColor(colors.HexColor("#0f172a"))
    c.drawCentredString(PAGE_WIDTH / 2, PAGE_HEIGHT - 120, cert_title)
    
    # Subtitle line
    c.setFont("Helvetica", 11)
    c.setFillColor(colors.HexColor("#64748b"))
    c.drawCentredString(PAGE_WIDTH / 2, PAGE_HEIGHT - 148, "THIS CERTIFICATE IS PROUDLY PRESENTED TO")
    
    # 4. Recipient Name (Prominent & Centered)
    recipient_name = participant_data.get("name", "Participant Name")
    c.setFont("Helvetica-Bold", 32)
    c.setFillColor(colors.HexColor("#1e293b"))
    c.drawCentredString(PAGE_WIDTH / 2, PAGE_HEIGHT - 200, recipient_name)
    
    # Name underline accent
    c.setStrokeColor(colors.HexColor("#3b82f6"))
    c.setLineWidth(2)
    c.line(PAGE_WIDTH / 2 - 120, PAGE_HEIGHT - 212, PAGE_WIDTH / 2 + 120, PAGE_HEIGHT - 212)
    
    # 5. Role & Event Context
    role = participant_data.get("role", "Attendee")
    event_title = event_data.get("title", "Event")
    event_date = event_data.get("date") or "2026"
    event_location = event_data.get("location") or "Virtual"
    
    if role.lower() in ("winner", "1st place", "champion"):
        desc_text = f"for outstanding achievement and winning at {event_title}"
    elif role.lower() in ("speaker", "keynote"):
        desc_text = f"in recognition of valuable contribution as a distinguished speaker at {event_title}"
    elif role.lower() in ("mentor", "judge"):
        desc_text = f"in deep appreciation for mentorship and judging at {event_title}"
    else:
        desc_text = f"for active participation and successful completion of {event_title}"
        
    c.setFont("Helvetica", 13)
    c.setFillColor(colors.HexColor("#334155"))
    c.drawCentredString(PAGE_WIDTH / 2, PAGE_HEIGHT - 250, desc_text)
    
    detail_text = f"Organized on {event_date}  •  Venue: {event_location}"
    c.setFont("Helvetica-Oblique", 10.5)
    c.setFillColor(colors.HexColor("#64748b"))
    c.drawCentredString(PAGE_WIDTH / 2, PAGE_HEIGHT - 275, detail_text)
    
    # 6. Verification QR Code (Bottom Left)
    verify_url = f"{FRONTEND_URL}/verify/{cert_id}"
    try:
        qr_stream = generate_qr_code_image(verify_url, size=90)
        from reportlab.lib.utils import ImageReader
        qr_img = ImageReader(qr_stream)
        c.drawImage(qr_img, 70, 70, width=80, height=80)
        
        # QR Code Label & ID
        c.setFont("Helvetica", 7.5)
        c.setFillColor(colors.HexColor("#64748b"))
        c.drawString(70, 60, "Scan to verify authenticity")
        c.setFont("Courier-Bold", 8)
        c.setFillColor(colors.HexColor("#1e293b"))
        c.drawString(70, 48, f"ID: {cert_id}")
    except Exception as e:
        c.setFont("Courier-Bold", 8)
        c.drawString(70, 60, f"Verification ID: {cert_id}")
        
    # 7. Official Seal (Center Bottom)
    draw_official_seal(c, PAGE_WIDTH / 2, 110, radius=38)
    
    # 8. Organizer Signature & Details (Bottom Right)
    sig_name = event_data.get("signature_name") or "Alex Morgan"
    sig_title = event_data.get("signature_title") or "Organizing Committee Lead"
    sig_image = event_data.get("signature_image_path")
    
    sig_x = PAGE_WIDTH - 240
    sig_y = 95
    
    if sig_image and os.path.exists(sig_image):
        try:
            c.drawImage(sig_image, sig_x + 10, sig_y + 15, width=120, height=45, preserveAspectRatio=True, mask='auto')
        except Exception:
            # Fallback script font simulation
            c.setFont("Times-Italic", 20)
            c.setFillColor(colors.HexColor("#1e293b"))
            c.drawCentredString(sig_x + 75, sig_y + 25, sig_name)
    else:
        # Elegant cursive script simulation
        c.setFont("Times-Italic", 22)
        c.setFillColor(colors.HexColor("#0f172a"))
        c.drawCentredString(sig_x + 75, sig_y + 25, sig_name)
        
    # Signature line
    c.setStrokeColor(colors.HexColor("#94a3b8"))
    c.setLineWidth(1)
    c.line(sig_x, sig_y + 15, sig_x + 150, sig_y + 15)
    
    c.setFont("Helvetica-Bold", 10)
    c.setFillColor(colors.HexColor("#1e293b"))
    c.drawCentredString(sig_x + 75, sig_y + 2, sig_name)
    
    c.setFont("Helvetica", 8)
    c.setFillColor(colors.HexColor("#64748b"))
    c.drawCentredString(sig_x + 75, sig_y - 11, sig_title)
    
    # Issue date stamp
    issue_date = event_data.get("certificate_issue_date") or event_date or "October 2026"
    c.setFont("Helvetica", 7.5)
    c.setFillColor(colors.HexColor("#94a3b8"))
    c.drawCentredString(PAGE_WIDTH / 2, 48, f"Issued on {issue_date}  •  Cryptographically Indexed & Verified")

    c.showPage()
    c.save()

    # Generate PNG thumbnail using PyMuPDF for snappy web preview
    generate_certificate_thumbnail(str(pdf_path))
    
    return str(pdf_path)


def generate_certificate_thumbnail(pdf_path_str: str) -> Optional[str]:
    """Convert first page of PDF certificate to PNG thumbnail for instant frontend preview."""
    try:
        doc = pymupdf.open(pdf_path_str)
        if len(doc) > 0:
            page = doc[0]
            pix = page.get_pixmap(dpi=150)
            thumb_path = pdf_path_str.replace(".pdf", ".png")
            pix.save(thumb_path)
            doc.close()
            return thumb_path
        doc.close()
    except Exception:
        pass
    return None


def generate_certificates_bulk(
    participants: List[Dict[str, Any]],
    event_data: Dict[str, Any]
) -> Dict[str, Any]:
    """
    Generate certificates for multiple participants and bundle them into a ZIP archive.
    """
    generated_count = 0
    pdf_files = []
    
    for p in participants:
        pdf_path = generate_single_certificate(p, event_data)
        pdf_files.append(pdf_path)
        generated_count += 1
        
    # Create ZIP archive
    event_id = event_data.get("id", "event")
    zip_filename = f"certificates_{event_id}.zip"
    zip_path = CERTIFICATES_DIR / zip_filename
    
    with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as zipf:
        for file in pdf_files:
            if os.path.exists(file):
                zipf.write(file, arcname=os.path.basename(file))
                
    return {
        "generated_count": generated_count,
        "zip_path": str(zip_path),
        "zip_filename": zip_filename,
        "download_url": f"/static/certificates/{zip_filename}"
    }
