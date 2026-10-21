import React, { useState, useEffect } from 'react';
import { 
  Search, 
  ShieldCheck, 
  Cpu, 
  Atom, 
  Link2, 
  CheckCircle, 
  AlertTriangle, 
  Fingerprint, 
  FileText 
} from 'lucide-react';
import { Incident, VerificationResult, EvidenceManifest } from '../types';
import { StatusBadge } from '../components/StatusBadge';
import { api } from '../services/api';

interface IncidentInvestigationProps {
  selectedIncidentId?: string;
  incidents: Incident[];
  onSelectIncident: (id: string) => void;
  onOpenReview: (incident: Incident) => void;
}

export const IncidentInvestigation: React.FC<IncidentInvestigationProps> = ({
  selectedIncidentId,
  incidents,
  onSelectIncident,
  onOpenReview
}) => {
  const currentIncident = incidents.find(i => i.incident_id === selectedIncidentId) || incidents[0];
  const [evidenceManifest, setEvidenceManifest] = useState<EvidenceManifest | null>(null);
  const [verificationResult, setVerificationResult] = useState<VerificationResult | null>(null);
  const [isVerifying, setIsVerifying] = useState<boolean>(false);
  const [isAnchoring, setIsAnchoring] = useState<boolean>(false);

  useEffect(() => {
    if (currentIncident) {
      loadEvidence(currentIncident.incident_id);
    }
  }, [currentIncident?.incident_id]);

  const loadEvidence = async (id: string) => {
    try {
      const manifest = await api.getIncidentEvidence(id);
      setEvidenceManifest(manifest);
      setVerificationResult(null);
    } catch (err) {
      console.error(err);
    }
  };

  const handleVerifyOnChain = async () => {
    if (!currentIncident) return;
    setIsVerifying(true);
    try {
      const res = await api.verifyIncident(currentIncident.incident_id);
      setVerificationResult(res);
    } catch (err) {
      console.error(err);
    } finally {
      setIsVerifying(false);
    }
  };

  const handleAnchorOnChain = async () => {
    if (!currentIncident) return;
    setIsAnchoring(true);
    try {
      await api.anchorIncident(currentIncident.incident_id);
      await handleVerifyOnChain();
    } catch (err) {
      console.error(err);
    } finally {
      setIsAnchoring(false);
    }
  };

  if (!currentIncident) {
    return (
      <div className="cyber-card p-12 text-center text-gray-500">
        <Search className="w-10 h-10 mx-auto text-gray-600 mb-3" />
        <p>No incidents available for inspection.</p>
      </div>
    );
  }

  const features = currentIncident.features_snapshot || {
    requests_per_second: 0,
    bytes_per_second: 0,
    avg_request_duration_ms: 0,
    error_rate_5xx: 0,
    unique_client_ratio: 0,
    endpoint_concentration: 0,
    connection_failure_rate: 0,
    tcp_syn_rate: 0
  };

  const mlScore = currentIncident.ml_score;
  const qmlScore = currentIncident.qml_score ?? null;
  const hasDisagreement = qmlScore !== null && Math.abs(mlScore - qmlScore) >= 0.30;

  return (
    <div className="space-y-6">
      {/* Top Selector Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 cyber-card">
        <div className="flex items-center space-x-3">
          <label className="text-xs text-gray-400 font-medium">Select Incident:</label>
          <select
            value={currentIncident.incident_id}
            onChange={(e) => onSelectIncident(e.target.value)}
            className="bg-gray-900 border border-gray-800 rounded-lg px-3 py-1.5 text-xs font-mono text-cyan-300 focus:outline-none focus:border-cyan-600"
          >
            {incidents.map((i) => (
              <option key={i.incident_id} value={i.incident_id}>
                {i.incident_id} - {i.attack_type} ({i.risk_level})
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => onOpenReview(currentIncident)}
            className="px-3.5 py-1.5 rounded-lg bg-cyan-950 hover:bg-cyan-900 text-cyan-300 border border-cyan-800/80 text-xs font-semibold transition"
          >
            Submit Analyst Review
          </button>
        </div>
      </div>

      {/* Main Details Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Core Attributes */}
        <div className="space-y-6">
          <div className="cyber-card p-5 space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400">Incident Attributes</h4>
            <div className="space-y-3 text-xs">
              <div>
                <p className="text-gray-500 font-mono">Incident ID</p>
                <p className="text-sm font-bold font-mono text-cyan-300 mt-0.5">{currentIncident.incident_id}</p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <p className="text-gray-500">Risk Assessment</p>
                  <div className="mt-1"><StatusBadge type="risk" value={currentIncident.risk_level} /></div>
                </div>
                <div>
                  <p className="text-gray-500">Verification Status</p>
                  <div className="mt-1"><StatusBadge type="verification" value={currentIncident.verification_status} /></div>
                </div>
              </div>
              <div>
                <p className="text-gray-500">Attack Subtype</p>
                <p className="text-sm font-semibold capitalize text-white mt-0.5">{currentIncident.attack_type.replace(/_/g, ' ')}</p>
              </div>
              <div>
                <p className="text-gray-500">Source Identifier</p>
                <p className="font-mono text-gray-300 mt-0.5">{currentIncident.source_ip || 'N/A'}</p>
              </div>
              <div>
                <p className="text-gray-500">Target Resource</p>
                <p className="font-mono text-gray-300 mt-0.5">{currentIncident.target}</p>
              </div>
              <div>
                <p className="text-gray-500">Detection Timestamp</p>
                <p className="font-mono text-gray-400 mt-0.5">{new Date(currentIncident.detected_at).toLocaleString()}</p>
              </div>
            </div>
          </div>

          {/* Model Comparison Card */}
          <div className="cyber-card p-5 space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400">Model Scores & Disagreement</h4>
            
            <div className="space-y-3">
              <div className="p-3 rounded-lg bg-gray-950 border border-gray-800">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-400 flex items-center space-x-1.5">
                    <Cpu className="w-3.5 h-3.5 text-cyan-400" />
                    <span>ML Baseline (XGBoost)</span>
                  </span>
                  <span className="text-sm font-mono font-bold text-white">{(mlScore * 100).toFixed(1)}%</span>
                </div>
                <div className="w-full bg-gray-800 rounded-full h-1.5 mt-2">
                  <div className="bg-cyan-400 h-1.5 rounded-full" style={{ width: `${mlScore * 100}%` }}></div>
                </div>
              </div>

              <div className="p-3 rounded-lg bg-gray-950 border border-gray-800">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-400 flex items-center space-x-1.5">
                    <Atom className="w-3.5 h-3.5 text-purple-400" />
                    <span>QML Secondary (Qiskit)</span>
                  </span>
                  <span className="text-sm font-mono font-bold text-purple-300">
                    {qmlScore !== null ? `${(qmlScore * 100).toFixed(1)}%` : 'N/A'}
                  </span>
                </div>
                <div className="w-full bg-gray-800 rounded-full h-1.5 mt-2">
                  <div className="bg-purple-500 h-1.5 rounded-full" style={{ width: `${(qmlScore || 0) * 100}%` }}></div>
                </div>
              </div>

              {hasDisagreement && (
                <div className="p-3 rounded-lg bg-amber-950/40 border border-amber-800/60 text-xs text-amber-300 flex items-start space-x-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
                  <div>
                    <span className="font-semibold">Model Disagreement Signal:</span> ML and QML outputs diverge by &gt; 30%, triggering uncertainty flags for human verification.
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Traffic Features & Cryptographic Blockchain Evidence */}
        <div className="lg:col-span-2 space-y-6">
          {/* Traffic Feature Breakdown */}
          <div className="cyber-card p-5 space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400">Extracted Traffic Telemetry</h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="p-3 rounded-lg bg-gray-950 border border-gray-800">
                <p className="text-gray-500">Request Rate</p>
                <p className="text-base font-bold font-mono text-white mt-1">{features.requests_per_second} rps</p>
              </div>
              <div className="p-3 rounded-lg bg-gray-950 border border-gray-800">
                <p className="text-gray-500">Average Duration</p>
                <p className="text-base font-bold font-mono text-white mt-1">{features.avg_request_duration_ms} ms</p>
              </div>
              <div className="p-3 rounded-lg bg-gray-950 border border-gray-800">
                <p className="text-gray-500">5xx Error Ratio</p>
                <p className="text-base font-bold font-mono text-red-400 mt-1">{(features.error_rate_5xx * 100).toFixed(1)}%</p>
              </div>
              <div className="p-3 rounded-lg bg-gray-950 border border-gray-800">
                <p className="text-gray-500">TCP SYN Rate</p>
                <p className="text-base font-bold font-mono text-purple-400 mt-1">{features.tcp_syn_rate} pps</p>
              </div>
              <div className="p-3 rounded-lg bg-gray-950 border border-gray-800">
                <p className="text-gray-500">Bandwidth</p>
                <p className="text-base font-bold font-mono text-white mt-1">{(features.bytes_per_second / 1024).toFixed(1)} KB/s</p>
              </div>
              <div className="p-3 rounded-lg bg-gray-950 border border-gray-800">
                <p className="text-gray-500">Client Diversity</p>
                <p className="text-base font-bold font-mono text-white mt-1">{(features.unique_client_ratio * 100).toFixed(1)}%</p>
              </div>
              <div className="p-3 rounded-lg bg-gray-950 border border-gray-800">
                <p className="text-gray-500">Endpoint Conc.</p>
                <p className="text-base font-bold font-mono text-white mt-1">{(features.endpoint_concentration * 100).toFixed(1)}%</p>
              </div>
              <div className="p-3 rounded-lg bg-gray-950 border border-gray-800">
                <p className="text-gray-500">Conn. Failures</p>
                <p className="text-base font-bold font-mono text-white mt-1">{(features.connection_failure_rate * 100).toFixed(1)}%</p>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-gray-950 border border-gray-800 text-xs">
              <span className="text-gray-400 font-semibold">Engine Rationale: </span>
              <span className="text-gray-300">{currentIncident.decision_rationale}</span>
            </div>
          </div>

          {/* Cryptographic Blockchain Ledger Evidence */}
          <div className="cyber-card p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 flex items-center space-x-2">
                <Fingerprint className="w-4 h-4 text-cyan-400" />
                <span>Tamper-Evident Blockchain Evidence Ledger</span>
              </h4>
              <div className="flex items-center space-x-2">
                <button
                  disabled={isAnchoring}
                  onClick={handleAnchorOnChain}
                  className="px-3 py-1 rounded bg-gray-800 hover:bg-cyan-950 text-cyan-300 border border-gray-700 text-xs font-medium transition disabled:opacity-50"
                >
                  Anchor On-Chain
                </button>
                <button
                  disabled={isVerifying}
                  onClick={handleVerifyOnChain}
                  className="px-3 py-1 rounded bg-cyan-950 hover:bg-cyan-900 text-cyan-300 border border-cyan-800 text-xs font-semibold transition disabled:opacity-50"
                >
                  Verify Hash
                </button>
              </div>
            </div>

            {evidenceManifest && (
              <div className="space-y-3 text-xs">
                <div>
                  <p className="text-gray-500 font-mono">Canonical SHA-256 Digest:</p>
                  <p className="font-mono text-cyan-400 break-all bg-gray-950 p-2.5 rounded-lg border border-gray-800 mt-1 select-all">
                    {evidenceManifest.evidence_hash}
                  </p>
                </div>

                {evidenceManifest.digital_signature && (
                  <div>
                    <p className="text-gray-500 font-mono">Digital Signature (HMAC-SHA256):</p>
                    <p className="font-mono text-purple-300 break-all bg-gray-950 p-2 rounded-lg border border-gray-800 mt-1 select-all">
                      {evidenceManifest.digital_signature}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Verification Result Banner */}
            {verificationResult && (
              <div className={`p-4 rounded-xl border text-xs space-y-2 animate-fade-in ${
                verificationResult.is_hash_valid && verificationResult.is_anchored_on_chain
                  ? 'bg-emerald-950/40 border-emerald-800 text-emerald-300'
                  : 'bg-amber-950/40 border-amber-800 text-amber-300'
              }`}>
                <div className="flex items-center space-x-2 font-semibold">
                  <CheckCircle className="w-4 h-4 text-emerald-400" />
                  <span>On-Chain Cryptographic Integrity Verified</span>
                </div>
                <p className="text-gray-300">{verificationResult.detail}</p>
                {verificationResult.blockchain_tx_hash && (
                  <div className="font-mono text-[11px] pt-1">
                    <span className="text-gray-400">Tx Hash: </span>
                    <span className="text-cyan-300">{verificationResult.blockchain_tx_hash}</span>
                    <span className="text-gray-400 ml-3">Block: </span>
                    <span className="text-cyan-300">{verificationResult.block_number}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
