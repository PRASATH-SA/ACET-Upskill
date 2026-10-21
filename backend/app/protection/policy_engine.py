import logging
from typing import Dict, Any, Optional, Tuple
from app.config import settings
from app.protection.adapters import SimulatedMitigationAdapter, NginxRateLimitAdapter

logger = logging.getLogger(__name__)

class ProtectionPolicyEngine:
    def __init__(self):
        self.emergency_disabled = False
        self.simulated_adapter = SimulatedMitigationAdapter()
        self.nginx_adapter = NginxRateLimitAdapter(self.simulated_adapter)
        
        # Protected allowlist for essential infrastructure
        self.allowlist = {
            "127.0.0.1",
            "::1",
            "localhost",
            "10.0.0.1",
            "192.168.1.1"
        }
        
        # Configurable protection policy mode:
        # "MONITOR_ONLY" | "AUTOMATED_RATE_LIMIT" | "STRICT_DEFENSE"
        self.policy_mode = "MONITOR_ONLY"

    def evaluate_hybrid_decision(
        self,
        ml_result: Dict[str, Any],
        qml_result: Optional[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """
        Combines ML scores, optional QML scores, and uncertainty thresholds.
        Tracks model disagreement as an uncertainty signal.
        """
        ml_score = ml_result.get("score", 0.0)
        qml_score = None
        has_qml = False
        
        if qml_result and qml_result.get("status") == "COMPLETED" and qml_result.get("score") is not None:
            qml_score = qml_result.get("score")
            has_qml = True

        # Weighting: If QML available, 75% ML + 25% QML
        if has_qml:
            composite_score = round(0.75 * ml_score + 0.25 * qml_score, 4)
            score_disagreement = round(abs(ml_score - qml_score), 4)
            is_disagreeing = score_disagreement >= 0.30
        else:
            composite_score = ml_score
            score_disagreement = 0.0
            is_disagreeing = False

        # Determine Uncertainty & Decision Status
        # Uncertainty triggered if:
        # 1. Model score falls inside the gray zone [UNCERTAINTY_LOWER, UNCERTAINTY_UPPER]
        # 2. Or ML and QML strongly disagree
        is_uncertain = (
            (settings.UNCERTAINTY_LOWER <= composite_score <= settings.UNCERTAINTY_UPPER) or
            is_disagreeing
        )
        
        if is_uncertain:
            risk_level = "MEDIUM"
            decision_status = "HUMAN_VERIFICATION"
            verification_status = "UNDER_REVIEW"
            recommended_action = "MANUAL_APPROVAL_REQUIRED"
            rationale = (
                f"Prediction uncertainty detected (Composite Score: {composite_score:.2f}). "
                f"{'Model disagreement detected (delta: ' + str(score_disagreement) + '). ' if is_disagreeing else ''}"
                f"Routed to Analyst Review Queue for manual verification."
            )
        elif composite_score > settings.HIGH_RISK_THRESHOLD:
            risk_level = "HIGH" if composite_score < 0.90 else "CRITICAL"
            decision_status = "POTENTIAL_ATTACK"
            verification_status = "DETECTED"
            
            # Action depends on system protection policy mode
            if self.policy_mode == "MONITOR_ONLY":
                recommended_action = "ALERT"
            elif self.policy_mode == "AUTOMATED_RATE_LIMIT":
                recommended_action = "RATE_LIMIT"
            else:  # STRICT_DEFENSE
                recommended_action = "TEMPORARY_BLOCK"
                
            rationale = (
                f"High confidence attack signature identified (Score: {composite_score:.2f}). "
                f"Triggering policy: {recommended_action}."
            )
        else:
            risk_level = "LOW"
            decision_status = "BENIGN"
            verification_status = "RESOLVED"
            recommended_action = "LOG_ONLY"
            rationale = f"Traffic pattern consistent with legitimate baseline (Score: {composite_score:.2f})."

        return {
            "composite_score": composite_score,
            "ml_score": ml_score,
            "qml_score": qml_score,
            "model_disagreement": score_disagreement,
            "is_disagreeing": is_disagreeing,
            "is_uncertain": is_uncertain,
            "risk_level": risk_level,
            "decision_status": decision_status,
            "verification_status": verification_status,
            "recommended_action": recommended_action,
            "rationale": rationale
        }

    def execute_protection_action(
        self,
        target_ip: str,
        action: str,
        duration_sec: int = 300,
        approved_by: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Executes policy action with protection guarantees:
        - Never blocks allowlisted services.
        - Respects emergency disable switch.
        - Automatically scopes and sets expiration.
        """
        if self.emergency_disabled:
            logger.warning("[PROTECTION] Emergency disable active. Action suppressed.")
            return {"status": "SUPPRESSED", "reason": "Emergency killswitch active"}

        if target_ip in self.allowlist:
            logger.info(f"[PROTECTION] Target {target_ip} is in protected allowlist. Blocking denied.")
            return {"status": "BYPASSED", "reason": "IP is in protected allowlist"}

        if action == "LOG_ONLY":
            return {"status": "APPLIED", "action": "LOG_ONLY"}
        elif action == "ALERT":
            return {"status": "APPLIED", "action": "ALERT"}
        elif action == "RATE_LIMIT":
            success = self.simulated_adapter.apply_rate_limit(target_ip, limit_rps=20, duration_sec=duration_sec)
            return {"status": "APPLIED" if success else "FAILED", "action": "RATE_LIMIT", "duration_sec": duration_sec}
        elif action == "TEMPORARY_BLOCK":
            success = self.simulated_adapter.apply_block(target_ip, duration_sec=duration_sec)
            return {"status": "APPLIED" if success else "FAILED", "action": "TEMPORARY_BLOCK", "duration_sec": duration_sec}
        elif action == "MANUAL_APPROVAL_REQUIRED":
            return {"status": "QUEUED", "action": "MANUAL_APPROVAL_REQUIRED"}
        else:
            return {"status": "IGNORED", "reason": f"Unknown action {action}"}

    def set_emergency_disable(self, enabled: bool) -> bool:
        self.emergency_disabled = enabled
        if enabled:
            self.simulated_adapter.clear_all()
            logger.warning("[PROTECTION] Emergency killswitch ENABLED. All active restrictions purged.")
        else:
            logger.info("[PROTECTION] Emergency killswitch DISABLED. Protection resumed.")
        return self.emergency_disabled

policy_engine = ProtectionPolicyEngine()
