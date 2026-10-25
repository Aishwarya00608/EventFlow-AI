import json
import uuid
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from ..models import Event, Participant, FeedbackForm, FeedbackSubmission, AIAnalysis
from .ai_service import analyze_feedback_responses
from .certificate_service import generate_single_certificate

SAMPLE_PARTICIPANTS = [
    {"name": "Aarav Sharma", "email": "aarav.sharma@example.com", "role": "Hacker", "organization": "Stanford University"},
    {"name": "Elena Rostova", "email": "elena.rostova@example.com", "role": "Hacker", "organization": "MIT Media Lab"},
    {"name": "Devon Vance", "email": "devon.vance@example.com", "role": "Winner", "organization": "UC Berkeley"},
    {"name": "Priya Patel", "email": "priya.patel@example.com", "role": "Hacker", "organization": "Georgia Tech"},
    {"name": "Marcus Chen", "email": "marcus.chen@example.com", "role": "Mentor", "organization": "Google Cloud"},
    {"name": "Sophia Rodriguez", "email": "sophia.r@example.com", "role": "Hacker", "organization": "University of Waterloo"},
    {"name": "Liam O'Connor", "email": "liam.oc@example.com", "role": "Attendee", "organization": "Oxford University"},
    {"name": "Zainab Al-Mansoor", "email": "zainab.m@example.com", "role": "Hacker", "organization": "Carnegie Mellon University"},
    {"name": "Takeshi Yamamoto", "email": "takeshi.y@example.com", "role": "Speaker", "organization": "Tokyo Institute of Tech"},
    {"name": "Chloe Dubois", "email": "chloe.dubois@example.com", "role": "Hacker", "organization": "ETH Zurich"},
    {"name": "Jordan Taylor", "email": "jordan.t@example.com", "role": "Volunteer", "organization": "Caltech"},
    {"name": "Amara Okafor", "email": "amara.okafor@example.com", "role": "Hacker", "organization": "Imperial College London"},
]

SAMPLE_SUBMISSIONS_DATA = [
    {
        "nps_score": 10,
        "overall_rating": 5.0,
        "answers": {"q1": 5, "q2": 10, "q3": "AI & Machine Learning", "q4": "Yes, very supportive"},
        "comments": "Absolutely loved the mentorship and the hackathon challenges. The API workshops were incredibly helpful for our Gemma integration!"
    },
    {
        "nps_score": 9,
        "overall_rating": 4.8,
        "answers": {"q1": 5, "q2": 9, "q3": "AI & Machine Learning", "q4": "Yes, very supportive"},
        "comments": "Great energy and well organized. Mentors were readily available on Discord and gave constructive feedback before final pitch."
    },
    {
        "nps_score": 8,
        "overall_rating": 4.2,
        "answers": {"q1": 4, "q2": 8, "q3": "Cloud Infrastructure", "q4": "Yes, very supportive"},
        "comments": "The judging criteria was transparent and fair. Would have loved a slightly longer buffer between submission deadline and demos."
    },
    {
        "nps_score": 10,
        "overall_rating": 5.0,
        "answers": {"q1": 5, "q2": 10, "q3": "Open Source Track", "q4": "Yes, very supportive"},
        "comments": "Best hackathon I have attended this semester! The certificate automation and instant feedback flow was super sleek."
    },
    {
        "nps_score": 7,
        "overall_rating": 3.8,
        "answers": {"q1": 4, "q2": 7, "q3": "AI & Machine Learning", "q4": "Neutral"},
        "comments": "WiFi in the venue had a 15-minute hiccup around midnight, but the organizers resolved it promptly. Workshops were top notch."
    }
]

def seed_default_event_if_empty(db: Session):
    existing_event = db.query(Event).first()
    if existing_event:
        return existing_event

    event_id = str(uuid.uuid4())
    default_event = Event(
        id=event_id,
        title="HackFlow Global AI Hackathon 2026",
        subtitle="48-Hour Open Source AI Building Sprint",
        event_type="Hackathon",
        organization="MLH & EventFlow Open Source",
        date="October 24-25, 2026",
        location="Hybrid • San Francisco & Global Discord",
        description="A premier 48-hour hackathon focused on building autonomous agent workflows, open-source AI applications, and next-generation developer tooling powered by Gemma 4 and Gemini.",
        tracks=json.dumps(["Gemma 4 AI Innovation", "DigitalOcean Open-Source", "Developer Tools", "Social Impact & Climate"]),
        speakers=json.dumps(["Dr. Sarah Chen (Google DeepMind)", "David Miller (DigitalOcean)", "Priya Rao (Open Source Lead)"]),
        certificate_template_id="modern_minimal",
        signature_name="Dr. Sarah Chen",
        signature_title="Lead Organizer & Technical Director",
        certificate_title="Certificate of Achievement & Participation",
        certificate_issue_date="October 25, 2026",
        require_feedback_for_cert=True,
        status="Feedback Open"
    )
    db.add(default_event)
    db.flush()

    # Create AI-generated Feedback Form
    form_questions = [
        {
            "id": "q1",
            "prompt": "How would you rate your overall experience at HackFlow Global AI 2026?",
            "type": "rating",
            "options": None,
            "required": True,
            "category": "overall"
        },
        {
            "id": "q2",
            "prompt": "How likely are you to recommend HackFlow to fellow hackers? (0 = Not at all, 10 = Absolutely)",
            "type": "nps",
            "options": None,
            "required": True,
            "category": "overall"
        },
        {
            "id": "q3",
            "prompt": "Which prize track did your project target?",
            "type": "choice",
            "options": ["Gemma 4 AI Innovation", "DigitalOcean Open-Source", "Developer Tools", "Social Impact & Climate"],
            "required": False,
            "category": "content"
        },
        {
            "id": "q4",
            "prompt": "Were the mentors and sponsor office hours helpful during your hack sprint?",
            "type": "choice",
            "options": ["Yes, very supportive", "Neutral", "Could be improved"],
            "required": False,
            "category": "organization"
        },
        {
            "id": "q5",
            "prompt": "What was the highlight of your hackathon, and what should we improve for next year?",
            "type": "text",
            "options": None,
            "required": True,
            "category": "overall"
        }
    ]

    form = FeedbackForm(
        id=str(uuid.uuid4()),
        event_id=event_id,
        title="HackFlow 2026 Participant Experience Survey",
        description="Share your feedback to help us build even better hackathons and immediately unlock your verified certificate of completion.",
        questions=json.dumps(form_questions),
        is_published=True
    )
    db.add(form)

    # Add sample participants
    participants_created = []
    for idx, p in enumerate(SAMPLE_PARTICIPANTS):
        cert_code = f"EF-HACK-{1000 + idx}"
        part = Participant(
            id=str(uuid.uuid4()),
            event_id=event_id,
            name=p["name"],
            email=p["email"],
            role=p["role"],
            organization=p["organization"],
            feedback_token=str(uuid.uuid4()),
            feedback_status="Submitted" if idx < len(SAMPLE_SUBMISSIONS_DATA) else ("Sent" if idx < 9 else "Not Sent"),
            feedback_submitted_at=datetime.utcnow() - timedelta(hours=idx) if idx < len(SAMPLE_SUBMISSIONS_DATA) else None,
            certificate_id=cert_code,
            certificate_status="Generated" if idx < 5 else "Pending"
        )
        db.add(part)
        participants_created.append(part)

    db.flush()

    # Generate initial certificate for first 5 participants
    event_dict = {
        "id": default_event.id,
        "title": default_event.title,
        "organization": default_event.organization,
        "date": default_event.date,
        "location": default_event.location,
        "certificate_template_id": default_event.certificate_template_id,
        "signature_name": default_event.signature_name,
        "signature_title": default_event.signature_title,
        "certificate_title": default_event.certificate_title,
        "certificate_issue_date": default_event.certificate_issue_date
    }

    for p in participants_created[:5]:
        p_dict = {
            "id": p.id,
            "name": p.name,
            "role": p.role,
            "certificate_id": p.certificate_id
        }
        pdf_path = generate_single_certificate(p_dict, event_dict)
        p.certificate_file_path = pdf_path

    # Add realistic submissions
    for idx, sub_data in enumerate(SAMPLE_SUBMISSIONS_DATA):
        linked_participant = participants_created[idx] if idx < len(participants_created) else None
        submission = FeedbackSubmission(
            id=str(uuid.uuid4()),
            event_id=event_id,
            participant_id=linked_participant.id if linked_participant else None,
            answers=json.dumps(sub_data["answers"]),
            nps_score=sub_data["nps_score"],
            overall_rating=sub_data["overall_rating"],
            comments=sub_data["comments"],
            submitted_at=datetime.utcnow() - timedelta(hours=idx * 2)
        )
        db.add(submission)

    # Initial AI Analysis
    analysis_result = analyze_feedback_responses(
        event_dict,
        SAMPLE_SUBMISSIONS_DATA,
        form_questions
    )

    ai_analysis = AIAnalysis(
        id=str(uuid.uuid4()),
        event_id=event_id,
        executive_summary=analysis_result["executive_summary"],
        sentiment_positive=analysis_result["sentiment_positive"],
        sentiment_neutral=analysis_result["sentiment_neutral"],
        sentiment_negative=analysis_result["sentiment_negative"],
        nps_score=analysis_result["nps_score"],
        key_highlights=json.dumps(analysis_result["key_highlights"]),
        critical_improvements=json.dumps(analysis_result["critical_improvements"]),
        actionable_recommendations=json.dumps(analysis_result["actionable_recommendations"]),
        track_feedback_breakdown=json.dumps(analysis_result.get("track_feedback_breakdown", {})),
        model_used=analysis_result["model_used"],
        analyzed_at=datetime.utcnow()
    )
    db.add(ai_analysis)

    db.commit()
    db.refresh(default_event)
    return default_event
