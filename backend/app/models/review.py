from sqlalchemy import Column, Integer, String, DateTime, Text, ForeignKey
from datetime import datetime, timezone
from app.database import Base

class AnalystReview(Base):
    __tablename__ = "analyst_reviews"

    id = Column(Integer, primary_key=True, index=True)
    incident_id = Column(String(64), nullable=False, index=True)
    analyst_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    decision = Column(String(32), nullable=False)  # HUMAN_CONFIRMED, HUMAN_REJECTED, INCONCLUSIVE, APPROVED_MITIGATION, RESOLVED
    reason = Column(Text, nullable=False)
    reviewed_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
