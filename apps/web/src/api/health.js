import { API_BASE_PATH } from '@acet/shared';

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? API_BASE_PATH;

/** Calls GET /api/v1/health. Throws when the API is unreachable or returns an error. */
export async function fetchHealth(signal) {
  const res = await fetch(`${API_BASE}/health`, { signal });
  if (!res.ok) throw new Error(`API responded ${res.status}`);
  const body = await res.json();
  // Accept both the A.6 envelope ({ data }) and a bare object.
  return body.data ?? body;
}
