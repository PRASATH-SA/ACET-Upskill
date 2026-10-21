import pytest
from app.ml.feature_extractor import FeatureExtractor, TrafficWindow

def test_extract_features_normal():
    window = TrafficWindow(
        window_duration_seconds=5.0,
        total_requests=250,
        total_bytes=300000,
        durations_ms=[20.0, 30.0, 25.0],
        status_codes=[200, 200, 500],
        unique_clients=200,
        endpoints=["/api/v1/test", "/api/v1/test", "/other"],
        connection_failures=1,
        tcp_syn_count=15
    )
    features = FeatureExtractor.extract_features(window)
    assert features["requests_per_second"] == 50.0
    assert features["bytes_per_second"] == 60000.0
    assert features["tcp_syn_rate"] == 3.0
    assert 0.0 <= features["error_rate_5xx"] <= 1.0
    assert 0.0 <= features["unique_client_ratio"] <= 1.0

def test_missing_packet_telemetry_handled_gracefully():
    # TCP SYN count is None (e.g. from standard Nginx HTTP logs)
    window = TrafficWindow(
        window_duration_seconds=5.0,
        total_requests=100,
        total_bytes=50000,
        tcp_syn_count=None
    )
    features = FeatureExtractor.extract_features(window)
    assert features["tcp_syn_rate"] == 0.0  # safely imputed
    vec = FeatureExtractor.to_feature_vector(features)
    assert vec.shape == (1, 8)
