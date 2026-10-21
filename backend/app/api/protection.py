from typing import List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.incident import Incident
from app.models.audit import AuditLog
from app.models.user import User
from app.schemas.mitigation import PolicyConfig, PolicyUpdateRequest, EmergencyDisableRequest, ManualMitigationRequest
from app.api.auth import get_current_user
from app.protection.policy_engine import policy_engine
from app.config import settings

router = APIRouter(prefix="/protection", tags=["Protection Policy"])

@router.get("/policies", response_model=PolicyConfig)
def get_policies():
    return PolicyConfig(
        policy_mode=policy_engine.policy_mode,
        high_risk_threshold=settings.HIGH_RISK_THRESHOLD,
        uncertainty_lower=settings.UNCERTAINTY_LOWER,
        uncertainty_upper=settings.UNCERTAINTY_UPPER,
        default_duration_sec=settings.DEFAULT_MITIGATION_DURATION_SEC,
        emergency_disabled=policy_engine.emergency_disabled,
        allowlist=list(policy_engine.allowlist)
    )

@router.put("/policies", response_model=PolicyConfig)
def update_policies(
    req: PolicyUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if req.policy_mode:
        if req.policy_mode not in ["MONITOR_ONLY", "AUTOMATED_RATE_LIMIT", "STRICT_DEFENSE"]:
            raise HTTPException(status_code=400, detail="Invalid policy mode")
        policy_engine.policy_mode = req.policy_mode

    if req.high_risk_threshold is not None:
        settings.HIGH_RISK_THRESHOLD = req.high_risk_threshold

    if req.default_duration_sec is not None:
        settings.DEFAULT_MITIGATION_DURATION_SEC = req.default_duration_sec

    # Audit log
    audit = AuditLog(
        actor_id=current_user.id,
        action="POLICY_UPDATED",
        resource_type="policy",
        details_json=req.dict(exclude_unset=True)
    )
    db.add(audit)
    db.commit()

    return get_policies()

@router.post("/emergency-disable")
def toggle_emergency_disable(
    req: EmergencyDisableRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    status = policy_engine.set_emergency_disable(req.disable)
    
    audit = AuditLog(
        actor_id=current_user.id,
        action="EMERGENCY_DISABLE_TOGGLE",
        resource_type="system",
        details_json={"disabled": status, "reason": req.reason}
    )
    db.add(audit)
    db.commit()

    return {
        "emergency_disabled": status,
        "message": "Emergency killswitch activated. All restrictions cleared." if status else "Emergency killswitch deactivated. Protection re-enabled."
    }

@router.get("/active")
def get_active_mitigations():
    return {
        "active_restrictions": policy_engine.simulated_adapter.get_active(),
        "emergency_disabled": policy_engine.emergency_disabled,
        "policy_mode": policy_engine.policy_mode
    }
