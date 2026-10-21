import random
import time
from typing import Dict, Any, List
from datetime import datetime, timezone
from app.ml.feature_extractor import TrafficWindow, FeatureExtractor

class TrafficSimulator:
    """
    Simulates network flows across different operational scenarios:
    - Normal baseline traffic
    - High-volume HTTP GET/POST Flood
    - TCP SYN Flood (missing or present packet telemetry)
    - Slowloris (high latency connection exhaustion)
    - Edge/Uncertain boundary traffic (triggers human verification review)
    """
    
    @staticmethod
    def generate_scenario_window(scenario: str = "normal") -> Dict[str, Any]:
        duration = 5.0
        now = datetime.now(timezone.utc)
        
        if scenario == "normal":
            total_requests = random.randint(120, 280)
            total_bytes = total_requests * random.randint(800, 1600)
            durations = [random.uniform(15, 65) for _ in range(total_requests)]
            # mostly 200 OK
            status_codes = [200] * int(total_requests * 0.95) + [404] * int(total_requests * 0.04) + [500] * int(total_requests * 0.01)
            unique_clients = random.randint(int(total_requests * 0.6), total_requests)
            endpoints = random.choices(["/api/v1/products", "/api/v1/user", "/static/logo.png", "/search"], k=total_requests)
            failures = random.randint(0, 2)
            syn_count = random.randint(5, 25)
            source_ip = f"198.51.100.{random.randint(10, 250)}"
            
        elif scenario == "http_flood":
            total_requests = random.randint(4500, 9500)
            total_bytes = total_requests * random.randint(2200, 4800)
            durations = [random.uniform(180, 850) for _ in range(100)] # sampled
            status_codes = [503] * int(total_requests * 0.5) + [500] * int(total_requests * 0.3) + [200] * int(total_requests * 0.2)
            unique_clients = random.randint(1, 8)  # concentrated IPs
            endpoints = ["/api/v1/checkout"] * total_requests  # targeted single endpoint
            failures = random.randint(800, 2500)
            syn_count = random.randint(40, 120)
            source_ip = f"203.0.113.{random.randint(5, 20)}"
            
        elif scenario == "syn_flood":
            total_requests = random.randint(300, 900)
            total_bytes = total_requests * 120
            durations = [random.uniform(900, 2500) for _ in range(50)]
            status_codes = [504] * int(total_requests * 0.7) + [200] * int(total_requests * 0.3)
            unique_clients = random.randint(15, 60)
            endpoints = ["/"] * total_requests
            failures = random.randint(200, 700)
            syn_count = random.randint(3500, 8000)  # Massive SYN burst
            source_ip = f"192.0.2.{random.randint(50, 99)}"
            
        elif scenario == "slowloris":
            total_requests = random.randint(40, 90)
            total_bytes = total_requests * 80
            durations = [random.uniform(6000, 14000) for _ in range(total_requests)]
            status_codes = [408] * int(total_requests * 0.6) + [504] * int(total_requests * 0.4)
            unique_clients = random.randint(2, 6)
            endpoints = ["/login", "/api/auth"] * (total_requests // 2)
            failures = random.randint(30, 80)
            syn_count = random.randint(10, 30)
            source_ip = f"198.18.0.{random.randint(100, 150)}"
            
        elif scenario == "uncertain_boundary":
            # Edge case specifically crafted to sit inside the human-review uncertainty region
            total_requests = random.randint(700, 1100)
            total_bytes = total_requests * 1500
            durations = [random.uniform(90, 210) for _ in range(total_requests)]
            status_codes = [200] * int(total_requests * 0.8) + [500] * int(total_requests * 0.15) + [429] * int(total_requests * 0.05)
            unique_clients = random.randint(10, 35)
            endpoints = random.choices(["/api/v1/catalog", "/search?q=sale"], k=total_requests)
            failures = random.randint(20, 60)
            syn_count = random.randint(90, 200)
            source_ip = f"172.16.42.{random.randint(10, 40)}"
            
        else: # default fallback
            return TrafficSimulator.generate_scenario_window("normal")

        window = TrafficWindow(
            window_duration_seconds=duration,
            total_requests=total_requests,
            total_bytes=total_bytes,
            durations_ms=durations,
            status_codes=status_codes,
            unique_clients=unique_clients,
            endpoints=endpoints,
            connection_failures=failures,
            tcp_syn_count=syn_count
        )
        
        extracted = FeatureExtractor.extract_features(window)
        return {
            "scenario": scenario,
            "window_duration_sec": duration,
            "source_ip": source_ip,
            "target": endpoints[0] if endpoints else "/api/gateway",
            "features": extracted,
            "timestamp": now.isoformat()
        }
