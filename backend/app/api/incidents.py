import uuid
from typing import Optional, List
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.incident import Incident
from app.models.traffic import TrafficMetric
from app.models.audit import AuditLog
from app.schemas.incident import IncidentDetail, EvidenceManifest
from app.schemas.traffic import SimulationRequest
from app.ml.detection_engine import default_ml_engine
from app.qml.quantum_engine import quantum_classifier
from app.protection.policy_engine import policy_engine
from app.core.hashing import compute_evidence_hash, sign_evidence_hash
from app.traffic.simulator import TrafficSimulator
from app.blockchain.worker import anchor_worker

router = APIRouter(prefix="/incidents", tags=["Incidents"])

@router.get("", response_model=List[IncidentDetail])
def list_incidents(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    status: Optional[str] = None,
    risk: Optional[str] = None,
    db: Session = Depends(get_db)
):
    query = db.query(Incident)
    if status:
        query = query.filter(Incident.verification_status == status)
    if risk:
        query = query.filter(Incident.risk_level == risk)
    return query.order_by(Incident.detected_at.desc()).offset(skip).limit(limit).all()

@router.get("/{incident_id}", response_model=IncidentDetail)
def get_incident(incident_id: str, db: Session = Depends(get_db)):
    inc = db.query(Incident).filter(Incident.incident_id == incident_id).first()
    if not inc:
        raise HTTPException(status_code=404, detail="Incident not found")
    return inc

@router.get("/{incident_id}/evidence", response_model=EvidenceManifest)
def get_incident_evidence(incident_id: str, db: Session = Depends(get_db)):
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
    
    # Deterministic SHA-256 hash & HMAC signature
    ev_hash = inc.evidence_hash or compute_evidence_hash(manifest_data)
    manifest_data["evidence_hash"] = ev_hash
    signature = sign_evidence_hash(ev_hash)
    manifest_data["digital_signature"] = signature
    
    return EvidenceManifest(**manifest_data)

@router.post("/simulate")
def simulate_traffic_event(req: SimulationRequest, db: Session = Depends(get_db)):
    """
    Simulates traffic telemetry, executes ML & QML, evaluates policy, hashes evidence,
    and returns full decision envelope.
    """
    # 1. Generate window
    win_data = TrafficSimulator.generate_scenario_window(req.scenario)
    inc_id = f"INC-{uuid.uuid4().hex[:8].upper()}"
    features = win_data["features"]
    
    # 2. ML Engine Inference
    ml_out = default_ml_engine.predict(inc_id, features)
    
    # 3. QML Secondary Augmentation
    qml_out = quantum_classifier.evaluate(inc_id, features)
    
    # 4. Hybrid Decision Engine
    decision = policy_engine.evaluate_hybrid_decision(ml_out, qml_out)
    
    # 5. Apply Automated Protection Action
    protection_res = policy_engine.execute_protection_action(
        target_ip=win_data["source_ip"],
        action=decision["recommended_action"],
        duration_sec=300
    )
    
    # 6. Evidence manifest and hash
    now_utc = datetime.now(timezone.utc)
    manifest_dict = {
        "incident_id": inc_id,
        "timestamp": now_utc.isoformat(),
        "attack_type": ml_out.get("attack_type", "unknown"),
        "risk_level": decision["risk_level"],
        "ml_model_version": ml_out["model_version"],
        "qml_model_version": qml_out.get("model_version", "1.0.0-exp"),
        "verification_status": decision["verification_status"],
        "mitigation_action": decision["recommended_action"],
        "schema_version": "1.0"
    }
    ev_hash = compute_evidence_hash(manifest_dict)
    
    # 7. Persist to DB
    incident_record = Incident(
        incident_id=inc_id,
        detected_at=now_utc,
        target=win_data["target"],
        source_ip=win_data["source_ip"],
        risk_level=decision["risk_level"],
        attack_type=ml_out.get("attack_type", "benign"),
        ml_score=ml_out["score"],
        qml_score=qml_out.get("score"),
        model_version=ml_out["model_version"],
        decision_status=decision["decision_status"],
        verification_status=decision["verification_status"],
        mitigation_status=decision["recommended_action"],
        evidence_hash=ev_hash,
        features_snapshot=features,
        decision_rationale=decision["rationale"]
    )
    db.add(incident_record)
    
    # Save traffic metric snapshot
    metric_record = TrafficMetric(
        incident_id=inc_id,
        window_start=now_utc,
        window_end=now_utc,
        feature_json=features,
        source_type=f"simulated_{req.scenario}"
    )
    db.add(metric_record)
    
    # Audit log
    audit_rec = AuditLog(
        action="INCIDENT_DETECTED",
        resource_type="incident",
        resource_id=inc_id,
        details_json={
            "scenario": req.scenario,
            "decision": decision["decision_status"],
            "risk": decision["risk_level"],
            "action": decision["recommended_action"]
        }
    )
    db.add(audit_rec)
    db.commit()
    db.refresh(incident_record)
    
    # 8. If confirmed high risk, asynchronously enqueue to blockchain
    if decision["risk_level"] in ["HIGH", "CRITICAL"]:
        anchor_worker.enqueue_incident(inc_id, ev_hash, decision["verification_status"])

    return {
        "incident": incident_record,
        "features": features,
        "ml_output": ml_out,
        "qml_output": qml_out,
        "decision": decision,
        "protection": protection_res,
        "evidence_hash": ev_hash
    }
