import re
import csv
import io
from typing import Dict, Any, List, Optional
from datetime import datetime, timezone
from app.ml.feature_extractor import TrafficWindow, FeatureExtractor

# Regex for common combined Nginx access log format:
# IP - - [timestamp] "METHOD URI HTTP/1.1" STATUS BYTES "REFERER" "USER_AGENT"
NGINX_LOG_PATTERN = re.compile(
    r'(?P<ip>[\d\.]+)\s+-\s+-\s+\[(?P<time>[^\]]+)\]\s+"(?P<method>\w+)\s+(?P<uri>\S+)\s+[^\"]*"\s+(?P<status>\d+)\s+(?P<bytes>\d+)'
)

class TrafficCollector:
    """Ingests raw HTTP streams, Nginx logs, and flow CSVs into structured windows."""
    
    @staticmethod
    def parse_nginx_logs(log_content: str, window_seconds: float = 5.0) -> Dict[str, Any]:
        lines = log_content.strip().splitlines()
        total_reqs = 0
        total_bytes = 0
        status_codes = []
        endpoints = []
        clients = set()
        
        for line in lines:
            m = NGINX_LOG_PATTERN.search(line)
            if m:
                total_reqs += 1
                total_bytes += int(m.group("bytes"))
                status_codes.append(int(m.group("status")))
                endpoints.append(m.group("uri"))
                clients.add(m.group("ip"))
                
        window = TrafficWindow(
            window_duration_seconds=max(window_seconds, 1.0),
            total_requests=total_reqs,
            total_bytes=total_bytes,
            status_codes=status_codes,
            unique_clients=len(clients),
            endpoints=endpoints,
            connection_failures=sum(1 for s in status_codes if s in [502, 503, 504]),
            tcp_syn_count=None # missing in pure HTTP access logs
        )
        return FeatureExtractor.extract_features(window)

    @staticmethod
    def parse_flow_csv(csv_content: str) -> List[Dict[str, float]]:
        """Parses CSV lines conforming to CIC-DDoS / NetFlow format."""
        reader = csv.DictReader(io.StringIO(csv_content))
        results = []
        for row in reader:
            rps = float(row.get("Flow Packets/s", row.get("requests_per_second", 0.0)))
            bps = float(row.get("Flow Bytes/s", row.get("bytes_per_second", 0.0)))
            dur = float(row.get("Flow Duration", row.get("avg_request_duration_ms", 30.0)))
            syn = float(row.get("SYN Flag Count", row.get("tcp_syn_rate", 0.0)))
            
            features = {
                "requests_per_second": rps,
                "bytes_per_second": bps,
                "avg_request_duration_ms": min(dur, 60000.0),
                "error_rate_5xx": float(row.get("error_rate_5xx", 0.0)),
                "unique_client_ratio": float(row.get("unique_client_ratio", 0.8)),
                "endpoint_concentration": float(row.get("endpoint_concentration", 0.2)),
                "connection_failure_rate": float(row.get("connection_failure_rate", 0.0)),
                "tcp_syn_rate": syn
            }
            results.append(features)
        return results
