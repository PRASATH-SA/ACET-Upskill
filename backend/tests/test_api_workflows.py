import pytest
from fastapi.testclient import TestClient
from app.main import app, seed_initial_data
from app.database import init_db

@pytest.fixture(scope="module", autouse=True)
def setup_test_db():
    init_db()
    seed_initial_data()


def test_api_health():
    client = TestClient(app)
    resp = client.get("/health")
    assert resp.status_code == 200
    assert resp.json()["status"] == "healthy"

def test_auth_and_protected_flow():
    client = TestClient(app)
    # Login as analyst
    login_resp = client.post("/api/auth/login", json={"username": "analyst", "password": "analyst123"})
    assert login_resp.status_code == 200
    token = login_resp.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    
    # Check /me
    me_resp = client.get("/api/auth/me", headers=headers)
    assert me_resp.status_code == 200
    assert me_resp.json()["username"] == "analyst"

def test_simulation_and_incident_flow():
    client = TestClient(app)
    sim_resp = client.post("/api/incidents/simulate", json={"scenario": "http_flood"})
    assert sim_resp.status_code == 200
    data = sim_resp.json()
    assert "incident" in data
    assert "ml_output" in data
    assert "qml_output" in data
    assert "evidence_hash" in data
    inc_id = data["incident"]["incident_id"]

    # Verify incident retrieved
    get_resp = client.get(f"/api/incidents/{inc_id}")
    assert get_resp.status_code == 200
    assert get_resp.json()["incident_id"] == inc_id

    # Verify evidence manifest
    ev_resp = client.get(f"/api/incidents/{inc_id}/evidence")
    assert ev_resp.status_code == 200
    assert ev_resp.json()["evidence_hash"] == data["evidence_hash"]
    assert "digital_signature" in ev_resp.json()

def test_analyst_review_workflow():
    client = TestClient(app)
    # Login
    login_resp = client.post("/api/auth/login", json={"username": "analyst", "password": "analyst123"})
    token = login_resp.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Simulate uncertain boundary case
    sim_resp = client.post("/api/incidents/simulate", json={"scenario": "uncertain_boundary"})
    inc_id = sim_resp.json()["incident"]["incident_id"]

    # Review as analyst
    review_resp = client.post(
        f"/api/reviews/{inc_id}",
        headers=headers,
        json={
            "decision": "HUMAN_CONFIRMED",
            "reason": "Verified traffic signature matches known layer 7 attack tooling",
            "mitigation_action": "RATE_LIMIT"
        }
    )
    assert review_resp.status_code == 200
    assert review_resp.json()["verification_status"] == "HUMAN_CONFIRMED"
    assert review_resp.json()["mitigation_status"] == "RATE_LIMIT"
