from sqlalchemy import Column, Integer, String, DateTime, JSON, ForeignKey
from datetime import datetime, timezone
from app.database import Base

class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    actor_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    action = Column(String(64), nullable=False)  # REVIEW_DECISION, MITIGATION_APPLIED, MITIGATION_EXPIRED, POLICY_UPDATE, EMERGENCY_DISABLE, BLOCKCHAIN_ANCHOR
    resource_type = Column(String(64), nullable=False)  # incident, policy, blockchain, system
    resource_id = Column(String(64), nullable=True)
    details_json = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
