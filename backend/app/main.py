import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.database import init_db, SessionLocal
from app.models.user import User
from app.models.incident import Incident
from app.core.security import hash_password
from app.core.hashing import compute_evidence_hash
from app.api import auth, dashboard, incidents, reviews, protection, blockchain, websocket
from datetime import datetime, timezone, timedelta

# Logging configuration
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("ddos_defense")

def seed_initial_data():
    db = SessionLocal()
    try:
        # 1. Seed Default Users
        if not db.query(User).filter(User.username == "analyst").first():
            analyst = User(
                username="analyst",
                password_hash=hash_password("analyst123"),
                role="analyst",
                is_active=True
            )
            db.add(analyst)
            
        if not db.query(User).filter(User.username == "admin").first():
            admin = User(
                username="admin",
                password_hash=hash_password("admin123"),
                role="admin",
                is_active=True
            )
            db.add(admin)
            
        db.commit()

        # 2. Seed Initial Demonstration Incidents if table is empty
        if db.query(Incident).count() == 0:
            now = datetime.now(timezone.utc)
            demo_incidents = [
                {
                    "incident_id": "INC-8A9F1B01",
                    "detected_at": now - timedelta(minutes=45),
                    "target": "/api/v1/checkout",
                    "source_ip": "203.0.113.14",
                    "risk_level": "CRITICAL",
                    "attack_type": "http_flood",
                    "ml_score": 0.965,
                    "qml_score": 0.942,
                    "decision_status": "POTENTIAL_ATTACK",
                    "verification_status": "HUMAN_CONFIRMED",
                    "mitigation_status": "TEMPORARY_BLOCK",
                    "decision_rationale": "High-rate layer 7 HTTP flood targeting checkout gateway. Request rate > 6,400 rps with 503 response concentration.",
                    "features_snapshot": {
                        "requests_per_second": 6420.0,
                        "bytes_per_second": 14200000.0,
                        "avg_request_duration_ms": 680.0,
                        "error_rate_5xx": 0.72,
                        "unique_client_ratio": 0.02,
                        "endpoint_concentration": 0.94,
                        "connection_failure_rate": 0.48,
                        "tcp_syn_rate": 45.0
                    }
                },
                {
                    "incident_id": "INC-7C3D4E02",
                    "detected_at": now - timedelta(minutes=20),
                    "target": "/api/v1/catalog",
                    "source_ip": "172.16.42.18",
                    "risk_level": "MEDIUM",
                    "attack_type": "http_flood",
                    "ml_score": 0.58,
                    "qml_score": 0.62,
                    "decision_status": "HUMAN_VERIFICATION",
                    "verification_status": "UNDER_REVIEW",
                    "mitigation_status": "MANUAL_APPROVAL_REQUIRED",
                    "decision_rationale": "Prediction uncertainty detected (Composite Score: 0.59). Routed to Analyst Review Queue for manual verification.",
                    "features_snapshot": {
                        "requests_per_second": 890.0,
                        "bytes_per_second": 1250000.0,
                        "avg_request_duration_ms": 145.0,
                        "error_rate_5xx": 0.12,
                        "unique_client_ratio": 0.28,
                        "endpoint_concentration": 0.65,
                        "connection_failure_rate": 0.08,
                        "tcp_syn_rate": 110.0
                    }
                },
                {
                    "incident_id": "INC-3E2A1003",
                    "detected_at": now - timedelta(minutes=5),
                    "target": "/api/v1/auth",
                    "source_ip": "198.18.0.112",
                    "risk_level": "HIGH",
                    "attack_type": "slowloris",
                    "ml_score": 0.88,
                    "qml_score": 0.81,
                    "decision_status": "POTENTIAL_ATTACK",
                    "verification_status": "DETECTED",
                    "mitigation_status": "RATE_LIMIT",
                    "decision_rationale": "Slowloris slow-rate connection starvation detected. Connection duration > 8,200 ms with high connection exhaustion.",
                    "features_snapshot": {
                        "requests_per_second": 65.0,
                        "bytes_per_second": 8200.0,
                        "avg_request_duration_ms": 8200.0,
                        "error_rate_5xx": 0.65,
                        "unique_client_ratio": 0.04,
                        "endpoint_concentration": 0.98,
                        "connection_failure_rate": 0.72,
                        "tcp_syn_rate": 18.0
                    }
                }
            ]

            for d in demo_incidents:
                manifest = {
                    "incident_id": d["incident_id"],
                    "timestamp": d["detected_at"].isoformat(),
                    "attack_type": d["attack_type"],
                    "risk_level": d["risk_level"],
                    "ml_model_version": "1.0.0",
                    "qml_model_version": "1.0.0-exp",
                    "verification_status": d["verification_status"],
                    "mitigation_action": d["mitigation_status"],
                    "schema_version": "1.0"
                }
                ev_hash = compute_evidence_hash(manifest)
                inc = Incident(
                    incident_id=d["incident_id"],
                    detected_at=d["detected_at"],
                    target=d["target"],
                    source_ip=d["source_ip"],
                    risk_level=d["risk_level"],
                    attack_type=d["attack_type"],
                    ml_score=d["ml_score"],
                    qml_score=d["qml_score"],
                    model_version="1.0.0",
                    decision_status=d["decision_status"],
                    verification_status=d["verification_status"],
                    mitigation_status=d["mitigation_status"],
                    evidence_hash=ev_hash,
                    features_snapshot=d["features_snapshot"],
                    decision_rationale=d["decision_rationale"]
                )
                db.add(inc)
            db.commit()
            logger.info("[INIT] Seeded default users (admin, analyst) and demonstration incidents.")
    finally:
        db.close()

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    logger.info("[STARTUP] Initializing database and verifying models...")
    init_db()
    seed_initial_data()
    yield
    # Shutdown
    logger.info("[SHUTDOWN] Graceful shutdown completed.")

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="Hybrid ML-QML DDoS Detection, Automated Protection, and Blockchain Evidence Preservation",
    lifespan=lifespan
)

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Routers
app.include_router(auth.router, prefix=settings.API_V1_STR)
app.include_router(dashboard.router, prefix=settings.API_V1_STR)
app.include_router(incidents.router, prefix=settings.API_V1_STR)
app.include_router(reviews.router, prefix=settings.API_V1_STR)
app.include_router(protection.router, prefix=settings.API_V1_STR)
app.include_router(blockchain.router, prefix=settings.API_V1_STR)
app.include_router(websocket.router, prefix=settings.API_V1_STR)

@app.get("/")
def root():
    return {
        "system": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "status": "OPERATIONAL",
        "docs_url": "/docs"
    }

@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "timestamp": datetime.now(timezone.utc).isoformat()
    }
