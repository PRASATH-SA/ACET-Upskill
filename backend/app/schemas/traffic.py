from pydantic import BaseModel
from typing import Dict, Any, Optional

class SimulationRequest(BaseModel):
    scenario: str = "http_flood"  # normal, http_flood, syn_flood, slowloris, uncertain_boundary
    target: Optional[str] = "/api/v1/resource"
    client_count: Optional[int] = 50

class IngestLogRequest(BaseModel):
    log_content: str
    source_type: str = "nginx"
