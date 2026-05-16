import type { Borewell } from '@/types';

// In development (npm run dev), Vite proxies /api → http://localhost:3001
// In Docker (docker compose up), nginx proxies /api → http://api:3001
// Never hardcode a remote URL here.
const API_BASE = '/api';

async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE}${path}`;

  const res = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    },
    ...options,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || res.statusText);
  }

  if (res.status === 204) {
    return null as T;
  }

  return res.json() as Promise<T>;
}

export const api = {
  /**
   * Fetches all borewells with their layers
   */
  listBorewells: () =>
    apiFetch<Borewell[]>('/borewells'),

  /**
   * Fetches a single borewell by ID
   */
  getBorewell: (id: string) =>
    apiFetch<Borewell>(`/borewells/${id}`),

  /**
   * Creates a new borewell with layers
   */
  createBorewell: (borewell: Borewell) =>
    apiFetch<Borewell>('/borewells', {
      method: 'POST',
      body: JSON.stringify(borewell)
    }),

  /**
   * Fully replaces a borewell and its layers
   */
  updateBorewell: (id: string, borewell: Borewell) =>
    apiFetch<Borewell>(`/borewells/${id}`, {
      method: 'PUT',
      body: JSON.stringify(borewell)
    }),

  /**
   * Partially updates borewell metadata
   */
  patchBorewell: (id: string, updates: Partial<Borewell>) =>
    apiFetch<Borewell>(`/borewells/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(updates)
    }),

  /**
   * Deletes a borewell
   */
  deleteBorewell: (id: string) =>
    apiFetch<{ deleted: string }>(`/borewells/${id}`, {
      method: 'DELETE'
    }),
};
