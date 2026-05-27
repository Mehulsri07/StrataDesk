import type { Borewell } from '@/types';

// In development (npm run dev), Vite proxies /api → http://localhost:3001
// In Docker (docker compose up), nginx proxies /api → http://api:3001
// Never hardcode a remote URL here.
const API_BASE = '/api';

const API_TOKEN =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_TOKEN) ?? '';

if (!API_TOKEN) {
  console.warn(
    '[API] No VITE_API_TOKEN configured'
  );
}

async function apiFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const start = performance.now();
  try {
    const response = await fetch(
      `${API_BASE}${path}`,
      {
        ...options,
        headers: {
          'Content-Type':
            'application/json',

          ...(API_TOKEN
            ? {
                Authorization:
                  `Bearer ${API_TOKEN}`
              }
            : {}),

          ...(options.headers ?? {})
        }
      }
    );

    const end = performance.now();
    const duration = end - start;
    if (typeof window !== 'undefined') {
      const win = window as any;
      win._strataPerfMetrics = win._strataPerfMetrics || {};
      win._strataPerfMetrics.apiLatencies = win._strataPerfMetrics.apiLatencies || [];
      win._strataPerfMetrics.apiLatencies.unshift({ path, duration });
      if (win._strataPerfMetrics.apiLatencies.length > 5) {
        win._strataPerfMetrics.apiLatencies.pop();
      }
    }

    if (!response.ok) {
      const error =
        await response
          .json()
          .catch(() => ({
            error: response.statusText
          }));

      throw new Error(
        error.error ??
        response.statusText
      );
    }

    if (response.status === 204) {
      return null as T;
    }

    return response.json() as Promise<T>;
  } catch (err) {
    const end = performance.now();
    const duration = end - start;
    if (typeof window !== 'undefined') {
      const win = window as any;
      win._strataPerfMetrics = win._strataPerfMetrics || {};
      win._strataPerfMetrics.apiLatencies = win._strataPerfMetrics.apiLatencies || [];
      win._strataPerfMetrics.apiLatencies.unshift({ path, duration });
      if (win._strataPerfMetrics.apiLatencies.length > 5) {
        win._strataPerfMetrics.apiLatencies.pop();
      }
    }
    throw err;
  }
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
