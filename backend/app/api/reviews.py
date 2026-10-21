from typing import List
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.incident import Incident
from app.models.review import AnalystReview
from app.models.audit import AuditLog
from app.models.user import User
from app.schemas.incident import IncidentDetail, ReviewRequest
from app.api.auth import get_current_user
from app.protection.policy_engine import policy_engine
from app.blockchain.worker import anchor_worker

router = APIRouter(prefix="/reviews", tags=["Human Review"])

@router.get("/queue", response_model=List[IncidentDetail])
def get_review_queue(db: Session = Depends(get_db)):
    """Returns all incidents currently pending human verification or under review."""
    return db.query(Incident).filter(
        Incident.verification_status.in_(["UNDER_REVIEW", "DETECTED"])
    ).order_by(Incident.detected_at.desc()).all()

@router.post("/{incident_id}", response_model=IncidentDetail)
def submit_analyst_review(
    incident_id: str,
    req: ReviewRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    inc = db.query(Incident).filter(Incident.incident_id == incident_id).first()
    if not inc:
        raise HTTPException(status_code=404, detail="Incident not found")

    valid_decisions = [
        "HUMAN_CONFIRMED",
        "HUMAN_REJECTED",
        "INCONCLUSIVE",
        "APPROVED_MITIGATION",
        "RESOLVED"
    ]
    if req.decision not in valid_decisions:
        raise HTTPException(status_code=400, detail=f"Invalid review decision: {req.decision}")

    if not req.reason or len(req.reason.strip()) < 5:
        raise HTTPException(status_code=400, detail="Analyst review requires a descriptive justification")

    # Update incident status
    inc.verification_status = req.decision
    
    # Execute approved mitigation action if specified
    if req.mitigation_action and req.mitigation_action in ["RATE_LIMIT", "TEMPORARY_BLOCK"]:
        inc.mitigation_status = req.mitigation_action
        if inc.source_ip:
            policy_engine.execute_protection_action(
                target_ip=inc.source_ip,
                action=req.mitigation_action,
                duration_sec=600,
                approved_by=current_user.username
            )
    elif req.decision == "HUMAN_REJECTED":
        inc.mitigation_status = "LOG_ONLY"
        inc.risk_level = "LOW"
        if inc.source_ip:
            policy_engine.simulated_adapter.remove_restriction(inc.source_ip)

    # Persist review entry
    review_record = AnalystReview(
        incident_id=incident_id,
        analyst_id=current_user.id,
        decision=req.decision,
        reason=req.reason,
        reviewed_at=datetime.now(timezone.utc)
    )
    db.add(review_record)

    # Append to immutable audit log
    audit_record = AuditLog(
        actor_id=current_user.id,
        action="ANALYST_REVIEW_DECISION",
        resource_type="incident",
        resource_id=incident_id,
        details_json={
            "decision": req.decision,
            "reason": req.reason,
            "mitigation_action": req.mitigation_action,
            "analyst_username": current_user.username
        }
    )
    db.add(audit_record)
    db.commit()
    db.refresh(inc)

    # If confirmed attack, ensure it is anchored to blockchain
    if req.decision == "HUMAN_CONFIRMED" and inc.evidence_hash:
        anchor_worker.enqueue_incident(incident_id, inc.evidence_hash, req.decision)

    return inc
