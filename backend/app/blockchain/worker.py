import threading
import queue
import time
import logging
from typing import Dict, Any
from app.database import SessionLocal
from app.models.blockchain import BlockchainRecord
from app.models.incident import Incident
from app.models.audit import AuditLog
from app.blockchain.client import blockchain_client
from datetime import datetime, timezone

logger = logging.getLogger(__name__)

class BlockchainAnchorWorker:
    """Background worker for asynchronous evidence anchoring with retries."""
    def __init__(self):
        self.work_queue = queue.Queue()
        self.is_running = True
        self.thread = threading.Thread(target=self._worker_loop, daemon=True)
        self.thread.start()

    def enqueue_incident(self, incident_id: str, evidence_hash: str, verification_status: str):
        self.work_queue.put({
            "incident_id": incident_id,
            "evidence_hash": evidence_hash,
            "verification_status": verification_status,
            "attempts": 0
        })

    def _worker_loop(self):
        while self.is_running:
            try:
                task = self.work_queue.get(timeout=2.0)
            except queue.Empty:
                continue

            incident_id = task["incident_id"]
            evidence_hash = task["evidence_hash"]
            v_status = task["verification_status"]
            attempts = task["attempts"]

            try:
                db = SessionLocal()
                # Check record in DB
                rec = db.query(BlockchainRecord).filter(BlockchainRecord.incident_id == incident_id).first()
                if not rec:
                    rec = BlockchainRecord(
                        incident_id=incident_id,
                        evidence_hash=evidence_hash,
                        status="PENDING",
                        retry_count=attempts
                    )
                    db.add(rec)
                    db.commit()

                success, tx_hash, block_num, err = blockchain_client.submit_evidence_record(
                    incident_id=incident_id,
                    evidence_hash=evidence_hash,
                    verification_status=v_status
                )

                if success:
                    rec.status = "CONFIRMED"
                    rec.transaction_hash = tx_hash
                    rec.block_number = block_num
                    rec.contract_address = blockchain_client.contract_address
                    rec.confirmed_at = datetime.now(timezone.utc)
                    db.commit()
                    logger.info(f"[ANCHOR WORKER] Confirmed {incident_id} at tx {tx_hash}")
                else:
                    if attempts < 3:
                        task["attempts"] += 1
                        time.sleep(1.0)
                        self.work_queue.put(task)
                        logger.warning(f"[ANCHOR WORKER] Retry {task['attempts']} queued for {incident_id}")
                    else:
                        rec.status = "FAILED"
                        rec.last_error = err or "Max retries exceeded"
                        db.commit()
                        logger.error(f"[ANCHOR WORKER] Permanent failure for {incident_id}: {rec.last_error}")

                db.close()
            except Exception as e:
                logger.error(f"[ANCHOR WORKER] Worker error processing {incident_id}: {e}")

# Global singleton worker
anchor_worker = BlockchainAnchorWorker()
