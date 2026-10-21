from pydantic import BaseModel
from typing import Optional, List, Dict, Any

class PolicyConfig(BaseModel):
    policy_mode: str  # MONITOR_ONLY, AUTOMATED_RATE_LIMIT, STRICT_DEFENSE
    high_risk_threshold: float
    uncertainty_lower: float
    uncertainty_upper: float
    default_duration_sec: int
    emergency_disabled: bool
    allowlist: List[str]

class PolicyUpdateRequest(BaseModel):
    policy_mode: Optional[str] = None
    high_risk_threshold: Optional[float] = None
    default_duration_sec: Optional[int] = None

class EmergencyDisableRequest(BaseModel):
    disable: bool
    reason: str

class ManualMitigationRequest(BaseModel):
    action_type: str  # RATE_LIMIT, TEMPORARY_BLOCK, REVOKE
    duration_sec: Optional[int] = 300
    reason: str
