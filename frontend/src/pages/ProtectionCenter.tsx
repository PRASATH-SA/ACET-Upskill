import React, { useState, useEffect } from 'react';
import { 
  Lock, 
  ShieldAlert, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  ShieldCheck, 
  Sliders, 
  RefreshCw 
} from 'lucide-react';
import { PolicyConfig } from '../types';
import { api } from '../services/api';

interface ProtectionCenterProps {
  policyConfig?: PolicyConfig;
  onPolicyUpdated: () => void;
  onEmergencyToggle: () => void;
}

export const ProtectionCenter: React.FC<ProtectionCenterProps> = ({
  policyConfig,
  onPolicyUpdated,
  onEmergencyToggle
}) => {
  const [activeRestrictions, setActiveRestrictions] = useState<any[]>([]);
  const [isUpdating, setIsUpdating] = useState<boolean>(false);
  const [selectedMode, setSelectedMode] = useState<string>(policyConfig?.policy_mode || 'MONITOR_ONLY');

  useEffect(() => {
    loadActiveRestrictions();
    const interval = setInterval(loadActiveRestrictions, 3000);
    return () => clearInterval(interval);
  }, []);

  const loadActiveRestrictions = async () => {
    try {
      const data = await api.getActiveMitigations();
      setActiveRestrictions(data.active_restrictions || []);
    } catch (err) {
      console.error(err);
    }
  };

  const handleModeChange = async (mode: string) => {
    setSelectedMode(mode);
    setIsUpdating(true);
    try {
      await api.updatePolicies({ policy_mode: mode as any });
      onPolicyUpdated();
    } catch (err) {
      console.error(err);
    } finally {
      setIsUpdating(false);
    }
  };

  const isEmergency = policyConfig?.emergency_disabled || false;

  return (
    <div className="space-y-6">
      {/* Top Banner: Emergency Killswitch */}
      <div className={`p-5 rounded-xl border flex flex-wrap items-center justify-between gap-4 transition ${
        isEmergency
          ? 'bg-red-950/60 border-red-700 shadow-lg shadow-red-950/60'
          : 'bg-gray-950/80 border-gray-800'
      }`}>
        <div className="flex items-center space-x-3">
          <div className={`p-2.5 rounded-lg border ${
            isEmergency ? 'bg-red-900/60 border-red-700 text-red-200' : 'bg-gray-900 border-gray-800 text-gray-400'
          }`}>
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-white">
              {isEmergency ? 'EMERGENCY DEFENSE OVERRIDE ACTIVE' : 'Master Automated Defense System'}
            </h4>
            <p className="text-xs text-gray-400 mt-0.5">
              {isEmergency
                ? 'All traffic restrictions and rate limits have been immediately purged. System in pass-through mode.'
                : 'Automated mitigation rules execute based on verified policy thresholds with auto-expiration.'}
            </p>
          </div>
        </div>

        <button
          onClick={onEmergencyToggle}
          className={`px-4 py-2 rounded-lg text-xs font-bold transition flex items-center space-x-2 ${
            isEmergency
              ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
              : 'bg-red-950 hover:bg-red-900 text-red-300 border border-red-800'
          }`}
        >
          <AlertTriangle className="w-4 h-4" />
          <span>{isEmergency ? 'RESTORE AUTOMATED DEFENSE' : 'TRIGGER EMERGENCY KILLSWITCH'}</span>
        </button>
      </div>

      {/* Policy Mode Selector Cards */}
      <div className="cyber-card p-5 space-y-4">
        <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 flex items-center space-x-2">
          <Sliders className="w-4 h-4 text-cyan-400" />
          <span>Operational Mitigation Mode</span>
        </h4>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div 
            onClick={() => handleModeChange('MONITOR_ONLY')}
            className={`p-4 rounded-xl border cursor-pointer transition ${
              policyConfig?.policy_mode === 'MONITOR_ONLY'
                ? 'bg-cyan-950/40 border-cyan-500 shadow-md shadow-cyan-950/40'
                : 'bg-gray-950 border-gray-800 hover:bg-gray-900'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <h5 className="text-sm font-bold text-white">Monitor Only (Default)</h5>
              {policyConfig?.policy_mode === 'MONITOR_ONLY' && (
                <span className="w-2.5 h-2.5 rounded-full bg-cyan-400"></span>
              )}
            </div>
            <p className="text-xs text-gray-400">
              Passively records detections, computes evidence hashes, and alerts SOC without applying automated blocks.
            </p>
          </div>

          <div 
            onClick={() => handleModeChange('AUTOMATED_RATE_LIMIT')}
            className={`p-4 rounded-xl border cursor-pointer transition ${
              policyConfig?.policy_mode === 'AUTOMATED_RATE_LIMIT'
                ? 'bg-cyan-950/40 border-cyan-500 shadow-md shadow-cyan-950/40'
                : 'bg-gray-950 border-gray-800 hover:bg-gray-900'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <h5 className="text-sm font-bold text-white">Automated Rate Limiting</h5>
              {policyConfig?.policy_mode === 'AUTOMATED_RATE_LIMIT' && (
                <span className="w-2.5 h-2.5 rounded-full bg-cyan-400"></span>
              )}
            </div>
            <p className="text-xs text-gray-400">
              Automatically enforces dynamic 20 req/s throttling on verified attack sources with 5-minute auto-expiration.
            </p>
          </div>

          <div 
            onClick={() => handleModeChange('STRICT_DEFENSE')}
            className={`p-4 rounded-xl border cursor-pointer transition ${
              policyConfig?.policy_mode === 'STRICT_DEFENSE'
                ? 'bg-cyan-950/40 border-cyan-500 shadow-md shadow-cyan-950/40'
                : 'bg-gray-950 border-gray-800 hover:bg-gray-900'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <h5 className="text-sm font-bold text-white">Strict Defense</h5>
              {policyConfig?.policy_mode === 'STRICT_DEFENSE' && (
                <span className="w-2.5 h-2.5 rounded-full bg-cyan-400"></span>
              )}
            </div>
            <p className="text-xs text-gray-400">
              Immediately drops packets from attack origins (Temporary Block) with strict fail-safes for protected allowlists.
            </p>
          </div>
        </div>
      </div>

      {/* Grid: Active Restrictions & Protected Allowlists */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Active Temporary Restrictions */}
        <div className="lg:col-span-2 cyber-card p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 flex items-center space-x-2">
              <Clock className="w-4 h-4 text-cyan-400" />
              <span>Active Restrictions & Expiration Timers</span>
            </h4>
            <span className="text-xs font-mono text-cyan-400">{activeRestrictions.length} active</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="text-gray-400 border-b border-gray-800 bg-gray-950/40">
                <tr>
                  <th className="py-2.5 px-3">Target Scope</th>
                  <th className="py-2.5 px-3">Restriction Type</th>
                  <th className="py-2.5 px-3">Enforcement Detail</th>
                  <th className="py-2.5 px-3">TTL Remaining</th>
                  <th className="py-2.5 px-3 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {activeRestrictions.map((item, idx) => (
                  <tr key={idx} className="hover:bg-gray-800/40 transition">
                    <td className="py-3 px-3 font-mono text-cyan-300 font-semibold">{item.ip}</td>
                    <td className="py-3 px-3">
                      <span className="px-2 py-0.5 rounded-full bg-red-950/60 text-red-300 border border-red-800 font-medium">
                        {item.type}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-gray-300">
                      {item.type === 'RATE_LIMIT' ? `${item.limit_rps} req/sec limit` : 'Connection Drop'}
                    </td>
                    <td className="py-3 px-3 font-mono text-amber-300">{item.remaining_seconds}s</td>
                    <td className="py-3 px-3 text-right">
                      <span className="inline-flex items-center space-x-1 text-emerald-400 font-mono">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                        <span>ENFORCING</span>
                      </span>
                    </td>
                  </tr>
                ))}
                {activeRestrictions.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-gray-500">
                      No active IP blocks or rate limits currently enforced.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Protected Allowlists */}
        <div className="cyber-card p-5 space-y-4">
          <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 flex items-center space-x-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Protected Allowlist</span>
          </h4>
          <p className="text-xs text-gray-400">
            Critical infrastructure addresses that can never be locked out by automated mitigation policies.
          </p>

          <div className="space-y-2 text-xs font-mono">
            {(policyConfig?.allowlist || ['127.0.0.1', '::1', 'localhost', '10.0.0.1']).map((ip, i) => (
              <div key={i} className="p-2.5 rounded-lg bg-gray-950 border border-gray-800 flex items-center justify-between">
                <span className="text-gray-300">{ip}</span>
                <span className="text-[10px] text-emerald-400 font-semibold uppercase">Protected</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
