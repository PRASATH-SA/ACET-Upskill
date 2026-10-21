import pytest
from app.ml.detection_engine import DetectionEngine

def test_ml_detection_inference():
    engine = DetectionEngine(model_name="xgboost")
    normal_features = {
        "requests_per_second": 30.0,
        "bytes_per_second": 40000.0,
        "avg_request_duration_ms": 25.0,
        "error_rate_5xx": 0.0,
        "unique_client_ratio": 0.9,
        "endpoint_concentration": 0.2,
        "connection_failure_rate": 0.0,
        "tcp_syn_rate": 5.0
    }
    result = engine.predict("INC-TEST-01", normal_features)
    assert result["incident_id"] == "INC-TEST-01"
    assert result["prediction"] == "benign"
    assert result["score"] < 0.50

def test_ml_detection_attack_identification():
    engine = DetectionEngine(model_name="xgboost")
    flood_features = {
        "requests_per_second": 4500.0,
        "bytes_per_second": 12000000.0,
        "avg_request_duration_ms": 450.0,
        "error_rate_5xx": 0.65,
        "unique_client_ratio": 0.02,
        "endpoint_concentration": 0.95,
        "connection_failure_rate": 0.40,
        "tcp_syn_rate": 20.0
    }
    result = engine.predict("INC-TEST-02", flood_features)
    assert result["prediction"] == "potential_ddos"
    assert result["score"] >= 0.50
    assert result["attack_type"] == "http_flood"

def test_ml_detection_error_recovery():
    # Pass malformed empty dictionary
    engine = DetectionEngine(model_name="xgboost")
    result = engine.predict("INC-FAIL", {})
    assert result["incident_id"] == "INC-FAIL"
    assert "score" in result
