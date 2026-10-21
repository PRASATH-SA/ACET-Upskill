from sqlalchemy import Column, Integer, String, DateTime, JSON, ForeignKey
from datetime import datetime, timezone
from app.database import Base

class TrafficMetric(Base):
    __tablename__ = "traffic_metrics"

    id = Column(Integer, primary_key=True, index=True)
    incident_id = Column(String(64), nullable=True, index=True)
    window_start = Column(DateTime, nullable=False)
    window_end = Column(DateTime, nullable=False)
    feature_json = Column(JSON, nullable=False)
    source_type = Column(String(64), default="synthetic", nullable=False)  # synthetic, http_probe, nginx_log, cic_dataset
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
