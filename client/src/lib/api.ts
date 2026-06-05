import axios from 'axios';

// Use || not ?? — VITE_API_URL="" (empty string) must fall back to '/api'
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  headers: { 'Content-Type': 'application/json' },
});

// Inject Clerk token + locationId on every request
api.interceptors.request.use(async (config) => {
  // Clerk token
  const token = await window.__clerk?.session?.getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  // locationId — try window first, then fall back to persisted zustand store
  let locationId = window.__locationId;
  if (!locationId) {
    try {
      const stored = localStorage.getItem('blueslate-location');
      if (stored) {
        const parsed = JSON.parse(stored) as { state?: { currentLocation?: { id?: string } } };
        const id = parsed?.state?.currentLocation?.id;
        if (id) {
          locationId = id;
          window.__locationId = id; // warm the cache for next call
        }
      }
    } catch { /* ignore parse errors */ }
  }

  if (locationId && config.params?.locationId === undefined) {
    config.params = { ...config.params, locationId };
  }

  return config;
});

// Global error normalization
api.interceptors.response.use(
  (res) => res,
  (err) => {
    const message = err.response?.data?.error ?? err.message ?? 'Request failed';
    return Promise.reject(new Error(message));
  }
);

export default api;

// Augment window for clerk + locationId
declare global {
  interface Window {
    __clerk?: { session?: { getToken: () => Promise<string | null> } };
    __locationId?: string;
  }
}
