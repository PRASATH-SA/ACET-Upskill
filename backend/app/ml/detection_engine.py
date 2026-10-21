import os
import logging
from datetime import datetime, timezone
from typing import Dict, Any, Optional
import joblib
import numpy as np
from app.ml.feature_extractor import FeatureExtractor, CANONICAL_FEATURES

logger = logging.getLogger(__name__)

class DetectionEngine:
    def __init__(self, model_name: str = "xgboost"):
        self.model_name = model_name
        self.model_version = "1.0.0"
        self.model = None
        self.model_dir = os.path.join(os.path.dirname(__file__), "saved_models")
        self.load_model()
        
    def load_model(self):
        try:
            filename = "xgboost_v1.joblib" if self.model_name == "xgboost" else "random_forest_v1.joblib"
            path = os.path.join(self.model_dir, filename)
            if os.path.exists(path):
                self.model = joblib.load(path)
                logger.info(f"[ML] Successfully loaded {self.model_name} from {path}")
            else:
                logger.warning(f"[ML] Pretrained model {path} not found. Will initialize heuristic baseline fallback.")
                self.model = None
        except Exception as e:
            logger.error(f"[ML] Failed to load model {self.model_name}: {e}")
            self.model = None

    def predict(self, incident_id: str, features: Dict[str, float]) -> Dict[str, Any]:
        """
        Validates schema and runs inference. Returns structured detection result.
        Safe against missing or malformed inputs.
        """
        now_iso = datetime.now(timezone.utc).isoformat()
        try:
            # Feature extraction and ordering
            vec = FeatureExtractor.to_feature_vector(features)
            
            if self.model is not None:
                # Scikit-learn / XGBoost inference
                probs = self.model.predict_proba(vec)[0]
                # Probability of attack class (index 1)
                attack_prob = float(probs[1]) if len(probs) > 1 else float(probs[0])
            else:
                # Heuristic calibrated score fallback
                rps = features.get("requests_per_second", 0)
                syn = features.get("tcp_syn_rate", 0)
                fail = features.get("connection_failure_rate", 0)
                score = min(1.0, (rps / 500.0) * 0.4 + (syn / 1000.0) * 0.4 + fail * 0.2)
                attack_prob = float(score)

            prediction_label = "potential_ddos" if attack_prob >= 0.50 else "benign"
            
            # Infer attack subtype based on dominant signature
            attack_type = "benign"
            if attack_prob >= 0.50:
                if features.get("tcp_syn_rate", 0) > 300:
                    attack_type = "syn_flood"
                elif features.get("avg_request_duration_ms", 0) > 4000:
                    attack_type = "slowloris"
                else:
                    attack_type = "http_flood"

            return {
                "incident_id": incident_id,
                "prediction": prediction_label,
                "attack_type": attack_type,
                "score": round(attack_prob, 4),
                "model": self.model_name,
                "model_version": self.model_version,
                "timestamp": now_iso,
                "status": "SUCCESS"
            }
        except Exception as e:
            logger.error(f"[ML] Inference error for incident {incident_id}: {e}")
            return {
                "incident_id": incident_id,
                "prediction": "inconclusive",
                "attack_type": "unknown",
                "score": 0.50,
                "model": self.model_name,
                "model_version": self.model_version,
                "timestamp": now_iso,
                "status": "ERROR",
                "error_detail": str(e)
            }

# Global singleton engine
default_ml_engine = DetectionEngine(model_name="xgboost")
