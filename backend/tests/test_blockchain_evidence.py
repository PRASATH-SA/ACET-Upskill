import pytest
from app.core.hashing import compute_evidence_hash, sign_evidence_hash, verify_evidence_integrity
from app.blockchain.client import blockchain_client

def test_evidence_hashing_and_signature():
    manifest = {
        "incident_id": "INC-TEST-EVID",
        "timestamp": "2026-10-11T12:00:00Z",
        "attack_type": "http_flood",
        "risk_level": "HIGH",
        "ml_model_version": "1.0.0",
        "qml_model_version": "1.0.0-exp",
        "verification_status": "HUMAN_CONFIRMED",
        "mitigation_action": "TEMPORARY_BLOCK",
        "schema_version": "1.0"
    }
    
    h1 = compute_evidence_hash(manifest)
    h2 = compute_evidence_hash(manifest)
    assert h1 == h2  # Deterministic canonical output
    assert len(h1) == 64
    
    sig = sign_evidence_hash(h1)
    is_hash_valid, is_sig_valid, msg = verify_evidence_integrity(manifest, h1, sig)
    assert is_hash_valid is True
    assert is_sig_valid is True

def test_tamper_detection():
    manifest = {
        "incident_id": "INC-TAMPER",
        "risk_level": "HIGH",
        "schema_version": "1.0"
    }
    h = compute_evidence_hash(manifest)
    sig = sign_evidence_hash(h)
    
    # Tamper with the manifest payload
    manifest["risk_level"] = "LOW"
    is_hash_valid, is_sig_valid, msg = verify_evidence_integrity(manifest, h, sig)
    assert is_hash_valid is False
    assert "mismatch" in msg

def test_blockchain_client_ledger():
    success, tx_hash, block_num, err = blockchain_client.submit_evidence_record(
        incident_id="INC-CHAIN-01",
        evidence_hash="abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789"
    )
    assert success is True
    assert tx_hash.startswith("0x")
    
    res = blockchain_client.verify_on_chain(
        "INC-CHAIN-01",
        "abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789"
    )
    assert res["verified"] is True
    assert res["exists_on_chain"] is True
