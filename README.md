# Hybrid ML-QML Framework for Human-Verified DDoS Detection, Automated Protection, and Blockchain Evidence Preservation

[![System Status](https://img.shields.io/badge/System-Operational-emerald)]()
[![Python](https://img.shields.io/badge/Python-3.11%20%7C%203.13-blue)]()
[![Node](https://img.shields.io/badge/Node-v20%2B-green)]()
[![Qiskit](https://img.shields.io/badge/Qiskit-2.5-purple)]()
[![Solidity](https://img.shields.io/badge/Solidity-0.8.20-gray)]()
[![License](https://img.shields.io/badge/License-MIT-lightgrey)]()

A full-stack cybersecurity prototype combining **Machine Learning (XGBoost / Random Forest)** for high-velocity layer-4/7 traffic classification, **Quantum Machine Learning (Qiskit Statevector/VQC)** as an experimental secondary analysis layer for boundary ambiguity, **Human-in-the-Loop Analyst Verification** for edge uncertainty, **Reversible Policy-Driven Mitigation** (rate limiting, temporary blocking, allowlists, and emergency killswitch), and an **Immutable Private EVM Blockchain Registry** for cryptographic SHA-256 evidence anchoring.

---

## Architecture Overview

```
 Network Ingress / Authorized Probes
                 │
                 ▼
     [Traffic Feature Extractor]
     (Sliding windows, rps, syn_rate, error ratios)
                 │
                 ▼
     [ML Detection Engine (XGBoost)]
                 │
        ┌────────┴────────┐
        ▼                 ▼
   High Confidence   Uncertain / Edge Case
        │                 │
        │                 ▼
        │        [QML Secondary Worker (Qiskit)]
        │                 │
        └────────┬────────┘
                 ▼
      [Hybrid Risk Engine]
   (Disagreement Tracking & Uncertainty Scoring)
                 │
       ┌─────────┴─────────┐
       ▼                   ▼
[Protection Policy]  [Human Verification]
  - RATE_LIMIT         - Review Queue
  - TEMPORARY_BLOCK    - Confirm / Reject
  - Auto-expiration    - Immutable Audit Log
       │                   │
       └─────────┬─────────┘
                 ▼
     [Canonical JSON Manifest]
                 │
                 ▼
       [SHA-256 Digest & HMAC]
                 │
                 ▼
  [AttackEvidenceRegistry.sol]
      (Private EVM Node)
                 │
                 ▼
  [Forensic Verification Dashboard]
```

---

## Key Features

1. **Dual Detection Engine**:
   - Primary: High-speed **XGBoost & Random Forest** trained on flow telemetry (evaluating rps, bytes/sec, latency, 5xx ratios, endpoint concentration, and TCP SYN rates).
   - Secondary: **Quantum Machine Learning (Qiskit)** angle feature mapping and entangled CNOT ansatz for non-linear resolution on overlapping edge traffic.
2. **Resilience & Fault Tolerance**:
   - If the QML worker or EVM node is unavailable or fails, ML detection and automated protection continue without interruption.
   - Mitigation enforcement never blocks while awaiting blockchain confirmation.
3. **Safe Mitigation Safeguards**:
   - Protected allowlist for essential services (`127.0.0.1`, `::1`, `localhost`, etc.).
   - Automatic expiration timers for temporary blocks and rate limits.
   - Master **Emergency Killswitch** that immediately flushes all active restrictions.
4. **Tamper-Evident Evidence Preservation**:
   - RFC 8785 canonical JSON manifests.
   - SHA-256 evidence digests signed via HMAC/ECDSA keys.
   - Solidity smart contract (`AttackEvidenceRegistry.sol`) with append-only access control.
5. **Human-in-the-Loop Workflow**:
   - Incidents in the uncertainty band (`0.35 <= composite_score <= 0.70` or model disagreement `> 30%`) automatically route to the analyst verification queue.

---

## Directory Structure

```
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI application & lifecycle
│   │   ├── config.py            # Settings & thresholds
│   │   ├── database.py          # SQLAlchemy SQLite / PostgreSQL
│   │   ├── models/              # SQLAlchemy schema (incidents, reviews, audit logs)
│   │   ├── schemas/             # Pydantic validation schemas
│   │   ├── core/
│   │   │   ├── security.py      # PBKDF2 password hashing & JWT
│   │   │   └── hashing.py       # Canonical JSON hashing & signatures
│   │   ├── ml/
│   │   │   ├── feature_extractor.py
│   │   │   ├── detection_engine.py
│   │   │   └── train.py         # Benchmark model training script
│   │   ├── qml/
│   │   │   └── quantum_engine.py # Qiskit & exact statevector simulation
│   │   ├── protection/
│   │   │   ├── policy_engine.py # Hybrid scoring & allowlist safeguards
│   │   │   └── adapters.py      # Simulated & Nginx rate limit adapters
│   │   ├── blockchain/
│   │   │   ├── client.py        # EVM JSON-RPC client with fallback ledger
│   │   │   └── worker.py        # Asynchronous transaction submission worker
│   │   └── traffic/
│   │       ├── collector.py     # Nginx & CSV dataset parser
│   │       └── simulator.py     # Multi-scenario traffic probe generator
│   └── tests/                   # 17 automated unit and integration tests
├── contracts/
│   ├── AttackEvidenceRegistry.sol # Smart contract
│   ├── hardhat.config.js
│   └── scripts/deploy.js
├── frontend/
│   ├── src/
│   │   ├── pages/               # 7 interactive SOC cyber dashboard pages
│   │   ├── components/          # Reusable UI widgets, badges, modals
│   │   └── services/            # API client and WebSocket handlers
│   └── vite.config.ts
├── docker/                      # Dockerfiles & Nginx gateway configs
├── docker-compose.yml           # Complete containerized stack
├── .env.example
└── README.md
```

---

## Quickstart: Local Development

### ⚡ 1-Click Windows Launchers (Recommended)

Three production-ready batch scripts are provided in the root folder:

- **Run Everything**: Double-click [`run_all.bat`](file:///d:/Projects/DDoS%20prevention/run_all.bat) or [`start.bat`](file:///d:/Projects/DDoS%20prevention/start.bat) to launch the FastAPI Backend, Vite Cyber Frontend, health check validation, and automatic browser launch to **http://localhost:5173**.
- **Test Everything**: Double-click [`test_all.bat`](file:///d:/Projects/DDoS%20prevention/test_all.bat) to run the full automated test suite across Hardhat Smart Contracts (6 tests), Backend AI/ML/QML (17 tests), and Frontend TypeScript/Vite bundling.
- **Stop Everything**: Double-click [`stop_all.bat`](file:///d:/Projects/DDoS%20prevention/stop_all.bat) to cleanly terminate all running background servers on ports 8000 and 5173.

---

### Manual Setup


```bash
cd backend

# Install dependencies
pip install -r requirements.txt
pip install qiskit

# Train baseline ML models
python -m app.ml.train

# Run automated tests
pytest tests -v

# Start FastAPI server on port 8000
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

Default credentials:
- **Username**: `analyst` | **Password**: `analyst123`
- **Username**: `admin` | **Password**: `admin123`

### 2. Frontend Dashboard Setup

```bash
cd frontend

# Install npm packages
npm install

# Start Vite dev server (proxies to http://127.0.0.1:8000)
npm run dev
```

Open your browser at **http://localhost:5173**.

---

## Docker Compose Deployment

To run the entire production-grade stack (PostgreSQL, EVM Node, Backend, Frontend, and Nginx Gateway):

```bash
docker compose up --build -d
```

Services exposed:
- **Web Dashboard**: `http://localhost:80`
- **API Documentation**: `http://localhost:80/api/docs`
- **Postgres Internal**: Port 5432 (internal network)
- **Local EVM Node**: Port 8545 (loopback only)

---

## Smart Contract Deployment

```bash
cd contracts
npm install
npx hardhat compile
npx hardhat run scripts/deploy.js --network localhost
```

---

## Demonstration Walkthrough

1. **Dashboard Overview**:
   - Inspect total incidents, confirmed attacks, active mitigations, and the real-time velocity chart.
2. **Scenario Injection (Live Monitoring)**:
   - Click **HTTP Flood**: Watch requests spike to 6,000+ rps; XGBoost flags `high_risk` and triggers automated rate-limiting.
   - Click **Uncertain Boundary**: Watch composite uncertainty trigger routing to the **Human Verification Queue**.
   - Click **SYN Flood**: Evaluates simulated half-open burst telemetry.
3. **Analyst Review Queue**:
   - Navigate to **Human Verification**. Inspect pending cases.
   - Enter forensic notes and commit decision (**Confirm Attack** or **Reject**). The decision is appended to the immutable audit log and queued for on-chain anchoring.
4. **Cryptographic Blockchain Verification**:
   - Navigate to **Blockchain Explorer** or **Incident Investigation**.
   - Click **Verify Cryptographic Integrity** to cross-verify the SHA-256 evidence digest against the blockchain registry.
5. **Emergency Killswitch**:
   - Under **Protection Center** or in the Navbar, trigger the **Emergency Killswitch** to demonstrate instant failsafe purging of all active network blocks.

---

## Ethical Testing & Security Notice

- This prototype is designed for authorized testing, educational evaluation, and defensive incident response.
- Do not target unauthorized third-party infrastructure.
- In production deployments, restrict the blockchain RPC endpoint and database to private VPC networks.
