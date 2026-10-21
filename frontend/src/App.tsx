import React, { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { Navbar } from './components/Navbar';
import { Login } from './pages/Login';
import { Overview } from './pages/Overview';
import { LiveMonitoring } from './pages/LiveMonitoring';
import { IncidentInvestigation } from './pages/IncidentInvestigation';
import { HumanVerification } from './pages/HumanVerification';
import { ProtectionCenter } from './pages/ProtectionCenter';
import { BlockchainExplorer } from './pages/BlockchainExplorer';
import { ModelEvaluation } from './pages/ModelEvaluation';
import { api } from './services/api';
import { DashboardSummary, Incident, PolicyConfig, AuthUser } from './types';
import { Atom } from 'lucide-react';

export const App: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState<boolean>(true);
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);

  const [currentTab, setCurrentTab] = useState<string>('overview');
  const [summary, setSummary] = useState<DashboardSummary | undefined>(undefined);
  const [trafficTimeline, setTrafficTimeline] = useState<any[]>([]);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [reviewQueue, setReviewQueue] = useState<Incident[]>([]);
  const [policyConfig, setPolicyConfig] = useState<PolicyConfig | undefined>(undefined);
  const [selectedIncidentId, setSelectedIncidentId] = useState<string | undefined>(undefined);
  const [isSimulating, setIsSimulating] = useState<boolean>(false);

  // Check stored JWT authentication on mount
  useEffect(() => {
    checkStoredAuth();
  }, []);

  // Setup WebSocket only after authenticated
  useEffect(() => {
    if (!isAuthenticated) return;

    let ws: WebSocket | null = null;
    try {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/api/ws/traffic`;
      ws = new WebSocket(wsUrl);
      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.type === 'TRAFFIC_PULSE') {
            setTrafficTimeline((prev) => {
              const newPoint = {
                timestamp: msg.timestamp.slice(11, 19),
                requests_per_second: msg.rps,
                latency_ms: msg.latency_ms,
                error_rate_5xx: 0.02
              };
              const updated = [...prev.slice(1), newPoint];
              return updated;
            });
          }
        } catch (e) {
          // ignore parsing error
        }
      };
    } catch (e) {
      console.log('WS offline, relying on REST polling');
    }

    return () => {
      if (ws) ws.close();
    };
  }, [isAuthenticated]);

  const checkStoredAuth = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      setIsCheckingAuth(false);
      setIsAuthenticated(false);
      return;
    }

    try {
      const user = await api.getMe();
      setCurrentUser(user);
      setIsAuthenticated(true);
      await loadAllData();
    } catch (err) {
      // Invalid or expired token
      localStorage.removeItem('token');
      setIsAuthenticated(false);
    } finally {
      setIsCheckingAuth(false);
    }
  };

  const handleLoginSuccess = async (user: AuthUser) => {
    setCurrentUser(user);
    setIsAuthenticated(true);
    await loadAllData();
  };

  const handleLogout = async () => {
    await api.logout();
    setCurrentUser(null);
    setIsAuthenticated(false);
    setSummary(undefined);
    setIncidents([]);
    setReviewQueue([]);
  };

  const loadAllData = async () => {
    try {
      const [sum, traf, incs, q, pol] = await Promise.all([
        api.getDashboardSummary(),
        api.getDashboardTraffic(),
        api.getIncidents(),
        api.getReviewQueue(),
        api.getPolicies()
      ]);
      setSummary(sum);
      setTrafficTimeline(traf.timeline || []);
      setIncidents(incs);
      setReviewQueue(q);
      setPolicyConfig(pol);
      if (incs.length > 0 && !selectedIncidentId) {
        setSelectedIncidentId(incs[0].incident_id);
      }
    } catch (err) {
      console.error('Error refreshing dashboard data:', err);
    }
  };

  const handleSimulate = async (scenario: string) => {
    setIsSimulating(true);
    try {
      const res = await api.simulateTraffic(scenario);
      await loadAllData();
      if (res?.incident?.incident_id) {
        setSelectedIncidentId(res.incident.incident_id);
      }
      return res;
    } catch (err) {
      console.error(err);
      throw err;
    } finally {
      setIsSimulating(false);
    }
  };

  const handleEmergencyToggle = async () => {
    const currentState = policyConfig?.emergency_disabled || false;
    const newState = !currentState;
    try {
      await api.toggleEmergencyDisable(newState, 'Analyst manual console override');
      await loadAllData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleSelectIncident = (id: string) => {
    setSelectedIncidentId(id);
    setCurrentTab('investigation');
  };

  const pageTitles: Record<string, string> = {
    overview: 'Security Operations Center · Aegis Overview',
    monitoring: 'Real-Time Ingress Telemetry & Live Probe Injection',
    investigation: 'Forensic Incident Investigation & Cryptographic Verification',
    verification: 'Human-in-the-Loop Analyst Verification Queue',
    protection: 'Automated Protection Center & Mitigation Safeguards',
    blockchain: 'Immutable EVM Blockchain Evidence Ledger',
    models: 'Comparative Benchmark & QML Hybrid Augmentation Evaluation'
  };

  // Loading gate while validating authentication
  if (isCheckingAuth) {
    return (
      <div className="min-h-screen bg-[#070B12] text-white flex flex-col items-center justify-center space-y-4">
        <Atom className="w-12 h-12 text-cyan-400 animate-spin-slow" />
        <p className="text-xs font-mono text-cyan-300 tracking-widest uppercase animate-pulse">
          Verifying SOC Security Authorization...
        </p>
      </div>
    );
  }

  // Authentication Gate: Must log in to access dashboard
  if (!isAuthenticated) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="flex min-h-screen bg-[#0B0F17] text-gray-200">
      {/* Sidebar */}
      <Sidebar
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        pendingReviewsCount={reviewQueue.length}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <Navbar
          pageTitle={pageTitles[currentTab] || 'DDoS Defense Platform'}
          policyConfig={policyConfig}
          onEmergencyToggle={handleEmergencyToggle}
          onRefresh={loadAllData}
          username={currentUser?.username || 'analyst'}
          role={currentUser?.role || 'analyst'}
          onLogout={handleLogout}
        />

        <main className="flex-1 p-6 overflow-y-auto max-w-7xl w-full mx-auto">
          {currentTab === 'overview' && (
            <Overview
              summary={summary}
              trafficTimeline={trafficTimeline}
              recentIncidents={incidents}
              onSelectIncident={handleSelectIncident}
              onSimulate={handleSimulate}
              isSimulating={isSimulating}
            />
          )}

          {currentTab === 'monitoring' && (
            <LiveMonitoring
              trafficTimeline={trafficTimeline}
              policyConfig={policyConfig}
              onSimulate={handleSimulate}
              isSimulating={isSimulating}
            />
          )}

          {currentTab === 'investigation' && (
            <IncidentInvestigation
              selectedIncidentId={selectedIncidentId}
              incidents={incidents}
              onSelectIncident={setSelectedIncidentId}
              onOpenReview={(inc) => {
                setSelectedIncidentId(inc.incident_id);
                setCurrentTab('verification');
              }}
            />
          )}

          {currentTab === 'verification' && (
            <HumanVerification
              queue={reviewQueue}
              onReviewSubmitted={loadAllData}
            />
          )}

          {currentTab === 'protection' && (
            <ProtectionCenter
              policyConfig={policyConfig}
              onPolicyUpdated={loadAllData}
              onEmergencyToggle={handleEmergencyToggle}
            />
          )}

          {currentTab === 'blockchain' && (
            <BlockchainExplorer />
          )}

          {currentTab === 'models' && (
            <ModelEvaluation />
          )}
        </main>
      </div>
    </div>
  );
};

export default App;
