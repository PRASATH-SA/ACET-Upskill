import pytest
from app.protection.policy_engine import policy_engine

def test_allowlist_protection():
    # Attempting to block localhost or internal IP must be rejected
    res = policy_engine.execute_protection_action("127.0.0.1", "TEMPORARY_BLOCK")
    assert res["status"] == "BYPASSED"
    assert "allowlist" in res["reason"]

def test_mitigation_application_and_expiration():
    target_ip = "198.51.100.99"
    res = policy_engine.execute_protection_action(target_ip, "TEMPORARY_BLOCK", duration_sec=1)
    assert res["status"] == "APPLIED"
    
    active = policy_engine.simulated_adapter.get_active()
    assert any(item["ip"] == target_ip for item in active)

def test_emergency_killswitch():
    policy_engine.execute_protection_action("198.51.100.105", "TEMPORARY_BLOCK", duration_sec=300)
    # Trigger emergency killswitch
    policy_engine.set_emergency_disable(True)
    active = policy_engine.simulated_adapter.get_active()
    assert len(active) == 0
    # Re-enable protection
    policy_engine.set_emergency_disable(False)
