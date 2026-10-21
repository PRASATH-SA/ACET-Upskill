import pytest
from app.qml.quantum_engine import QuantumDDoSClassifier

def test_qml_simulation_execution():
    q_engine = QuantumDDoSClassifier(num_qubits=4, shots=512)
    features = {
        "requests_per_second": 2500.0,
        "tcp_syn_rate": 800.0,
        "connection_failure_rate": 0.55,
        "avg_request_duration_ms": 350.0
    }
    result = q_engine.evaluate("INC-QML-01", features)
    assert result["status"] == "COMPLETED"
    assert result["score"] is not None
    assert 0.0 <= result["score"] <= 1.0
    assert result["qubits_used"] == 4
    assert result["circuit_depth"] == 4

def test_qml_disagreement_detection():
    from app.protection.policy_engine import policy_engine
    ml_out = {"score": 0.95, "model_version": "1.0.0"}
    qml_out = {"status": "COMPLETED", "score": 0.30, "model_version": "1.0.0-exp"}
    decision = policy_engine.evaluate_hybrid_decision(ml_out, qml_out)
    assert decision["is_disagreeing"] is True
    assert decision["is_uncertain"] is True
    assert decision["decision_status"] == "HUMAN_VERIFICATION"
