from typing import List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.incident import Incident
from app.models.blockchain import BlockchainRecord
from app.models.audit import AuditLog
from app.models.user import User
from app.schemas.blockchain import BlockchainStatus, VerificationResult
from app.api.auth import get_current_user
from app.blockchain.client import blockchain_client
from app.blockchain.worker import anchor_worker
from app.core.hashing import compute_evidence_hash, sign_evidence_hash, verify_evidence_integrity

router = APIRouter(prefix="/blockchain", tags=["Blockchain Evidence"])

@router.get("/status", response_model=BlockchainStatus)
def get_blockchain_status(db: Session = Depends(get_db)):
    is_live = blockchain_client.check_connection()
    total = len(blockchain_client.simulated_ledger)
    return BlockchainStatus(
        is_connected=is_live,
        rpc_url=blockchain_client.rpc_url,
        contract_address=blockchain_client.contract_address,
        total_records=total,
        latest_block=blockchain_client.simulated_block_height,
        mode="LIVE_EVM_NODE" if is_live else "FALLBACK_CRYPTOGRAPHIC_LEDGER"
    )

@router.get("/records")
def list_blockchain_records(db: Session = Depends(get_db)):
    return db.query(BlockchainRecord).order_by(BlockchainRecord.created_at.desc()).all()

@router.post("/anchor/{incident_id}")
def anchor_incident(
    incident_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    inc = db.query(Incident).filter(Incident.incident_id == incident_id).first()
    if not inc:
        raise HTTPException(status_code=404, detail="Incident not found")

    if not inc.evidence_hash:
        manifest_data = {
            "incident_id": inc.incident_id,
            "timestamp": inc.detected_at.isoformat(),
            "attack_type": inc.attack_type,
            "risk_level": inc.risk_level,
            "ml_model_version": inc.model_version,
            "qml_model_version": "1.0.0-exp",
            "verification_status": inc.verification_status,
            "mitigation_action": inc.mitigation_status,
            "schema_version": "1.0"
        }
        inc.evidence_hash = compute_evidence_hash(manifest_data)
        db.commit()

    anchor_worker.enqueue_incident(incident_id, inc.evidence_hash, inc.verification_status)
    return {"message": "Incident evidence queued for on-chain anchoring", "incident_id": incident_id, "evidence_hash": inc.evidence_hash}

@router.get("/verify/{incident_id}", response_model=VerificationResult)
def verify_incident(incident_id: str, db: Session = Depends(get_db)):
    inc = db.query(Incident).filter(Incident.incident_id == incident_id).first()
    if not inc:
        raise HTTPException(status_code=404, detail="Incident not found")

    manifest_data = {
        "incident_id": inc.incident_id,
        "timestamp": inc.detected_at.isoformat(),
        "attack_type": inc.attack_type,
        "risk_level": inc.risk_level,
        "ml_model_version": inc.model_version,
        "qml_model_version": "1.0.0-exp",
        "verification_status": inc.verification_status,
        "mitigation_action": inc.mitigation_status,
        "schema_version": "1.0"
    }

    recomputed = compute_evidence_hash(manifest_data)
    stored = inc.evidence_hash or recomputed
    signature = sign_evidence_hash(stored)

    # Cryptographic integrity check
    hash_valid, sig_valid, diag = verify_evidence_integrity(manifest_data, stored, signature)

    # On-chain ledger query
    chain_res = blockchain_client.verify_on_chain(incident_id, stored)

    return VerificationResult(
        incident_id=incident_id,
        is_hash_valid=hash_valid,
        is_signature_valid=sig_valid,
        is_anchored_on_chain=chain_res["exists_on_chain"],
        blockchain_tx_hash=chain_res.get("tx_hash"),
        block_number=chain_res.get("block_number"),
        stored_hash=stored,
        recomputed_hash=recomputed,
        detail=f"{diag}. Blockchain Status: {chain_res['detail']}"
    )
