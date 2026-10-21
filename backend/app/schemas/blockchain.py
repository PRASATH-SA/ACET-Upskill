from pydantic import BaseModel
from typing import Optional, List, Dict, Any

class BlockchainStatus(BaseModel):
    is_connected: bool
    rpc_url: str
    contract_address: str
    total_records: int
    latest_block: int
    mode: str

class VerificationResult(BaseModel):
    incident_id: str
    is_hash_valid: bool
    is_signature_valid: bool
    is_anchored_on_chain: bool
    blockchain_tx_hash: Optional[str] = None
    block_number: Optional[int] = None
    stored_hash: str
    recomputed_hash: str
    detail: str
