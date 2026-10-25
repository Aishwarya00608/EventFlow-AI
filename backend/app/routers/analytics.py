import json
import uuid
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import PlainTextResponse
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import Event, Participant, FeedbackSubmission, FeedbackForm, AIAnalysis
from ..schemas import AIAnalysisResponse
from ..services.ai_service import analyze_feedback_responses

router = APIRouter(tags=["analytics"])

@router.get("/api/events/{event_id}/analytics")
def get_event_analytics(event_id: str, db: Session = Depends(get_db)):
    """Retrieve synthesized qualitative and quantitative feedback analysis."""
    event = db.query(Event).filter(Event.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    analysis = db.query(AIAnalysis).filter(AIAnalysis.event_id == event_id).first()
    submissions = db.query(FeedbackSubmission).filter(FeedbackSubmission.event_id == event_id).all()

    # If no analysis exists yet or submissions have been added, trigger generation
    if not analysis and submissions:
        return run_ai_analysis(event_id, db)

    if not analysis:
        return {
            "id": "pending",
            "event_id": event_id,
            "executive_summary": "Awaiting initial feedback responses from participants.",
            "sentiment_positive": 0.0,
            "sentiment_neutral": 0.0,
            "sentiment_negative": 0.0,
            "nps_score": 0.0,
            "key_highlights": ["No survey responses received yet"],
            "critical_improvements": ["No survey responses received yet"],
            "actionable_recommendations": ["Distribute feedback invitation links to participants"],
            "track_feedback_breakdown": {},
            "model_used": "Pending Submissions",
            "analyzed_at": datetime.utcnow()
        }

    key_highlights = json.loads(analysis.key_highlights) if analysis.key_highlights else []
    critical_improvements = json.loads(analysis.critical_improvements) if analysis.critical_improvements else []
    actionable_recommendations = json.loads(analysis.actionable_recommendations) if analysis.actionable_recommendations else []
    track_feedback_breakdown = json.loads(analysis.track_feedback_breakdown) if analysis.track_feedback_breakdown else {}

    return {
        "id": analysis.id,
        "event_id": analysis.event_id,
        "executive_summary": analysis.executive_summary,
        "sentiment_positive": analysis.sentiment_positive,
        "sentiment_neutral": analysis.sentiment_neutral,
        "sentiment_negative": analysis.sentiment_negative,
        "nps_score": analysis.nps_score,
        "key_highlights": key_highlights,
        "critical_improvements": critical_improvements,
        "actionable_recommendations": actionable_recommendations,
        "track_feedback_breakdown": track_feedback_breakdown,
        "model_used": analysis.model_used,
        "analyzed_at": analysis.analyzed_at
    }


@router.post("/api/events/{event_id}/analytics/regenerate-ai")
def run_ai_analysis(event_id: str, db: Session = Depends(get_db)):
    """Force re-run AI synthesis using Gemma 4 via Gemini API on all collected submissions."""
    event = db.query(Event).filter(Event.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    submissions = db.query(FeedbackSubmission).filter(FeedbackSubmission.event_id == event_id).all()
    form = db.query(FeedbackForm).filter(FeedbackForm.event_id == event_id).first()
    questions = json.loads(form.questions) if (form and form.questions) else []

    sub_dicts = []
    for s in submissions:
        sub_dicts.append({
            "nps_score": s.nps_score,
            "overall_rating": s.overall_rating,
            "comments": s.comments,
            "answers": json.loads(s.answers) if s.answers else {}
        })

    event_dict = {
        "id": event.id,
        "title": event.title,
        "event_type": event.event_type,
        "organization": event.organization,
        "tracks": json.loads(event.tracks) if event.tracks else []
    }

    result = analyze_feedback_responses(event_dict, sub_dicts, questions)

    analysis = db.query(AIAnalysis).filter(AIAnalysis.event_id == event_id).first()
    if not analysis:
        analysis = AIAnalysis(id=str(uuid.uuid4()), event_id=event_id)
        db.add(analysis)

    analysis.executive_summary = result["executive_summary"]
    analysis.sentiment_positive = result["sentiment_positive"]
    analysis.sentiment_neutral = result["sentiment_neutral"]
    analysis.sentiment_negative = result["sentiment_negative"]
    analysis.nps_score = result["nps_score"]
    analysis.key_highlights = json.dumps(result["key_highlights"])
    analysis.critical_improvements = json.dumps(result["critical_improvements"])
    analysis.actionable_recommendations = json.dumps(result["actionable_recommendations"])
    analysis.track_feedback_breakdown = json.dumps(result.get("track_feedback_breakdown", {}))
    analysis.model_used = result["model_used"]
    analysis.analyzed_at = datetime.utcnow()

    db.commit()
    db.refresh(analysis)

    return {
        "id": analysis.id,
        "event_id": analysis.event_id,
        "executive_summary": analysis.executive_summary,
        "sentiment_positive": analysis.sentiment_positive,
        "sentiment_neutral": analysis.sentiment_neutral,
        "sentiment_negative": analysis.sentiment_negative,
        "nps_score": analysis.nps_score,
        "key_highlights": result["key_highlights"],
        "critical_improvements": result["critical_improvements"],
        "actionable_recommendations": result["actionable_recommendations"],
        "track_feedback_breakdown": result.get("track_feedback_breakdown", {}),
        "model_used": analysis.model_used,
        "analyzed_at": analysis.analyzed_at
    }


@router.get("/api/events/{event_id}/closure-report")
def export_closure_report(event_id: str, db: Session = Depends(get_db)):
    """Generate a formatted markdown Executive Event Closure Report ready for sponsors and leadership."""
    event = db.query(Event).filter(Event.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    participants_count = db.query(Participant).filter(Participant.event_id == event_id).count()
    submissions_count = db.query(FeedbackSubmission).filter(FeedbackSubmission.event_id == event_id).count()
    certs_issued = db.query(Participant).filter(Participant.event_id == event_id, Participant.certificate_status.in_(["Generated", "Emailed"])).count()
    analysis = db.query(AIAnalysis).filter(AIAnalysis.event_id == event_id).first()

    report = f"""# Executive Event Closure Report: {event.title}
**Organization:** {event.organization}  
**Date:** {event.date} | **Location:** {event.location}  
**Generated by:** EventFlow AI (Powered by Gemma 4)  
**Report Generated:** {datetime.utcnow().strftime("%B %d, %Y")}

---

## 1. Participation & Engagement Metrics
- **Total Registered Participants:** {participants_count}
- **Feedback Submissions Collected:** {submissions_count} ({round((submissions_count / (participants_count or 1)) * 100, 1)}% Completion Rate)
- **Verified Certificates Issued:** {certs_issued}
- **Net Promoter Score (NPS):** {analysis.nps_score if analysis else 'N/A'}

---

## 2. Executive Summary
{analysis.executive_summary if analysis else 'Awaiting feedback aggregation.'}

---

## 3. Sentiment Breakdown
- **Positive Sentiment:** {analysis.sentiment_positive if analysis else 0.0}%
- **Neutral Sentiment:** {analysis.sentiment_neutral if analysis else 0.0}%
- **Constructive / Areas for Growth:** {analysis.sentiment_negative if analysis else 0.0}%

---

## 4. Key Highlights & Participant Praises
"""
    if analysis and analysis.key_highlights:
        for item in json.loads(analysis.key_highlights):
            report += f"- {item}\n"
    else:
        report += "- Awaiting feedback submissions.\n"

    report += "\n## 5. Critical Improvement Opportunities\n"
    if analysis and analysis.critical_improvements:
        for item in json.loads(analysis.critical_improvements):
            report += f"- {item}\n"
    else:
        report += "- None noted yet.\n"

    report += "\n## 6. Actionable Recommendations for Next Edition\n"
    if analysis and analysis.actionable_recommendations:
        for item in json.loads(analysis.actionable_recommendations):
            report += f"- {item}\n"
    else:
        report += "- Awaiting recommendations.\n"

    report += f"""
---
*EventFlow AI — From the last session to the final certificate, automated.*
*Verification Portal: {event.title} credentials can be verified publicly using their unique certificate ID.*
"""
    return PlainTextResponse(content=report, media_type="text/markdown")
