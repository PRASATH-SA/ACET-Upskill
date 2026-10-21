import React, { useState } from 'react';
import { 
  UserCheck, 
  CheckCircle2, 
  XCircle, 
  HelpCircle, 
  ShieldCheck, 
  AlertCircle, 
  Clock, 
  FileCheck 
} from 'lucide-react';
import { Incident } from '../types';
import { StatusBadge } from '../components/StatusBadge';
import { Modal } from '../components/Modal';
import { api } from '../services/api';

interface HumanVerificationProps {
  queue: Incident[];
  onReviewSubmitted: () => void;
}

export const HumanVerification: React.FC<HumanVerificationProps> = ({
  queue,
  onReviewSubmitted
}) => {
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);
  const [decision, setDecision] = useState<string>('HUMAN_CONFIRMED');
  const [mitigationAction, setMitigationAction] = useState<string>('RATE_LIMIT');
  const [reason, setReason] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [severityFilter, setSeverityFilter] = useState<string>('ALL');

  const filteredQueue = queue.filter(inc => {
    if (severityFilter === 'ALL') return true;
    return inc.risk_level === severityFilter;
  });

  const handleOpenReview = (inc: Incident) => {
    setSelectedIncident(inc);
    setDecision('HUMAN_CONFIRMED');
    setMitigationAction('RATE_LIMIT');
    setReason('');
    setErrorMessage('');
  };

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedIncident) return;
    if (!reason || reason.trim().length < 5) {
      setErrorMessage('A descriptive justification is required for analyst audit logging.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');
    try {
      await api.submitReview(
        selectedIncident.incident_id,
        decision,
        reason,
        mitigationAction
      );
      setSelectedIncident(null);
      onReviewSubmitted();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to submit analyst review');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Queue Header & Filters */}
      <div className="cyber-card p-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-bold text-white flex items-center space-x-2">
            <UserCheck className="w-5 h-5 text-cyan-400" />
            <span>Human-in-the-Loop Analyst Verification Queue</span>
          </h3>
          <p className="text-xs text-gray-400 mt-0.5">
            Decisions recorded with cryptographic timestamps into immutable append-only audit log.
          </p>
        </div>

        <div className="flex items-center space-x-3 text-xs">
          <label className="text-gray-400">Filter by Severity:</label>
          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
            className="bg-gray-900 border border-gray-800 rounded-lg px-3 py-1.5 font-mono text-cyan-300 focus:outline-none"
          >
            <option value="ALL">All Severities</option>
            <option value="CRITICAL">Critical</option>
            <option value="HIGH">High</option>
            <option value="MEDIUM">Medium</option>
            <option value="LOW">Low</option>
          </select>
        </div>
      </div>

      {/* Review Queue Table */}
      <div className="cyber-card p-5 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="text-gray-400 border-b border-gray-800 bg-gray-950/40">
              <tr>
                <th className="py-3 px-3">Incident ID</th>
                <th className="py-3 px-3">Detected At</th>
                <th className="py-3 px-3">Target</th>
                <th className="py-3 px-3">Attack Subtype</th>
                <th className="py-3 px-3">ML / QML Scores</th>
                <th className="py-3 px-3">Risk Assessment</th>
                <th className="py-3 px-3">Decision Status</th>
                <th className="py-3 px-3 text-right">Analyst Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {filteredQueue.map((inc) => (
                <tr key={inc.incident_id} className="hover:bg-gray-800/40 transition">
                  <td className="py-3 px-3 font-mono text-cyan-300 font-semibold">{inc.incident_id}</td>
                  <td className="py-3 px-3 text-gray-400 font-mono">{new Date(inc.detected_at).toLocaleTimeString()}</td>
                  <td className="py-3 px-3 font-mono text-gray-300">{inc.target}</td>
                  <td className="py-3 px-3 capitalize text-white font-medium">{inc.attack_type.replace(/_/g, ' ')}</td>
                  <td className="py-3 px-3 font-mono text-xs">
                    <span className="text-cyan-300">{(inc.ml_score * 100).toFixed(0)}%</span>
                    <span className="text-gray-600 mx-1">/</span>
                    <span className="text-purple-300">{inc.qml_score ? `${(inc.qml_score * 100).toFixed(0)}%` : 'N/A'}</span>
                  </td>
                  <td className="py-3 px-3">
                    <StatusBadge type="risk" value={inc.risk_level} />
                  </td>
                  <td className="py-3 px-3">
                    <StatusBadge type="verification" value={inc.verification_status} />
                  </td>
                  <td className="py-3 px-3 text-right">
                    <button
                      onClick={() => handleOpenReview(inc)}
                      className="px-3 py-1 rounded-lg bg-cyan-950 hover:bg-cyan-900 text-cyan-300 border border-cyan-800/80 font-semibold transition"
                    >
                      Review
                    </button>
                  </td>
                </tr>
              ))}
              {filteredQueue.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-gray-500">
                    <FileCheck className="w-8 h-8 mx-auto text-emerald-500 mb-2 opacity-80" />
                    <span>No uncertain incidents pending analyst review. Queue is clear!</span>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Review Modal Dialog */}
      {selectedIncident && (
        <Modal
          isOpen={true}
          onClose={() => setSelectedIncident(null)}
          title={`Analyst Verification: ${selectedIncident.incident_id}`}
        >
          <form onSubmit={handleSubmitReview} className="space-y-4 text-xs">
            {/* Incident Summary Card */}
            <div className="p-3.5 rounded-lg bg-gray-950 border border-gray-800 space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-400">Target & Source:</span>
                <span className="font-mono text-white">{selectedIncident.target} ({selectedIncident.source_ip || 'N/A'})</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Detection ML Score:</span>
                <span className="font-mono text-cyan-300 font-bold">{(selectedIncident.ml_score * 100).toFixed(1)}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Rationale:</span>
                <span className="text-gray-300 text-[11px] text-right max-w-xs">{selectedIncident.decision_rationale}</span>
              </div>
            </div>

            {/* Decision Selectors */}
            <div>
              <label className="block text-gray-300 font-semibold mb-2">Analyst Verdict</label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setDecision('HUMAN_CONFIRMED')}
                  className={`p-2.5 rounded-lg border text-center transition font-semibold ${
                    decision === 'HUMAN_CONFIRMED'
                      ? 'bg-purple-950/80 border-purple-600 text-purple-200'
                      : 'bg-gray-950 border-gray-800 text-gray-400 hover:bg-gray-800'
                  }`}
                >
                  <CheckCircle2 className="w-4 h-4 mx-auto mb-1 text-purple-400" />
                  <span>Confirm Attack</span>
                </button>

                <button
                  type="button"
                  onClick={() => setDecision('HUMAN_REJECTED')}
                  className={`p-2.5 rounded-lg border text-center transition font-semibold ${
                    decision === 'HUMAN_REJECTED'
                      ? 'bg-slate-800 border-slate-600 text-slate-200'
                      : 'bg-gray-950 border-gray-800 text-gray-400 hover:bg-gray-800'
                  }`}
                >
                  <XCircle className="w-4 h-4 mx-auto mb-1 text-slate-400" />
                  <span>Reject (False Positive)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setDecision('INCONCLUSIVE')}
                  className={`p-2.5 rounded-lg border text-center transition font-semibold ${
                    decision === 'INCONCLUSIVE'
                      ? 'bg-indigo-950/80 border-indigo-600 text-indigo-200'
                      : 'bg-gray-950 border-gray-800 text-gray-400 hover:bg-gray-800'
                  }`}
                >
                  <HelpCircle className="w-4 h-4 mx-auto mb-1 text-indigo-400" />
                  <span>Inconclusive</span>
                </button>
              </div>
            </div>

            {/* Mitigation Action Selector if Confirmed */}
            {decision === 'HUMAN_CONFIRMED' && (
              <div>
                <label className="block text-gray-300 font-semibold mb-1">Enforce Protection Action</label>
                <select
                  value={mitigationAction}
                  onChange={(e) => setMitigationAction(e.target.value)}
                  className="w-full bg-gray-950 border border-gray-800 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-cyan-600"
                >
                  <option value="RATE_LIMIT">Rate Limit (Throttle to 20 req/s)</option>
                  <option value="TEMPORARY_BLOCK">Temporary Block (Deny source IP for 10 min)</option>
                  <option value="LOG_ONLY">Log Only (No automated action)</option>
                </select>
              </div>
            )}

            {/* Reason Textarea */}
            <div>
              <label className="block text-gray-300 font-semibold mb-1">
                Justification & Forensic Notes <span className="text-red-400">*</span>
              </label>
              <textarea
                rows={3}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Detail the technical justification for this decision (logged in append-only audit log)..."
                className="w-full bg-gray-950 border border-gray-800 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-cyan-600"
              />
            </div>

            {errorMessage && (
              <p className="text-xs text-red-400 flex items-center space-x-1">
                <AlertCircle className="w-3.5 h-3.5" />
                <span>{errorMessage}</span>
              </p>
            )}

            {/* Footer Buttons */}
            <div className="flex items-center justify-end space-x-2 pt-3 border-t border-gray-800">
              <button
                type="button"
                onClick={() => setSelectedIncident(null)}
                className="px-4 py-2 rounded-lg bg-gray-800 text-gray-300 hover:bg-gray-700 transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-semibold transition disabled:opacity-50"
              >
                {isSubmitting ? 'Recording Decision...' : 'Commit Analyst Decision'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
