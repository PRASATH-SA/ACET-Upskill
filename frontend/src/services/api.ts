import { 
  Incident, 
  DashboardSummary, 
  EvidenceManifest, 
  VerificationResult, 
  PolicyConfig, 
  BlockchainRecord 
} from '../types';

const API_BASE = '/api';

function getAuthHeader(): Record<string, string> {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export const api = {
  // Auth
  async login(username: string, password: string) {
    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      if (!res.ok) {
        let msg = 'Authentication failed';
        try {
          const err = await res.json();
          if (err.detail) msg = err.detail;
        } catch (_) {}
        throw new Error(msg);
      }
      const data = await res.json();
      if (data.access_token) {
        localStorage.setItem('token', data.access_token);
      }
      return data;
    } catch (err: any) {
      if (err.name === 'TypeError' || err.message?.includes('fetch')) {
        throw new Error('Backend server is offline or unreachable on port 8000. Please start it using run_all.bat.');
      }
      throw err;
    }
  },

  async logout() {
    try {
      await fetch(`${API_BASE}/auth/logout`, {
        method: 'POST',
        headers: { ...getAuthHeader() }
      });
    } catch (_) {}
    localStorage.removeItem('token');
  },

  async getMe() {
    const res = await fetch(`${API_BASE}/auth/me`, {
      headers: { ...getAuthHeader() }
    });
    if (!res.ok) {
      localStorage.removeItem('token');
      throw new Error('Unauthorized');
    }
    return res.json();
  },

  // Dashboard
  async getDashboardSummary(): Promise<DashboardSummary> {
    const res = await fetch(`${API_BASE}/dashboard/summary`, {
      headers: { ...getAuthHeader() }
    });
    if (!res.ok) throw new Error('Failed to fetch summary');
    return res.json();
  },

  async getDashboardTraffic() {
    const res = await fetch(`${API_BASE}/dashboard/traffic`, {
      headers: { ...getAuthHeader() }
    });
    if (!res.ok) throw new Error('Failed to fetch traffic timeline');
    return res.json();
  },

  async getModelPerformance() {
    const res = await fetch(`${API_BASE}/dashboard/model-performance`, {
      headers: { ...getAuthHeader() }
    });
    if (!res.ok) throw new Error('Failed to fetch model evaluation metrics');
    return res.json();
  },

  // Incidents
  async getIncidents(status?: string, risk?: string): Promise<Incident[]> {
    let url = `${API_BASE}/incidents?limit=100`;
    if (status) url += `&status=${status}`;
    if (risk) url += `&risk=${risk}`;
    const res = await fetch(url, {
      headers: { ...getAuthHeader() }
    });
    if (!res.ok) throw new Error('Failed to fetch incidents');
    return res.json();
  },

  async getIncident(id: string): Promise<Incident> {
    const res = await fetch(`${API_BASE}/incidents/${id}`, {
      headers: { ...getAuthHeader() }
    });
    if (!res.ok) throw new Error('Failed to fetch incident details');
    return res.json();
  },

  async getIncidentEvidence(id: string): Promise<EvidenceManifest> {
    const res = await fetch(`${API_BASE}/incidents/${id}/evidence`, {
      headers: { ...getAuthHeader() }
    });
    if (!res.ok) throw new Error('Failed to fetch evidence manifest');
    return res.json();
  },

  async simulateTraffic(scenario: string) {
    const res = await fetch(`${API_BASE}/incidents/simulate`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        ...getAuthHeader()
      },
      body: JSON.stringify({ scenario })
    });
    if (!res.ok) throw new Error('Simulation failed');
    return res.json();
  },


  // Human Review
  async getReviewQueue(): Promise<Incident[]> {
    const res = await fetch(`${API_BASE}/reviews/queue`, {
      headers: { ...getAuthHeader() }
    });
    if (!res.ok) throw new Error('Failed to fetch review queue');
    return res.json();
  },

  async submitReview(incidentId: string, decision: string, reason: string, mitigationAction?: string) {
    const res = await fetch(`${API_BASE}/reviews/${incidentId}`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        ...getAuthHeader()
      },
      body: JSON.stringify({
        decision,
        reason,
        mitigation_action: mitigationAction
      })
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || 'Review submission failed');
    }
    return res.json();
  },

  // Protection Policies
  async getPolicies(): Promise<PolicyConfig> {
    const res = await fetch(`${API_BASE}/protection/policies`, {
      headers: { ...getAuthHeader() }
    });
    if (!res.ok) throw new Error('Failed to fetch policies');
    return res.json();
  },

  async updatePolicies(update: Partial<PolicyConfig>) {
    const res = await fetch(`${API_BASE}/protection/policies`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader()
      },
      body: JSON.stringify(update)
    });
    if (!res.ok) throw new Error('Policy update failed');
    return res.json();
  },

  async toggleEmergencyDisable(disable: boolean, reason: string) {
    const res = await fetch(`${API_BASE}/protection/emergency-disable`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader()
      },
      body: JSON.stringify({ disable, reason })
    });
    if (!res.ok) throw new Error('Emergency toggle failed');
    return res.json();
  },

  async getActiveMitigations() {
    const res = await fetch(`${API_BASE}/protection/active`, {
      headers: { ...getAuthHeader() }
    });
    if (!res.ok) throw new Error('Failed to fetch active mitigations');
    return res.json();
  },

  // Blockchain
  async getBlockchainStatus() {
    const res = await fetch(`${API_BASE}/blockchain/status`, {
      headers: { ...getAuthHeader() }
    });
    if (!res.ok) throw new Error('Failed to fetch blockchain status');
    return res.json();
  },

  async getBlockchainRecords(): Promise<BlockchainRecord[]> {
    const res = await fetch(`${API_BASE}/blockchain/records`, {
      headers: { ...getAuthHeader() }
    });
    if (!res.ok) throw new Error('Failed to fetch blockchain records');
    return res.json();
  },

  async verifyIncident(incidentId: string): Promise<VerificationResult> {
    const res = await fetch(`${API_BASE}/blockchain/verify/${incidentId}`, {
      headers: { ...getAuthHeader() }
    });
    if (!res.ok) throw new Error('Verification failed');
    return res.json();
  },


  async anchorIncident(incidentId: string) {
    const res = await fetch(`${API_BASE}/blockchain/anchor/${incidentId}`, {
      method: 'POST',
      headers: { ...getAuthHeader() }
    });
    if (!res.ok) throw new Error('Anchoring trigger failed');
    return res.json();
  }
};
