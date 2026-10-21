from typing import Dict, Any, List, Optional
import numpy as np
from pydantic import BaseModel, Field

# Canonical feature list expected by our ML models
CANONICAL_FEATURES = [
    "requests_per_second",
    "bytes_per_second",
    "avg_request_duration_ms",
    "error_rate_5xx",
    "unique_client_ratio",
    "endpoint_concentration",
    "connection_failure_rate",
    "tcp_syn_rate"
]

class TrafficWindow(BaseModel):
    window_duration_seconds: float = Field(default=5.0, ge=0.5)
    total_requests: int = Field(default=0, ge=0)
    total_bytes: int = Field(default=0, ge=0)
    durations_ms: List[float] = Field(default_factory=list)
    status_codes: List[int] = Field(default_factory=list)
    unique_clients: int = Field(default=1, ge=0)
    endpoints: List[str] = Field(default_factory=list)
    connection_failures: int = Field(default=0, ge=0)
    tcp_syn_count: Optional[int] = Field(default=None)

class FeatureExtractor:
    """Extracts, handles missing values, and normalizes traffic window features."""
    
    @staticmethod
    def extract_features(window: TrafficWindow) -> Dict[str, float]:
        dur = max(window.window_duration_seconds, 0.001)
        rps = window.total_requests / dur
        bps = window.total_bytes / dur
        
        # Latency statistics
        if window.durations_ms:
            avg_duration = float(np.mean(window.durations_ms))
        else:
            avg_duration = 25.0  # default baseline
            
        # Status code ratios
        total_reqs = max(window.total_requests, 1)
        cnt_5xx = sum(1 for c in window.status_codes if 500 <= c <= 599)
        error_5xx_ratio = cnt_5xx / total_reqs
        
        # Unique client ratio (unique IPs / total requests)
        unique_client_ratio = min(window.unique_clients / total_reqs, 1.0)
        
        # Endpoint concentration: frequency of the most requested endpoint
        if window.endpoints:
            from collections import Counter
            counts = Counter(window.endpoints)
            top_count = counts.most_common(1)[0][1]
            endpoint_concentration = top_count / total_reqs
        else:
            endpoint_concentration = 1.0
            
        # Connection failure rate
        conn_failure_rate = window.connection_failures / max(total_reqs + window.connection_failures, 1)
        
        # TCP SYN rate (explicit handling for missing packet-level features)
        if window.tcp_syn_count is not None:
            tcp_syn_rate = window.tcp_syn_count / dur
        else:
            # Impute/represent as missing signal: 0.0 with flag
            tcp_syn_rate = 0.0
            
        return {
            "requests_per_second": round(float(rps), 3),
            "bytes_per_second": round(float(bps), 3),
            "avg_request_duration_ms": round(float(avg_duration), 3),
            "error_rate_5xx": round(float(error_5xx_ratio), 4),
            "unique_client_ratio": round(float(unique_client_ratio), 4),
            "endpoint_concentration": round(float(endpoint_concentration), 4),
            "connection_failure_rate": round(float(conn_failure_rate), 4),
            "tcp_syn_rate": round(float(tcp_syn_rate), 3),
        }

    @staticmethod
    def to_feature_vector(features: Dict[str, float]) -> np.ndarray:
        """Convert dictionary to ordered NumPy vector matching CANONICAL_FEATURES."""
        vec = [features.get(f, 0.0) for f in CANONICAL_FEATURES]
        return np.array(vec, dtype=np.float32).reshape(1, -1)
