from typing import List, Optional, Dict, Any
from datetime import datetime
from pydantic import BaseModel, EmailStr, Field

class QuestionSchema(BaseModel):
    id: str
    prompt: str
    type: str  # rating (1-5), nps (0-10), choice, text, boolean
    options: Optional[List[str]] = None
    required: bool = True
    category: Optional[str] = "overall"  # overall, content, venue, organization, mentors

class FeedbackFormBase(BaseModel):
    title: str = "Event Feedback & Experience Survey"
    description: str = "Your feedback helps us continuously improve and unlocks your verified certificate of completion."
    questions: List[QuestionSchema] = []
    is_published: bool = True

class FeedbackFormCreate(FeedbackFormBase):
    pass

class FeedbackFormResponse(FeedbackFormBase):
    id: str
    event_id: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class EventBase(BaseModel):
    title: str
    subtitle: Optional[str] = ""
    event_type: str = "Hackathon"
    organization: str = "Tech Community"
    date: str = ""
    location: str = "Virtual"
    description: Optional[str] = ""
    tracks: List[str] = []
    speakers: List[str] = []
    certificate_template_id: str = "modern_minimal"
    signature_name: str = "Alex Morgan"
    signature_title: str = "Organizing Committee Lead"
    certificate_title: str = "Certificate of Participation"
    certificate_issue_date: str = ""
    require_feedback_for_cert: bool = True
    status: str = "Feedback Open"

class EventCreate(EventBase):
    pass

class EventUpdate(BaseModel):
    title: Optional[str] = None
    subtitle: Optional[str] = None
    event_type: Optional[str] = None
    organization: Optional[str] = None
    date: Optional[str] = None
    location: Optional[str] = None
    description: Optional[str] = None
    tracks: Optional[List[str]] = None
    speakers: Optional[List[str]] = None
    certificate_template_id: Optional[str] = None
    signature_name: Optional[str] = None
    signature_title: Optional[str] = None
    certificate_title: Optional[str] = None
    certificate_issue_date: Optional[str] = None
    require_feedback_for_cert: Optional[bool] = None
    status: Optional[str] = None

class EventResponse(EventBase):
    id: str
    custom_template_path: Optional[str] = None
    signature_image_path: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    
    # Aggregated Stats
    total_participants: int = 0
    feedback_sent_count: int = 0
    feedback_submitted_count: int = 0
    certificates_generated_count: int = 0
    certificates_emailed_count: int = 0
    average_rating: Optional[float] = None
    nps_score: Optional[float] = None

    class Config:
        from_attributes = True

class ParticipantBase(BaseModel):
    name: str
    email: EmailStr
    role: str = "Attendee"
    organization: Optional[str] = ""

class ParticipantCreate(ParticipantBase):
    pass

class ParticipantResponse(ParticipantBase):
    id: str
    event_id: str
    feedback_token: str
    feedback_status: str
    feedback_submitted_at: Optional[datetime] = None
    certificate_id: str
    certificate_status: str
    certificate_file_path: Optional[str] = None
    certificate_emailed_at: Optional[datetime] = None
    created_at: datetime

    class Config:
        from_attributes = True

class FeedbackSubmitRequest(BaseModel):
    answers: Dict[str, Any]  # question_id -> value
    nps_score: Optional[int] = None
    overall_rating: Optional[float] = None
    comments: Optional[str] = ""

class FeedbackSubmissionResponse(BaseModel):
    id: str
    event_id: str
    participant_id: Optional[str]
    answers: Dict[str, Any]
    nps_score: Optional[int]
    overall_rating: Optional[float]
    comments: Optional[str]
    submitted_at: datetime

    class Config:
        from_attributes = True

class AIFormGenerationRequest(BaseModel):
    event_id: str
    custom_focus: Optional[str] = ""
    target_question_count: int = 5

class AIAnalysisResponse(BaseModel):
    id: str
    event_id: str
    executive_summary: str
    sentiment_positive: float
    sentiment_neutral: float
    sentiment_negative: float
    nps_score: float
    key_highlights: List[str]
    critical_improvements: List[str]
    actionable_recommendations: List[str]
    track_feedback_breakdown: Dict[str, Any] = {}
    model_used: str
    analyzed_at: datetime

    class Config:
        from_attributes = True

class EmailLogResponse(BaseModel):
    id: str
    event_id: str
    participant_id: Optional[str]
    recipient_email: str
    recipient_name: str
    email_type: str
    subject: str
    status: str
    error_message: Optional[str]
    html_preview: str
    sent_at: datetime

    class Config:
        from_attributes = True

class CertificateVerifyResponse(BaseModel):
    valid: bool
    certificate_id: str
    participant_name: str
    event_title: str
    event_organization: str
    event_date: str
    role: str
    issue_date: str
    certificate_title: str
    download_url: Optional[str] = None
    verification_hash: Optional[str] = None

class SystemSettingsSchema(BaseModel):
    gemini_api_key_configured: bool
    gemma_model_id: str
    resend_api_key_configured: bool
    resend_from_email: str
    simulation_mode: bool
    frontend_url: str

class SystemSettingsUpdate(BaseModel):
    gemini_api_key: Optional[str] = None
    gemma_model_id: Optional[str] = None
    resend_api_key: Optional[str] = None
    resend_from_email: Optional[str] = None
    simulation_mode: Optional[bool] = None
    frontend_url: Optional[str] = None
