export interface AuthUser {
  id?: number;
  username: string;
  role: string;
  is_active?: boolean;
}

export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type VerificationStatus = 
  | 'DETECTED' 
  | 'UNDER_REVIEW' 
  | 'HUMAN_CONFIRMED' 
  | 'HUMAN_REJECTED' 
  | 'INCONCLUSIVE' 
  | 'MITIGATED' 
  | 'RESOLVED';

export type MitigationStatus = 
  | 'NONE'
  | 'LOG_ONLY'
  | 'ALERT'
  | 'RATE_LIMIT'
  | 'TEMPORARY_BLOCK'
  | 'MANUAL_APPROVAL_REQUIRED'
  | 'MITIGATED';

export interface TrafficFeatures {
  requests_per_second: number;
  bytes_per_second: number;
  avg_request_duration_ms: number;
  error_rate_5xx: number;
  unique_client_ratio: number;
  endpoint_concentration: number;
  connection_failure_rate: number;
  tcp_syn_rate: number;
}

export interface Incident {
  id: number;
  incident_id: string;
  detected_at: string;
  target: string;
  source_ip?: string;
  risk_level: RiskLevel;
  attack_type: string;
  ml_score: number;
  qml_score?: number | null;
  model_version: string;
  decision_status: string;
  verification_status: VerificationStatus;
  mitigation_status: MitigationStatus;
  evidence_hash?: string;
  features_snapshot?: TrafficFeatures;
  decision_rationale?: string;
  created_at: string;
  updated_at: string;
}

export interface DashboardSummary {
  metrics: {
    total_incidents: number;
    confirmed_attacks: number;
    false_positives: number;
    under_review: number;
    active_mitigations: number;
    blockchain_anchored: number;
    pending_anchors: number;
  };
  system_health: {
    ml_engine: string;
    qml_worker: string;
    blockchain_node: string;
    policy_mode: string;
    emergency_disabled: boolean;
  };
}

export interface EvidenceManifest {
  incident_id: string;
  timestamp: string;
  attack_type: string;
  risk_level: string;
  ml_model_version: string;
  qml_model_version: string;
  verification_status: string;
  mitigation_action: string;
  evidence_hash: string;
  schema_version: string;
  digital_signature?: string;
}

export interface BlockchainRecord {
  id: number;
  incident_id: string;
  evidence_hash: string;
  transaction_hash?: string;
  contract_address?: string;
  block_number?: number;
  status: 'PENDING' | 'CONFIRMED' | 'FAILED' | 'VERIFICATION_FAILED';
  retry_count: number;
  last_error?: string;
  created_at: string;
  confirmed_at?: string;
}

export interface VerificationResult {
  incident_id: string;
  is_hash_valid: boolean;
  is_signature_valid: boolean;
  is_anchored_on_chain: boolean;
  blockchain_tx_hash?: string;
  block_number?: number;
  stored_hash: string;
  recomputed_hash: string;
  detail: string;
}

export interface PolicyConfig {
  policy_mode: 'MONITOR_ONLY' | 'AUTOMATED_RATE_LIMIT' | 'STRICT_DEFENSE';
  high_risk_threshold: number;
  uncertainty_lower: number;
  uncertainty_upper: number;
  default_duration_sec: number;
  emergency_disabled: boolean;
  allowlist: string[];
}
