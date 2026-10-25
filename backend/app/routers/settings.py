import os
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import SystemSetting
from ..schemas import SystemSettingsSchema, SystemSettingsUpdate
from ..config import GEMINI_API_KEY, GEMMA_MODEL_ID, RESEND_API_KEY, RESEND_FROM_EMAIL, FRONTEND_URL, SIMULATION_MODE

router = APIRouter(prefix="/api/settings", tags=["settings"])

@router.get("", response_model=SystemSettingsSchema)
def get_settings(db: Session = Depends(get_db)):
    """Fetch current system configuration and API credentials status."""
    def get_val(key: str, default: str) -> str:
        rec = db.query(SystemSetting).filter(SystemSetting.key == key).first()
        return rec.value if (rec and rec.value) else default

    active_gemini_key = get_val("gemini_api_key", GEMINI_API_KEY)
    active_gemma_model = get_val("gemma_model_id", GEMMA_MODEL_ID)
    active_resend_key = get_val("resend_api_key", RESEND_API_KEY)
    active_from_email = get_val("resend_from_email", RESEND_FROM_EMAIL)
    active_sim_mode_val = get_val("simulation_mode", str(SIMULATION_MODE))
    active_sim_mode = active_sim_mode_val.lower() == "true"
    active_frontend_url = get_val("frontend_url", FRONTEND_URL)

    return SystemSettingsSchema(
        gemini_api_key_configured=bool(active_gemini_key),
        gemma_model_id=active_gemma_model,
        resend_api_key_configured=bool(active_resend_key),
        resend_from_email=active_from_email,
        simulation_mode=active_sim_mode,
        frontend_url=active_frontend_url
    )


@router.post("", response_model=SystemSettingsSchema)
def update_settings(payload: SystemSettingsUpdate, db: Session = Depends(get_db)):
    """Update system settings (API keys, Gemma model ID, simulation mode)."""
    def set_val(key: str, val: str):
        rec = db.query(SystemSetting).filter(SystemSetting.key == key).first()
        if not rec:
            rec = SystemSetting(key=key, value=val)
            db.add(rec)
        else:
            rec.value = val

    if payload.gemini_api_key is not None:
        set_val("gemini_api_key", payload.gemini_api_key)
        os.environ["GEMINI_API_KEY"] = payload.gemini_api_key
        
    if payload.gemma_model_id is not None:
        set_val("gemma_model_id", payload.gemma_model_id)
        os.environ["GEMMA_MODEL_ID"] = payload.gemma_model_id
        
    if payload.resend_api_key is not None:
        set_val("resend_api_key", payload.resend_api_key)
        os.environ["RESEND_API_KEY"] = payload.resend_api_key
        
    if payload.resend_from_email is not None:
        set_val("resend_from_email", payload.resend_from_email)
        os.environ["RESEND_FROM_EMAIL"] = payload.resend_from_email
        
    if payload.simulation_mode is not None:
        set_val("simulation_mode", "true" if payload.simulation_mode else "false")
        
    if payload.frontend_url is not None:
        set_val("frontend_url", payload.frontend_url.rstrip("/"))

    db.commit()
    return get_settings(db)
