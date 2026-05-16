/**
 * AppContext action and toast type definitions.
 * Kept separate from the provider to allow the reducer and context
 * interface to be imported without pulling in React hooks.
 */

import type { Borewell, StrataLayer, MapMode, ViewMode, CrossSectionMode, CustomMaterial } from '@/types';

// Re-export so existing imports of CustomMaterial from this file keep working
// during the transition period.
export type { CustomMaterial };

// ─── Toast ────────────────────────────────────────────────────────────────────

export interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}

// ─── Reducer Actions ──────────────────────────────────────────────────────────

export type Action =
  | { type: 'SET_BOREWELLS';          payload: Borewell[] }
  | { type: 'ADD_BOREWELL';           payload: Borewell }
  | { type: 'UPDATE_BOREWELL';        payload: Borewell }
  | { type: 'DELETE_BOREWELL';        id: string }
  | { type: 'SET_ACTIVE_BOREWELL';    id: string | null }
  | { type: 'SET_PENDING_LATLNG';     payload: { lat: number; lng: number } | null }
  | { type: 'SET_MAP_MODE';           mode: MapMode }
  | { type: 'SET_VIEW_MODE';          mode: ViewMode }
  | { type: 'SET_CROSS_SECTION_MODE'; mode: CrossSectionMode }
  | { type: 'TOGGLE_SIDEBAR' }
  | { type: 'TOGGLE_RIGHT_PANEL' }
  | { type: 'TOGGLE_BOTTOM_DRAWER' }
  | { type: 'ADD_LAYER';    borewellId: string; layer: StrataLayer }
  | { type: 'UPDATE_LAYER'; borewellId: string; layerId: string; updates: Partial<StrataLayer> }
  | { type: 'DELETE_LAYER'; borewellId: string; layerId: string }
  | { type: 'SET_LAYERS';   borewellId: string; layers: StrataLayer[] }
  | { type: 'TOGGLE_CROSS_SECTION'; id: string }
  | { type: 'SET_LOADING';           payload: boolean }
  | { type: 'ADD_TOAST';             payload: Toast }
  | { type: 'REMOVE_TOAST';          id: string }
  | { type: 'ADD_CUSTOM_MATERIAL';    payload: CustomMaterial }
  | { type: 'DELETE_CUSTOM_MATERIAL'; name: string };
