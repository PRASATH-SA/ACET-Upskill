import React, { useState, useEffect } from 'react';
import { 
  Link2, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Search, 
  ShieldCheck, 
  ExternalLink, 
  FileCode 
} from 'lucide-react';
import { BlockchainRecord, VerificationResult } from '../types';
import { api } from '../services/api';

export const BlockchainExplorer: React.FC = () => {
  const [records, setRecords] = useState<BlockchainRecord[]>([]);
  const [status, setStatus] = useState<any>(null);
  const [verifyIncidentId, setVerifyIncidentId] = useState<string>('');
  const [verificationResult, setVerificationResult] = useState<VerificationResult | null>(null);
  const [isVerifying, setIsVerifying] = useState<boolean>(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [recs, st] = await Promise.all([
        api.getBlockchainRecords(),
        api.getBlockchainStatus()
      ]);
      setRecords(recs);
      setStatus(st);
    } catch (err) {
      console.error(err);
    }
  };

  const handleVerify = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!verifyIncidentId) return;
    setIsVerifying(true);
    try {
      const res = await api.verifyIncident(verifyIncidentId);
      setVerificationResult(res);
    } catch (err: any) {
      console.error(err);
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Network Header Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="cyber-card p-4">
          <p className="text-xs text-gray-400 font-mono">EVM Node Status</p>
          <div className="flex items-center space-x-2 mt-1">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse"></span>
            <span className="text-sm font-bold text-white">{status?.mode || 'LOCAL_CRYPTOGRAPHIC_LEDGER'}</span>
          </div>
        </div>

        <div className="cyber-card p-4">
          <p className="text-xs text-gray-400 font-mono">Registry Contract</p>
          <p className="text-xs font-bold font-mono text-cyan-300 truncate mt-1">
            {status?.contract_address || '0x5FbDB2315678afecb367f032d93F642f64180aa3'}
          </p>
        </div>

        <div className="cyber-card p-4">
          <p className="text-xs text-gray-400 font-mono">Simulated Block Height</p>
          <p className="text-lg font-bold font-mono text-white mt-1">
            #{status?.latest_block || 1042}
          </p>
        </div>

        <div className="cyber-card p-4">
          <p className="text-xs text-gray-400 font-mono">Total Evidence Anchors</p>
          <p className="text-lg font-bold font-mono text-purple-300 mt-1">
            {status?.total_records || records.length} Records
          </p>
        </div>
      </div>

      {/* Verification Tool Box */}
      <div className="cyber-card p-5 space-y-4">
        <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 flex items-center space-x-2">
          <Search className="w-4 h-4 text-cyan-400" />
          <span>On-Chain Cryptographic Integrity Verification Tool</span>
        </h4>

        <form onSubmit={handleVerify} className="flex flex-wrap items-center gap-3">
          <input
            type="text"
            value={verifyIncidentId}
            onChange={(e) => setVerifyIncidentId(e.target.value)}
            placeholder="Enter Incident ID (e.g. INC-8A9F1B01)..."
            className="flex-1 min-w-[280px] bg-gray-950 border border-gray-800 rounded-lg px-4 py-2 text-xs font-mono text-cyan-300 focus:outline-none focus:border-cyan-600"
          />
          <button
            type="submit"
            disabled={isVerifying || !verifyIncidentId}
            className="px-4 py-2 rounded-lg bg-cyan-950 hover:bg-cyan-900 text-cyan-300 border border-cyan-800 text-xs font-semibold transition disabled:opacity-50"
          >
            {isVerifying ? 'Querying Blockchain...' : 'Verify Cryptographic Integrity'}
          </button>
        </form>

        {verificationResult && (
          <div className={`p-4 rounded-xl border text-xs space-y-2 animate-fade-in ${
            verificationResult.is_hash_valid && verificationResult.is_anchored_on_chain
              ? 'bg-emerald-950/40 border-emerald-800 text-emerald-300'
              : 'bg-amber-950/40 border-amber-800 text-amber-300'
          }`}>
            <div className="flex items-center space-x-2 font-bold">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Cryptographic Proof Confirmed for {verificationResult.incident_id}</span>
            </div>
            <p className="text-gray-300">{verificationResult.detail}</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pt-1 font-mono text-[11px]">
              <div>
                <span className="text-gray-400">Canonical SHA-256 Digest:</span>
                <p className="text-cyan-300 break-all">{verificationResult.stored_hash}</p>
              </div>
              <div>
                <span className="text-gray-400">Blockchain Transaction:</span>
                <p className="text-purple-300 break-all">{verificationResult.blockchain_tx_hash || 'Pending block inclusion'}</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* On-Chain Records Table */}
      <div className="cyber-card p-5 space-y-4">
        <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 flex items-center space-x-2">
          <Link2 className="w-4 h-4 text-cyan-400" />
          <span>Immutable Attack Evidence Records</span>
        </h4>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="text-gray-400 border-b border-gray-800 bg-gray-950/40">
              <tr>
                <th className="py-2.5 px-3">Incident ID</th>
                <th className="py-2.5 px-3">Evidence Hash (SHA-256)</th>
                <th className="py-2.5 px-3">Transaction Hash</th>
                <th className="py-2.5 px-3">Block #</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3 text-right">Inspect</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {records.map((rec) => (
                <tr key={rec.id} className="hover:bg-gray-800/40 transition">
                  <td className="py-3 px-3 font-mono text-cyan-300 font-semibold">{rec.incident_id}</td>
                  <td className="py-3 px-3 font-mono text-gray-400 max-w-[200px] truncate" title={rec.evidence_hash}>
                    {rec.evidence_hash}
                  </td>
                  <td className="py-3 px-3 font-mono text-purple-300 max-w-[200px] truncate" title={rec.transaction_hash}>
                    {rec.transaction_hash || 'Awaiting block worker'}
                  </td>
                  <td className="py-3 px-3 font-mono text-gray-300">
                    {rec.block_number ? `#${rec.block_number}` : '-'}
                  </td>
                  <td className="py-3 px-3">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      rec.status === 'CONFIRMED'
                        ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-800'
                        : 'bg-amber-950/80 text-amber-300 border border-amber-800'
                    }`}>
                      {rec.status}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-right">
                    <button
                      onClick={() => {
                        setVerifyIncidentId(rec.incident_id);
                        api.verifyIncident(rec.incident_id).then(setVerificationResult);
                      }}
                      className="px-2.5 py-1 rounded bg-gray-800 hover:bg-cyan-950 text-gray-300 hover:text-cyan-300 border border-gray-700 font-medium transition"
                    >
                      Audit
                    </button>
                  </td>
                </tr>
              ))}
              {records.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-gray-500">
                    No evidence records anchored to blockchain yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
