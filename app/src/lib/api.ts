import type { Borewell } from '@/types';

const API_BASE = '/api';

async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
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
  listBorewells: () => apiFetch<Borewell[]>('/borewells'),
  createBorewell: (borewell: Borewell) =>
    apiFetch<Borewell>('/borewells', { method: 'POST', body: JSON.stringify(borewell) }),
  updateBorewell: (id: string, borewell: Borewell) =>
    apiFetch<Borewell>(`/borewells/${id}`, { method: 'PUT', body: JSON.stringify(borewell) }),
  patchBorewell: (id: string, updates: Partial<Borewell>) =>
    apiFetch<Borewell>(`/borewells/${id}`, { method: 'PATCH', body: JSON.stringify(updates) }),
  deleteBorewell: (id: string) =>
    apiFetch<{ deleted: string }>(`/borewells/${id}`, { method: 'DELETE' }),
};
