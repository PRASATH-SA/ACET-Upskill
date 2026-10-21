import os
from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Optional

class Settings(BaseSettings):
    PROJECT_NAME: str = "Hybrid ML-QML DDoS Defense System"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api"
    
    # Environment
    ENV: str = os.getenv("ENV", "development")
    
    # Database
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL", 
        "sqlite:///./ddos_defense.db"
    )
    
    # Security / Auth
    SECRET_KEY: str = os.getenv("SECRET_KEY", "super-secret-dev-key-change-in-production-128472918")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24 hours
    
    # Evidence Signing Private Key (hex string for ECDSA/HMAC audit integrity)
    EVIDENCE_SIGNING_KEY: str = os.getenv("EVIDENCE_SIGNING_KEY", "0x4f3edf983ac636a65a842ce7c78d9aa706d3b113bce9c46f30d7d21715b23b1d")
    
    # Blockchain Settings
    BLOCKCHAIN_RPC_URL: str = os.getenv("BLOCKCHAIN_RPC_URL", "http://127.0.0.1:8545")
    CONTRACT_ADDRESS: str = os.getenv("CONTRACT_ADDRESS", "0x5FbDB2315678afecb367f032d93F642f64180aa3")
    BLOCKCHAIN_ENABLED: bool = os.getenv("BLOCKCHAIN_ENABLED", "true").lower() == "true"
    
    # QML Worker Settings
    QML_ENABLED: bool = os.getenv("QML_ENABLED", "true").lower() == "true"
    QML_QUBITS: int = 4
    QML_SHOTS: int = 512
    
    # Risk Engine & Protection Thresholds
    UNCERTAINTY_LOWER: float = 0.35
    UNCERTAINTY_UPPER: float = 0.70
    HIGH_RISK_THRESHOLD: float = 0.70
    EMERGENCY_DISABLE: bool = False
    DEFAULT_MITIGATION_DURATION_SEC: int = 300  # 5 minutes
    
    model_config = SettingsConfigDict(case_sensitive=True)

settings = Settings()

