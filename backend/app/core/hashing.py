import json
import hashlib
import hmac
from typing import Dict, Any, Tuple
from app.config import settings

def canonicalize_json(data: Dict[str, Any]) -> str:
    """
    Produce a deterministic, canonical JSON string (RFC 8785 subset):
    - Keys sorted alphabetically
    - No unnecessary whitespace
    - Strict UTF-8 representation
    """
    return json.dumps(data, sort_keys=True, separators=(',', ':'), ensure_ascii=False)

def compute_evidence_hash(manifest: Dict[str, Any]) -> str:
    """
    Compute deterministic SHA-256 hash digest of an incident manifest.
    Removes mutable fields like evidence_hash and digital_signature if present before hashing.
    """
    clean_manifest = {
        k: v for k, v in manifest.items() 
        if k not in ("evidence_hash", "digital_signature")
    }
    canonical_bytes = canonicalize_json(clean_manifest).encode("utf-8")
    return hashlib.sha256(canonical_bytes).hexdigest()

def sign_evidence_hash(evidence_hash: str) -> str:
    """
    Cryptographically sign the evidence hash using the server's evidence signing key.
    Produces an HMAC-SHA256 digital signature hex digest.
    """
    sig = hmac.new(
        settings.EVIDENCE_SIGNING_KEY.encode("utf-8"),
        evidence_hash.encode("utf-8"),
        hashlib.sha256
    ).hexdigest()
    return sig

def verify_evidence_integrity(
    manifest: Dict[str, Any], 
    claimed_hash: str, 
    claimed_signature: str
) -> Tuple[bool, bool, str]:
    """
    Verifies:
    1. Recomputed SHA-256 matches claimed_hash
    2. Digital signature is authentic
    Returns: (is_hash_valid, is_signature_valid, diagnostic_msg)
    """
    recomputed_hash = compute_evidence_hash(manifest)
    hash_valid = hmac.compare_digest(recomputed_hash, claimed_hash)
    
    expected_sig = sign_evidence_hash(claimed_hash)
    sig_valid = hmac.compare_digest(expected_sig, claimed_signature)
    
    if not hash_valid:
        return False, sig_valid, f"Hash mismatch: computed {recomputed_hash} != {claimed_hash}"
    if not sig_valid:
        return True, False, "Digital signature verification failed"
    
    return True, True, "Evidence integrity fully verified"
