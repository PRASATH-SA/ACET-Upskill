from sqlalchemy import Column, Integer, String, DateTime, Text
from datetime import datetime, timezone
from app.database import Base

class BlockchainRecord(Base):
    __tablename__ = "blockchain_records"

    id = Column(Integer, primary_key=True, index=True)
    incident_id = Column(String(64), unique=True, index=True, nullable=False)
    evidence_hash = Column(String(64), nullable=False, index=True)
    transaction_hash = Column(String(66), nullable=True, index=True)
    contract_address = Column(String(42), nullable=True)
    block_number = Column(Integer, nullable=True)
    status = Column(String(32), default="PENDING", nullable=False)  # PENDING, CONFIRMED, FAILED, VERIFICATION_FAILED
    retry_count = Column(Integer, default=0, nullable=False)
    last_error = Column(Text, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    confirmed_at = Column(DateTime, nullable=True)
