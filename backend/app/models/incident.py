from sqlalchemy import Column, Integer, String, Float, DateTime, Text, JSON
from datetime import datetime, timezone
from app.database import Base

class Incident(Base):
    __tablename__ = "incidents"

    id = Column(Integer, primary_key=True, index=True)
    incident_id = Column(String(64), unique=True, index=True, nullable=False)
    detected_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    target = Column(String(255), nullable=False, default="api-gateway")
    source_ip = Column(String(64), nullable=True, default="unknown")
    risk_level = Column(String(32), nullable=False, default="LOW")  # LOW, MEDIUM, HIGH, CRITICAL
    attack_type = Column(String(64), nullable=False, default="benign")
    ml_score = Column(Float, nullable=False, default=0.0)
    qml_score = Column(Float, nullable=True)
    model_version = Column(String(32), nullable=False, default="1.0.0")
    decision_status = Column(String(32), nullable=False, default="DETECTED")
    verification_status = Column(String(32), nullable=False, default="DETECTED")  # DETECTED, UNDER_REVIEW, HUMAN_CONFIRMED, HUMAN_REJECTED, INCONCLUSIVE, MITIGATED, RESOLVED
    mitigation_status = Column(String(32), nullable=False, default="NONE")  # NONE, LOG_ONLY, ALERT, RATE_LIMIT, TEMPORARY_BLOCK, MANUAL_APPROVAL_REQUIRED, MITIGATED
    evidence_hash = Column(String(64), nullable=True)
    features_snapshot = Column(JSON, nullable=True)
    decision_rationale = Column(Text, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)
