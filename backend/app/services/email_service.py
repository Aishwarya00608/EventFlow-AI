import logging
import requests
from typing import Dict, Any, Optional
from datetime import datetime
from ..config import RESEND_API_KEY, RESEND_FROM_EMAIL, FRONTEND_URL, SIMULATION_MODE
from ..database import SessionLocal
from ..models import EmailLog, SystemSetting, Participant

logger = logging.getLogger("eventflow.email")

def get_configured_email_credentials():
    db = SessionLocal()
    try:
        key_record = db.query(SystemSetting).filter(SystemSetting.key == "resend_api_key").first()
        from_record = db.query(SystemSetting).filter(SystemSetting.key == "resend_from_email").first()
        sim_record = db.query(SystemSetting).filter(SystemSetting.key == "simulation_mode").first()
        
        api_key = key_record.value if (key_record and key_record.value) else RESEND_API_KEY
        from_email = from_record.value if (from_record and from_record.value) else RESEND_FROM_EMAIL
        sim_mode = sim_record.value.lower() == "true" if sim_record else SIMULATION_MODE
        return api_key, from_email, sim_mode
    finally:
        db.close()


def render_feedback_invitation_html(
    participant_name: str,
    event_title: str,
    organization: str,
    feedback_url: str
) -> str:
    """Generate modern, responsive HTML email for feedback invitation."""
    return f"""<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #fafaf9; margin: 0; padding: 24px; color: #1e293b; }}
    .container {{ max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; padding: 36px 32px; box-shadow: 0 4px 12px rgba(0,0,0,0.03); }}
    .badge {{ display: inline-block; padding: 4px 12px; background: #e0f2fe; color: #0284c7; border-radius: 9999px; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 16px; }}
    h1 {{ font-size: 22px; font-weight: 700; color: #0f172a; margin-top: 0; margin-bottom: 12px; }}
    p {{ font-size: 15px; line-height: 1.6; color: #475569; margin: 0 0 16px; }}
    .btn {{ display: inline-block; background: #0f172a; color: #ffffff !important; padding: 13px 28px; border-radius: 10px; font-size: 15px; font-weight: 600; text-decoration: none; margin: 18px 0 24px; transition: background 0.2s; }}
    .highlight-box {{ background: #f8fafc; border-left: 4px solid #3b82f6; padding: 14px 18px; border-radius: 0 8px 8px 0; margin: 20px 0; }}
    .footer {{ font-size: 12px; color: #94a3b8; text-align: center; margin-top: 32px; border-top: 1px solid #f1f5f9; padding-top: 20px; }}
  </style>
</head>
<body>
  <div class="container">
    <div class="badge">Official Event Closure</div>
    <h1>Thank you for joining {event_title}!</h1>
    <p>Hi <strong>{participant_name}</strong>,</p>
    <p>On behalf of <strong>{organization}</strong>, thank you for attending and participating in <strong>{event_title}</strong>.</p>
    
    <div class="highlight-box">
      <p style="margin: 0; font-size: 14px; color: #1e293b;">
        <strong>Certificate Eligibility:</strong> Your official, verified certificate of participation has been indexed. Please complete our 2-minute post-event survey to unlock your certificate instantly!
      </p>
    </div>

    <p>We take feedback seriously to continuously refine our workshops, technical tracks, and mentorship experience.</p>
    
    <div style="text-align: center;">
      <a href="{feedback_url}" class="btn" target="_blank">Share Feedback & Unlock Certificate &rarr;</a>
    </div>

    <p style="font-size: 13px; color: #64748b;">Or paste this direct link into your browser:<br>
      <a href="{feedback_url}" style="color: #2563eb; word-break: break-all;">{feedback_url}</a>
    </p>

    <div class="footer">
      Sent via EventFlow AI &bull; Automated Event Closure Platform<br>
      {organization}
    </div>
  </div>
</body>
</html>"""


def render_certificate_delivery_html(
    participant_name: str,
    event_title: str,
    organization: str,
    certificate_id: str,
    verify_url: str,
    download_url: str
) -> str:
    """Generate modern, responsive HTML email for certificate delivery."""
    return f"""<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #fafaf9; margin: 0; padding: 24px; color: #1e293b; }}
    .container {{ max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; padding: 36px 32px; box-shadow: 0 4px 12px rgba(0,0,0,0.03); }}
    .badge {{ display: inline-block; padding: 4px 12px; background: #dcfce7; color: #15803d; border-radius: 9999px; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 16px; }}
    h1 {{ font-size: 22px; font-weight: 700; color: #0f172a; margin-top: 0; margin-bottom: 12px; }}
    p {{ font-size: 15px; line-height: 1.6; color: #475569; margin: 0 0 16px; }}
    .btn {{ display: inline-block; background: #16a34a; color: #ffffff !important; padding: 13px 28px; border-radius: 10px; font-size: 15px; font-weight: 600; text-decoration: none; margin: 18px 0 24px; }}
    .cert-box {{ background: #f8fafc; border: 1px dashed #cbd5e1; border-radius: 12px; padding: 18px; text-align: center; margin: 20px 0; }}
    .footer {{ font-size: 12px; color: #94a3b8; text-align: center; margin-top: 32px; border-top: 1px solid #f1f5f9; padding-top: 20px; }}
  </style>
</head>
<body>
  <div class="container">
    <div class="badge">&#10003; Certificate Issued</div>
    <h1>Congratulations, {participant_name}!</h1>
    <p>Your official Certificate of Participation for <strong>{event_title}</strong> has been issued by <strong>{organization}</strong>.</p>
    
    <div class="cert-box">
      <div style="font-size: 12px; text-transform: uppercase; color: #64748b; font-weight: 600;">Verification Code</div>
      <div style="font-family: monospace; font-size: 18px; font-weight: 700; color: #0f172a; margin: 4px 0 8px;">{certificate_id}</div>
      <div style="font-size: 13px; color: #16a34a;">&#9679; Authenticated and cryptographically signed</div>
    </div>

    <div style="text-align: center;">
      <a href="{download_url}" class="btn" target="_blank">Download Certificate PDF &rarr;</a>
    </div>

    <p style="font-size: 14px; color: #475569;">
      You can also share and showcase your credential online. Anyone or potential employers can independently verify its authenticity via the public ledger portal:
      <br>
      <a href="{verify_url}" style="color: #2563eb; font-weight: 500;">{verify_url}</a>
    </p>

    <div class="footer">
      EventFlow AI &bull; Automated Credential &amp; Feedback Orchestration<br>
      {organization}
    </div>
  </div>
</body>
</html>"""


def send_feedback_invitation(
    participant: Dict[str, Any],
    event: Dict[str, Any]
) -> Dict[str, Any]:
    """
    Send or simulate sending a feedback invitation email.
    """
    api_key, from_email, sim_mode = get_configured_email_credentials()
    
    feedback_token = participant.get("feedback_token")
    feedback_url = f"{FRONTEND_URL}/feedback/{feedback_token}"
    recipient_email = participant.get("email")
    recipient_name = participant.get("name")
    event_title = event.get("title", "Event")
    organization = event.get("organization", "EventFlow AI")
    subject = f"Feedback Request & Certificate Access for {event_title}"

    html_body = render_feedback_invitation_html(
        participant_name=recipient_name,
        event_title=event_title,
        organization=organization,
        feedback_url=feedback_url
    )

    db = SessionLocal()
    try:
        # Check if live Resend API should be called
        if api_key and not sim_mode:
            try:
                headers = {
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json"
                }
                payload = {
                    "from": from_email,
                    "to": [recipient_email],
                    "subject": subject,
                    "html": html_body
                }
                res = requests.post("https://api.resend.com/emails", json=payload, headers=headers, timeout=10)
                if res.status_code in (200, 201):
                    status = "delivered"
                    error = None
                else:
                    status = "failed"
                    error = f"Resend API error {res.status_code}: {res.text}"
            except Exception as e:
                status = "failed"
                error = str(e)
        else:
            # Deterministic simulation mode
            status = "simulated_sent"
            error = None

        # Record email log in database
        log_entry = EmailLog(
            event_id=event.get("id"),
            participant_id=participant.get("id"),
            recipient_email=recipient_email,
            recipient_name=recipient_name,
            email_type="feedback_invite",
            subject=subject,
            status=status,
            error_message=error,
            html_preview=html_body,
            sent_at=datetime.utcnow()
        )
        db.add(log_entry)

        # Update participant record status only if email was delivered or simulated
        part_record = db.query(Participant).filter(Participant.id == participant.get("id")).first()
        if part_record and status in ("delivered", "simulated_sent"):
            part_record.feedback_status = "Sent"

        db.commit()

        return {
            "success": status in ("delivered", "simulated_sent"),
            "status": status,
            "error": error,
            "preview_html": html_body,
            "simulation": status == "simulated_sent"
        }
    finally:
        db.close()


def send_certificate_email(
    participant: Dict[str, Any],
    event: Dict[str, Any]
) -> Dict[str, Any]:
    """
    Send or simulate sending a certificate delivery email.
    """
    api_key, from_email, sim_mode = get_configured_email_credentials()
    
    cert_id = participant.get("certificate_id")
    verify_url = f"{FRONTEND_URL}/verify/{cert_id}"
    download_url = f"/static/certificates/{cert_id}.pdf"
    recipient_email = participant.get("email")
    recipient_name = participant.get("name")
    event_title = event.get("title", "Event")
    organization = event.get("organization", "EventFlow AI")
    subject = f"Your Verified Certificate: {event_title}"

    html_body = render_certificate_delivery_html(
        participant_name=recipient_name,
        event_title=event_title,
        organization=organization,
        certificate_id=cert_id,
        verify_url=verify_url,
        download_url=download_url
    )

    db = SessionLocal()
    try:
        if api_key and not sim_mode:
            try:
                headers = {
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json"
                }
                payload = {
                    "from": from_email,
                    "to": [recipient_email],
                    "subject": subject,
                    "html": html_body
                }
                res = requests.post("https://api.resend.com/emails", json=payload, headers=headers, timeout=10)
                if res.status_code in (200, 201):
                    status = "delivered"
                    error = None
                else:
                    status = "failed"
                    error = f"Resend API error {res.status_code}: {res.text}"
            except Exception as e:
                status = "failed"
                error = str(e)
        else:
            status = "simulated_sent"
            error = None

        log_entry = EmailLog(
            event_id=event.get("id"),
            participant_id=participant.get("id"),
            recipient_email=recipient_email,
            recipient_name=recipient_name,
            email_type="certificate_delivery",
            subject=subject,
            status=status,
            error_message=error,
            html_preview=html_body,
            sent_at=datetime.utcnow()
        )
        db.add(log_entry)

        part_record = db.query(Participant).filter(Participant.id == participant.get("id")).first()
        if part_record and status in ("delivered", "simulated_sent"):
            part_record.certificate_status = "Emailed"
            part_record.certificate_emailed_at = datetime.utcnow()

        db.commit()

        return {
            "success": status in ("delivered", "simulated_sent"),
            "status": status,
            "error": error,
            "preview_html": html_body,
            "simulation": status == "simulated_sent"
        }
    finally:
        db.close()
