import React, { useState } from 'react';
import { 
  Activity, 
  Play, 
  Flame, 
  Waves, 
  Clock, 
  CheckCircle, 
  AlertTriangle, 
  Cpu, 
  Atom, 
  ShieldCheck 
} from 'lucide-react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { PolicyConfig } from '../types';

interface LiveMonitoringProps {
  trafficTimeline: any[];
  policyConfig?: PolicyConfig;
  onSimulate: (scenario: string) => Promise<any>;
  isSimulating: boolean;
}

export const LiveMonitoring: React.FC<LiveMonitoringProps> = ({
  trafficTimeline,
  policyConfig,
  onSimulate,
  isSimulating
}) => {
  const [lastSimResult, setLastSimResult] = useState<any>(null);
  const [activeScenario, setActiveScenario] = useState<string>('normal');

  const handleRunSimulation = async (scenario: string) => {
    setActiveScenario(scenario);
    try {
      const res = await onSimulate(scenario);
      setLastSimResult(res);
    } catch (err) {
      console.error(err);
    }
  };

  const scenarios = [
    { id: 'http_flood', label: 'HTTP Flood', icon: Flame, color: 'text-red-400 bg-red-950/40 border-red-800/60', desc: 'Volumetric layer 7 spike (>5k req/s, concentrated endpoints)' },
    { id: 'syn_flood', label: 'TCP SYN Flood', icon: Waves, color: 'text-purple-400 bg-purple-950/40 border-purple-800/60', desc: 'Half-open connection exhaustion with packet telemetry' },
    { id: 'slowloris', label: 'Slowloris', icon: Clock, color: 'text-amber-400 bg-amber-950/40 border-amber-800/60', desc: 'Low-rate lingering connection starvation (>8s latencies)' },
    { id: 'uncertain_boundary', label: 'Uncertain Boundary', icon: AlertTriangle, color: 'text-yellow-400 bg-yellow-950/40 border-yellow-800/60', desc: 'Edge case triggering analyst human-verification queue' },
    { id: 'normal', label: 'Legitimate Baseline', icon: CheckCircle, color: 'text-emerald-400 bg-emerald-950/40 border-emerald-800/60', desc: 'Normal distributed consumer web traffic' },
  ];

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 cyber-card">
        <div>
          <h3 className="text-base font-bold text-white flex items-center space-x-2">
            <Activity className="w-5 h-5 text-cyan-400 animate-pulse" />
            <span>Telemetry Ingestion & Real-Time Pipeline</span>
          </h3>
          <p className="text-xs text-gray-400 mt-0.5">
            Sliding analytical windows continuously monitored by XGBoost ML and Qiskit QML.
          </p>
        </div>
        <div className="flex items-center space-x-3 text-xs">
          <div className="px-3 py-1.5 rounded-lg bg-gray-900 border border-gray-800 flex items-center space-x-2">
            <span className="text-gray-400">Policy Mode:</span>
            <span className="font-mono text-cyan-300 font-semibold">{policyConfig?.policy_mode || 'MONITOR_ONLY'}</span>
          </div>
        </div>
      </div>

      {/* Scenario Trigger Deck */}
      <div className="cyber-card p-5">
        <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3">
          Authorized Test Traffic & Scenario Injector
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-3">
          {scenarios.map((sc) => {
            const Icon = sc.icon;
            const isSelected = activeScenario === sc.id;
            return (
              <button
                key={sc.id}
                disabled={isSimulating}
                onClick={() => handleRunSimulation(sc.id)}
                className={`p-3.5 rounded-xl border text-left transition flex flex-col justify-between ${
                  isSelected ? 'border-cyan-500 bg-cyan-950/40 shadow-md shadow-cyan-950/50' : 'border-gray-800 bg-gray-950/60 hover:bg-gray-900'
                } disabled:opacity-50`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className={`p-2 rounded-lg border ${sc.color}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    {isSelected && <span className="w-2 h-2 rounded-full bg-cyan-400"></span>}
                  </div>
                  <h5 className="text-xs font-semibold text-white">{sc.label}</h5>
                  <p className="text-[11px] text-gray-400 mt-1 line-clamp-2">{sc.desc}</p>
                </div>
                <div className="mt-3 flex items-center space-x-1 text-[11px] text-cyan-400 font-medium">
                  <Play className="w-3 h-3" />
                  <span>Execute Probe</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Last Probe Decision Snapshot */}
      {lastSimResult && (
        <div className="cyber-card p-5 border-cyan-800/80 bg-cyan-950/20 animate-fade-in space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-800 pb-3">
            <div className="flex items-center space-x-2">
              <ShieldCheck className="w-5 h-5 text-cyan-400" />
              <h4 className="text-sm font-bold text-white">
                Probe Ingestion Result: <span className="font-mono text-cyan-300">{lastSimResult.incident.incident_id}</span>
              </h4>
            </div>
            <div className="flex items-center space-x-2 text-xs">
              <span className="text-gray-400">Target:</span>
              <span className="font-mono text-gray-200">{lastSimResult.incident.target}</span>
              <span className="text-gray-400 ml-2">Source IP:</span>
              <span className="font-mono text-cyan-300">{lastSimResult.incident.source_ip}</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
            <div className="p-3 rounded-lg bg-gray-900 border border-gray-800">
              <p className="text-gray-400 font-medium">ML Score (XGBoost):</p>
              <p className="text-lg font-bold font-mono text-white mt-1">
                {(lastSimResult.ml_output.score * 100).toFixed(1)}%
              </p>
              <p className="text-[10px] text-gray-500 capitalize">{lastSimResult.ml_output.attack_type}</p>
            </div>

            <div className="p-3 rounded-lg bg-gray-900 border border-gray-800">
              <p className="text-gray-400 font-medium">QML Score (Qiskit):</p>
              <p className="text-lg font-bold font-mono text-purple-300 mt-1">
                {lastSimResult.qml_output.score !== null ? `${(lastSimResult.qml_output.score * 100).toFixed(1)}%` : 'N/A'}
              </p>
              <p className="text-[10px] text-gray-500 font-mono">{lastSimResult.qml_output.backend}</p>
            </div>

            <div className="p-3 rounded-lg bg-gray-900 border border-gray-800">
              <p className="text-gray-400 font-medium">Hybrid Decision:</p>
              <p className="text-lg font-bold text-cyan-300 mt-1 capitalize">
                {lastSimResult.decision.decision_status.replace(/_/g, ' ')}
              </p>
              <p className="text-[10px] text-amber-400">{lastSimResult.decision.verification_status}</p>
            </div>

            <div className="p-3 rounded-lg bg-gray-900 border border-gray-800">
              <p className="text-gray-400 font-medium">Protection Enforcement:</p>
              <p className="text-lg font-bold text-red-400 mt-1 capitalize">
                {lastSimResult.decision.recommended_action.replace(/_/g, ' ')}
              </p>
              <p className="text-[10px] text-gray-500">{lastSimResult.protection.status}</p>
            </div>
          </div>

          <div className="p-3 rounded-lg bg-gray-950 border border-gray-800 text-xs">
            <span className="text-gray-400 font-semibold">Decision Rationale: </span>
            <span className="text-gray-300">{lastSimResult.decision.rationale}</span>
          </div>
        </div>
      )}

      {/* Latency & Velocity Timeline Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="cyber-card p-5">
          <h4 className="text-sm font-semibold text-white mb-2">Request Velocity (rps)</h4>
          <div className="h-60 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trafficTimeline}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1F2937" />
                <XAxis dataKey="timestamp" stroke="#4B5563" fontSize={10} />
                <YAxis stroke="#4B5563" fontSize={10} />
                <Tooltip contentStyle={{ backgroundColor: '#111827', borderColor: '#374151', color: '#F3F4F6' }} />
                <Line type="monotone" dataKey="requests_per_second" stroke="#06B6D4" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="cyber-card p-5">
          <h4 className="text-sm font-semibold text-white mb-2">Latency Spectrum (ms)</h4>
          <div className="h-60 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trafficTimeline}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1F2937" />
                <XAxis dataKey="timestamp" stroke="#4B5563" fontSize={10} />
                <YAxis stroke="#4B5563" fontSize={10} />
                <Tooltip contentStyle={{ backgroundColor: '#111827', borderColor: '#374151', color: '#F3F4F6' }} />
                <Line type="monotone" dataKey="latency_ms" stroke="#8B5CF6" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};
