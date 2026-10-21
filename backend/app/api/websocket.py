import asyncio
import json
import logging
from typing import Set
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from app.traffic.simulator import TrafficSimulator
from app.protection.policy_engine import policy_engine

logger = logging.getLogger(__name__)
router = APIRouter(tags=["WebSocket"])

class ConnectionManager:
    def __init__(self):
        self.active_connections: Set[WebSocket] = set()

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.add(websocket)

    def disconnect(self, websocket: WebSocket):
        self.active_connections.discard(websocket)

    async def broadcast(self, message: dict):
        dead_connections = set()
        for conn in self.active_connections:
            try:
                await conn.send_json(message)
            except Exception:
                dead_connections.add(conn)
        self.active_connections.difference_update(dead_connections)

manager = ConnectionManager()

@router.websocket("/ws/traffic")
async def websocket_traffic_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            # Generate simulated live heartbeat metric
            win = TrafficSimulator.generate_scenario_window("normal")
            data = {
                "type": "TRAFFIC_PULSE",
                "timestamp": win["timestamp"],
                "rps": win["features"]["requests_per_second"],
                "latency_ms": win["features"]["avg_request_duration_ms"],
                "active_blocks": len(policy_engine.simulated_adapter.get_active()),
                "policy_mode": policy_engine.policy_mode
            }
            await websocket.send_json(data)
            await asyncio.sleep(2.0)
    except WebSocketDisconnect:
        manager.disconnect(websocket)
    except Exception as e:
        logger.error(f"[WS] Error on socket connection: {e}")
        manager.disconnect(websocket)
