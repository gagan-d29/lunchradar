// Tiny API client. In dev, Vite proxies /api → backend :4000.
// In production you can set VITE_API_URL, or build the frontend and let the
// Express server serve it (then relative /api just works).

const BASE = import.meta.env.VITE_API_URL || '/api';
const TOKEN_KEY = 'lunchradar_token';

export const getToken = () => localStorage.getItem(TOKEN_KEY);
export const setToken = (t) => (t ? localStorage.setItem(TOKEN_KEY, t) : localStorage.removeItem(TOKEN_KEY));

export async function api(path, { method = 'GET', body, auth = false } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  const token = getToken();
  if (auth && token) headers.Authorization = `Bearer ${token}`;

  let res;
  try {
    res = await fetch(`${BASE}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new Error('Cannot reach the server. Is the backend running?');
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}

export const fmtTime = (iso) => {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
};

export const fmtAgo = (iso) => {
  if (!iso) return '—';
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} h ago`;
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
};

export const CROWD = {
  low: { label: 'Not busy', color: '#2ecc71' },
  medium: { label: 'Moderate', color: '#f1c40f' },
  high: { label: 'Packed', color: '#e74c3c' },
};

export const PRICE_LABEL = { 1: '₹', 2: '₹₹', 3: '₹₹₹' };
export const VEG_LABEL = { veg: 'Pure Veg', nonveg: 'Non-Veg', both: 'Veg + Non-Veg' };
