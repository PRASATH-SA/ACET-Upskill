from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from datetime import datetime, timezone
from app.database import Base

class MitigationAction(Base):
    __tablename__ = "mitigation_actions"

    id = Column(Integer, primary_key=True, index=True)
    incident_id = Column(String(64), nullable=False, index=True)
    action_type = Column(String(32), nullable=False)  # LOG_ONLY, ALERT, RATE_LIMIT, TEMPORARY_BLOCK, MANUAL_APPROVAL_REQUIRED
    scope = Column(String(255), nullable=False)  # IP or Subnet or Endpoint
    expires_at = Column(DateTime, nullable=True)
    status = Column(String(32), default="ACTIVE", nullable=False)  # ACTIVE, EXPIRED, REVOKED, REVERTED
    approved_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
