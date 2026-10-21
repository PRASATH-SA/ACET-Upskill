import React from 'react';
import { 
  ShieldAlert, 
  CheckCircle2, 
  XCircle, 
  Lock, 
  Link2, 
  Activity, 
  Zap, 
  Play 
} from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip } from 'recharts';
import { DashboardSummary, Incident } from '../types';
import { MetricCard } from '../components/MetricCard';
import { StatusBadge } from '../components/StatusBadge';

interface OverviewProps {
  summary?: DashboardSummary;
  trafficTimeline: any[];
  recentIncidents: Incident[];
  onSelectIncident: (id: string) => void;
  onSimulate: (scenario: string) => void;
  isSimulating: boolean;
}

export const Overview: React.FC<OverviewProps> = ({
  summary,
  trafficTimeline,
  recentIncidents,
  onSelectIncident,
  onSimulate,
  isSimulating
}) => {
  const metrics = summary?.metrics ?? {
    total_incidents: 0,
    confirmed_attacks: 0,
    false_positives: 0,
    under_review: 0,
    active_mitigations: 0,
    blockchain_anchored: 0,
    pending_anchors: 0
  };

  const health = summary?.system_health ?? {
    ml_engine: 'HEALTHY',
    qml_worker: 'ACTIVE',
    blockchain_node: 'OPERATIONAL',
    policy_mode: 'MONITOR_ONLY',
    emergency_disabled: false
  };

  return (
    <div className="space-y-6">
      {/* Top Banner Notice */}
      <div className="p-4 rounded-xl bg-cyan-950/30 border border-cyan-800/40 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="p-2 rounded-lg bg-cyan-900/40 text-cyan-400">
            <Zap className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-white">Hybrid ML-QML & EVM Blockchain Active Sentinel</h4>
            <p className="text-xs text-gray-400">
              Multi-tiered DDoS mitigation pipeline with quantum-augmented edge verification and cryptographic on-chain evidence ledger.
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <span className="text-xs text-gray-400 mr-1">Simulate Traffic:</span>
          <button
            disabled={isSimulating}
            onClick={() => onSimulate('http_flood')}
            className="px-3 py-1.5 rounded-lg bg-red-950/60 hover:bg-red-900/80 text-red-300 border border-red-800/60 text-xs font-semibold flex items-center space-x-1.5 transition disabled:opacity-50"
          >
            <Play className="w-3 h-3" />
            <span>HTTP Flood</span>
          </button>
          <button
            disabled={isSimulating}
            onClick={() => onSimulate('uncertain_boundary')}
            className="px-3 py-1.5 rounded-lg bg-amber-950/60 hover:bg-amber-900/80 text-amber-300 border border-amber-800/60 text-xs font-semibold flex items-center space-x-1.5 transition disabled:opacity-50"
          >
            <Play className="w-3 h-3" />
            <span>Uncertain Boundary</span>
          </button>
          <button
            disabled={isSimulating}
            onClick={() => onSimulate('syn_flood')}
            className="px-3 py-1.5 rounded-lg bg-purple-950/60 hover:bg-purple-900/80 text-purple-300 border border-purple-800/60 text-xs font-semibold flex items-center space-x-1.5 transition disabled:opacity-50"
          >
            <Play className="w-3 h-3" />
            <span>SYN Flood</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Total Incidents"
          value={metrics.total_incidents}
          subtitle={`${metrics.under_review} pending review`}
          icon={ShieldAlert}
          variant="cyber"
        />
        <MetricCard
          title="Confirmed Attacks"
          value={metrics.confirmed_attacks}
          subtitle="Human verified or high-risk"
          icon={CheckCircle2}
          variant="danger"
        />
        <MetricCard
          title="Active Mitigations"
          value={metrics.active_mitigations}
          subtitle="Rate limits & temporary blocks"
          icon={Lock}
          variant="warning"
        />
        <MetricCard
          title="On-Chain Anchors"
          value={metrics.blockchain_anchored}
          subtitle="EVM immutable evidence"
          icon={Link2}
          variant="quantum"
        />
      </div>

      {/* Live Traffic Chart */}
      <div className="cyber-card p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-semibold text-white">Live Traffic Velocity & Ingress Rates</h3>
            <p className="text-xs text-gray-400">Requests per second across 5-second sliding analytical telemetry windows</p>
          </div>
          <div className="flex items-center space-x-2 text-xs text-gray-400 font-mono">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse"></span>
            <span>Real-time Telemetry</span>
          </div>
        </div>

        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={trafficTimeline} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="rpsGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#06B6D4" stopOpacity={0.6}/>
                  <stop offset="95%" stopColor="#06B6D4" stopOpacity={0.0}/>
                </linearGradient>
              </defs>
              <XAxis dataKey="timestamp" stroke="#4B5563" fontSize={11} />
              <YAxis stroke="#4B5563" fontSize={11} />
              <Tooltip 
                contentStyle={{ backgroundColor: '#111827', borderColor: '#374151', borderRadius: '0.5rem', color: '#F3F4F6' }}
              />
              <Area type="monotone" dataKey="requests_per_second" stroke="#06B6D4" strokeWidth={2} fillOpacity={1} fill="url(#rpsGradient)" name="Req/sec" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Grid: Health Indicators & Recent Incidents */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Subsystem Health Cards */}
        <div className="cyber-card p-5 space-y-4">
          <h3 className="text-sm font-semibold text-white uppercase tracking-wider">Subsystem Diagnostics</h3>
          <div className="space-y-3 text-xs">
            <div className="flex items-center justify-between p-3 rounded-lg bg-gray-950/60 border border-gray-800">
              <span className="text-gray-400 font-medium">ML Baseline (XGBoost):</span>
              <span className="text-emerald-400 font-mono font-semibold">{health.ml_engine}</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-gray-950/60 border border-gray-800">
              <span className="text-gray-400 font-medium">QML Augmentation (Qiskit):</span>
              <span className="text-purple-400 font-mono font-semibold">{health.qml_worker}</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-gray-950/60 border border-gray-800">
              <span className="text-gray-400 font-medium">EVM Blockchain Node:</span>
              <span className="text-cyan-400 font-mono font-semibold">{health.blockchain_node}</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-gray-950/60 border border-gray-800">
              <span className="text-gray-400 font-medium">Active Policy Mode:</span>
              <span className="text-amber-400 font-mono font-semibold">{health.policy_mode}</span>
            </div>
          </div>
        </div>

        {/* Recent Incidents Table */}
        <div className="lg:col-span-2 cyber-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-white uppercase tracking-wider">Recent Detection Events</h3>
            <span className="text-xs text-gray-500 font-mono">Top 5 Incidents</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="text-gray-400 border-b border-gray-800 bg-gray-950/40">
                <tr>
                  <th className="py-2.5 px-3">Incident ID</th>
                  <th className="py-2.5 px-3">Attack Subtype</th>
                  <th className="py-2.5 px-3">ML Score</th>
                  <th className="py-2.5 px-3">Risk</th>
                  <th className="py-2.5 px-3">Verification</th>
                  <th className="py-2.5 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {recentIncidents.slice(0, 5).map((inc) => (
                  <tr key={inc.incident_id} className="hover:bg-gray-800/40 transition">
                    <td className="py-3 px-3 font-mono text-cyan-300 font-semibold">{inc.incident_id}</td>
                    <td className="py-3 px-3 capitalize text-gray-300">{inc.attack_type.replace(/_/g, ' ')}</td>
                    <td className="py-3 px-3 font-mono text-gray-300">{(inc.ml_score * 100).toFixed(1)}%</td>
                    <td className="py-3 px-3">
                      <StatusBadge type="risk" value={inc.risk_level} />
                    </td>
                    <td className="py-3 px-3">
                      <StatusBadge type="verification" value={inc.verification_status} />
                    </td>
                    <td className="py-3 px-3 text-right">
                      <button
                        onClick={() => onSelectIncident(inc.incident_id)}
                        className="px-2.5 py-1 rounded bg-gray-800 hover:bg-cyan-950 hover:text-cyan-300 text-gray-300 border border-gray-700 font-medium transition"
                      >
                        Inspect
                      </button>
                    </td>
                  </tr>
                ))}
                {recentIncidents.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-6 text-center text-gray-500">No incidents detected yet.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
