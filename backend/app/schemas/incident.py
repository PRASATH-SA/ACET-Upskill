from pydantic import BaseModel, ConfigDict
from typing import Optional, Dict, Any, List
from datetime import datetime

class IncidentBase(BaseModel):
    incident_id: str
    target: str
    source_ip: Optional[str] = None
    risk_level: str
    attack_type: str
    ml_score: float
    qml_score: Optional[float] = None
    model_version: str
    decision_status: str
    verification_status: str
    mitigation_status: str
    evidence_hash: Optional[str] = None
    decision_rationale: Optional[str] = None
    detected_at: datetime

    model_config = ConfigDict(from_attributes=True)


class IncidentDetail(IncidentBase):
    features_snapshot: Optional[Dict[str, Any]] = None
    created_at: datetime
    updated_at: datetime

class ReviewRequest(BaseModel):
    decision: str  # HUMAN_CONFIRMED, HUMAN_REJECTED, INCONCLUSIVE, APPROVED_MITIGATION, RESOLVED
    reason: str
    mitigation_action: Optional[str] = None  # None, RATE_LIMIT, TEMPORARY_BLOCK, LOG_ONLY

class EvidenceManifest(BaseModel):
    incident_id: str
    timestamp: str
    attack_type: str
    risk_level: str
    ml_model_version: str
    qml_model_version: Optional[str] = "1.0.0"
    verification_status: str
    mitigation_action: str
    evidence_hash: str
    schema_version: str = "1.0"
    digital_signature: Optional[str] = None
