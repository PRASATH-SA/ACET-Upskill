import time
import logging
from typing import Dict, Any, List, Optional
from datetime import datetime, timezone, timedelta

logger = logging.getLogger(__name__)

class MitigationAdapter:
    """Base interface for mitigation enforcement adapters."""
    def apply_rate_limit(self, target_ip: str, limit_rps: int, duration_sec: int) -> bool:
        raise NotImplementedError
        
    def apply_block(self, target_ip: str, duration_sec: int) -> bool:
        raise NotImplementedError
        
    def remove_restriction(self, target_ip: str) -> bool:
        raise NotImplementedError

class SimulatedMitigationAdapter(MitigationAdapter):
    """
    In-memory safe simulation adapter that enforces and expires IP restrictions
    without modifying production system firewall rules.
    """
    def __init__(self):
        # Key: target_ip, Value: {"type": "BLOCK" | "RATE_LIMIT", "limit_rps": int, "expires_at": float}
        self.active_restrictions: Dict[str, Dict[str, Any]] = {}

    def apply_rate_limit(self, target_ip: str, limit_rps: int, duration_sec: int) -> bool:
        expires_at = time.time() + duration_sec
        self.active_restrictions[target_ip] = {
            "type": "RATE_LIMIT",
            "limit_rps": limit_rps,
            "expires_at": expires_at,
            "created_at": time.time()
        }
        logger.info(f"[MITIGATION] Simulated rate limit of {limit_rps} rps applied to {target_ip} for {duration_sec}s")
        return True

    def apply_block(self, target_ip: str, duration_sec: int) -> bool:
        expires_at = time.time() + duration_sec
        self.active_restrictions[target_ip] = {
            "type": "TEMPORARY_BLOCK",
            "limit_rps": 0,
            "expires_at": expires_at,
            "created_at": time.time()
        }
        logger.info(f"[MITIGATION] Simulated temporary block applied to {target_ip} for {duration_sec}s")
        return True

    def remove_restriction(self, target_ip: str) -> bool:
        if target_ip in self.active_restrictions:
            del self.active_restrictions[target_ip]
            logger.info(f"[MITIGATION] Restriction removed for {target_ip}")
            return True
        return False

    def get_active(self) -> List[Dict[str, Any]]:
        now = time.time()
        # Clean up expired
        expired = [ip for ip, data in self.active_restrictions.items() if data["expires_at"] <= now]
        for ip in expired:
            del self.active_restrictions[ip]
            logger.info(f"[MITIGATION] Auto-expired restriction for {ip}")
            
        return [
            {
                "ip": ip,
                "type": data["type"],
                "limit_rps": data.get("limit_rps", 0),
                "remaining_seconds": max(0, int(data["expires_at"] - now)),
                "expires_at": datetime.fromtimestamp(data["expires_at"], timezone.utc).isoformat()
            }
            for ip, data in self.active_restrictions.items()
        ]

    def clear_all(self):
        """Emergency disable switch: immediately revokes all restrictions."""
        count = len(self.active_restrictions)
        self.active_restrictions.clear()
        logger.warning(f"[MITIGATION] EMERGENCY PURGE: All {count} active restrictions cleared.")
        return count

class NginxRateLimitAdapter(MitigationAdapter):
    """
    Adapter demonstrating dynamic Nginx rate limiting via configuration or upstream headers.
    """
    def __init__(self, sim_adapter: SimulatedMitigationAdapter):
        self.sim = sim_adapter

    def apply_rate_limit(self, target_ip: str, limit_rps: int, duration_sec: int) -> bool:
        # In prototype/VPS deployment, logs Nginx zone directive update and delegates to state tracker
        logger.info(f"[NGINX ADAPTER] Setting limit_req_zone for client {target_ip} to rate={limit_rps}r/s")
        return self.sim.apply_rate_limit(target_ip, limit_rps, duration_sec)

    def apply_block(self, target_ip: str, duration_sec: int) -> bool:
        logger.info(f"[NGINX ADAPTER] Setting deny {target_ip}; in Nginx server block")
        return self.sim.apply_block(target_ip, duration_sec)

    def remove_restriction(self, target_ip: str) -> bool:
        logger.info(f"[NGINX ADAPTER] Removing deny/limit directive for {target_ip}")
        return self.sim.remove_restriction(target_ip)
