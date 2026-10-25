import uuid
from datetime import datetime
from sqlalchemy import (
    Column, String, Text, Boolean, Integer, Float, DateTime, ForeignKey
)
from sqlalchemy.orm import relationship
from .database import Base

def generate_uuid():
    return str(uuid.uuid4())

class Event(Base):
    __tablename__ = "events"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    title = Column(String(255), nullable=False)
    subtitle = Column(String(255), default="")
    event_type = Column(String(50), default="Hackathon")  # Hackathon, Conference, Workshop, Meetup, Webinar, College Fest
    organization = Column(String(255), default="Tech Community")
    date = Column(String(100), default="")
    location = Column(String(255), default="Virtual")
    description = Column(Text, default="")
    tracks = Column(Text, default="[]")  # JSON array of track names
    speakers = Column(Text, default="[]")  # JSON array of speaker names
    
    # Certificate configuration
    certificate_template_id = Column(String(50), default="modern_minimal")  # modern_minimal, tech_hackathon, academic_gold, creative_cyan, custom
    custom_template_path = Column(String(500), nullable=True)
    signature_name = Column(String(255), default="Alex Morgan")
    signature_title = Column(String(255), default="Organizing Committee Lead")
    signature_image_path = Column(String(500), nullable=True)
    certificate_title = Column(String(255), default="Certificate of Participation")
    certificate_issue_date = Column(String(100), default="")
    require_feedback_for_cert = Column(Boolean, default=True)
    
    # Event Status: Draft, Feedback Open, Closed, Certificates Issued
    status = Column(String(50), default="Feedback Open")
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    participants = relationship("Participant", back_populates="event", cascade="all, delete-orphan")
    feedback_form = relationship("FeedbackForm", back_populates="event", uselist=False, cascade="all, delete-orphan")
    feedback_submissions = relationship("FeedbackSubmission", back_populates="event", cascade="all, delete-orphan")
    ai_analysis = relationship("AIAnalysis", back_populates="event", uselist=False, cascade="all, delete-orphan")
    email_logs = relationship("EmailLog", back_populates="event", cascade="all, delete-orphan")


class Participant(Base):
    __tablename__ = "participants"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    event_id = Column(String(36), ForeignKey("events.id"), nullable=False)
    name = Column(String(255), nullable=False)
    email = Column(String(255), nullable=False)
    role = Column(String(100), default="Attendee")  # Attendee, Hacker, Speaker, Mentor, Volunteer, Winner
    organization = Column(String(255), default="")  # University, company, or team
    
    # Feedback tracking
    feedback_token = Column(String(64), unique=True, index=True, default=generate_uuid)
    feedback_status = Column(String(50), default="Not Sent")  # Not Sent, Sent, Submitted
    feedback_submitted_at = Column(DateTime, nullable=True)
    
    # Certificate tracking
    certificate_id = Column(String(50), unique=True, index=True, nullable=False)  # e.g. EF-2025-A7B8
    certificate_status = Column(String(50), default="Pending")  # Pending, Generated, Emailed
    certificate_file_path = Column(String(500), nullable=True)
    certificate_emailed_at = Column(DateTime, nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    event = relationship("Event", back_populates="participants")
    submissions = relationship("FeedbackSubmission", back_populates="participant", cascade="all, delete-orphan")
    email_logs = relationship("EmailLog", back_populates="participant", cascade="all, delete-orphan")


class FeedbackForm(Base):
    __tablename__ = "feedback_forms"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    event_id = Column(String(36), ForeignKey("events.id"), unique=True, nullable=False)
    title = Column(String(255), default="Event Feedback & Experience Survey")
    description = Column(Text, default="Your feedback helps us continuously improve and unlocks your verified certificate of completion.")
    questions = Column(Text, default="[]")  # JSON array of question definitions
    is_published = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    event = relationship("Event", back_populates="feedback_form")


class FeedbackSubmission(Base):
    __tablename__ = "feedback_submissions"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    event_id = Column(String(36), ForeignKey("events.id"), nullable=False)
    participant_id = Column(String(36), ForeignKey("participants.id"), nullable=True)
    answers = Column(Text, default="{}")  # JSON dict of question_id -> answer
    nps_score = Column(Integer, nullable=True)  # 0 to 10
    overall_rating = Column(Float, nullable=True)  # 1.0 to 5.0
    comments = Column(Text, default="")
    submitted_at = Column(DateTime, default=datetime.utcnow)

    event = relationship("Event", back_populates="feedback_submissions")
    participant = relationship("Participant", back_populates="submissions")


class AIAnalysis(Base):
    __tablename__ = "ai_analyses"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    event_id = Column(String(36), ForeignKey("events.id"), unique=True, nullable=False)
    executive_summary = Column(Text, default="")
    sentiment_positive = Column(Float, default=0.0)
    sentiment_neutral = Column(Float, default=0.0)
    sentiment_negative = Column(Float, default=0.0)
    nps_score = Column(Float, default=0.0)
    key_highlights = Column(Text, default="[]")  # JSON list
    critical_improvements = Column(Text, default="[]")  # JSON list
    actionable_recommendations = Column(Text, default="[]")  # JSON list
    track_feedback_breakdown = Column(Text, default="{}")  # JSON dict
    model_used = Column(String(100), default="Gemma 4 (via Gemini API)")
    analyzed_at = Column(DateTime, default=datetime.utcnow)

    event = relationship("Event", back_populates="ai_analysis")


class EmailLog(Base):
    __tablename__ = "email_logs"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    event_id = Column(String(36), ForeignKey("events.id"), nullable=False)
    participant_id = Column(String(36), ForeignKey("participants.id"), nullable=True)
    recipient_email = Column(String(255), nullable=False)
    recipient_name = Column(String(255), default="")
    email_type = Column(String(50), nullable=False)  # feedback_invite, certificate_delivery
    subject = Column(String(255), nullable=False)
    status = Column(String(50), default="simulated_sent")  # delivered, simulated_sent, failed
    error_message = Column(Text, nullable=True)
    html_preview = Column(Text, default="")
    sent_at = Column(DateTime, default=datetime.utcnow)

    event = relationship("Event", back_populates="email_logs")
    participant = relationship("Participant", back_populates="email_logs")


class SystemSetting(Base):
    __tablename__ = "system_settings"

    key = Column(String(100), primary_key=True)
    value = Column(Text, default="")
