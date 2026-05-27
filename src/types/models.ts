/**
 * Core domain models for StrataDesk.
 * All types relating to boreholes, strata layers, and application state.
 */

// ─── Geological Data Models ───────────────────────────────────────────────────

export interface StrataLayer {
  id: string;
  startDepth: number;
  endDepth: number;
  material: string;
  color: string;
  confidence?: number;
}

export interface Borewell {
  id: string;
  name: string;
  location: string;
  latitude: number;
  longitude: number;
  diameter: number;
  totalDepth: number;
  waterLevel: number | null;
  groundElevationMSL?: number | null;
  notes: string;
  layers: StrataLayer[];
  selectedForCrossSection: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SearchResult {
  display_name: string;
  lat: string;
  lon: string;
}

// ─── Custom Material ──────────────────────────────────────────────────────────

export interface CustomMaterial {
  name: string;
  color: string;
}

// ─── UI / Application State Models ───────────────────────────────────────────

export type MapMode = 'browse' | 'pinpoint';
export type ViewMode = 'map' | 'cross-section';
export type CrossSectionMode = 'smooth' | 'strict';

export interface AppState {
  borewells: Borewell[];
  activeBorewellId: string | null;
  pendingLatLng: { lat: number; lng: number } | null;
  mapMode: MapMode;
  viewMode: ViewMode;
  crossSectionMode: CrossSectionMode;
  sidebarOpen: boolean;
  rightPanelOpen: boolean;
  bottomDrawerOpen: boolean;
  isLoading: boolean;
  // Part 3 New Centralized States
  elevationFetched: string[];
  selectedBorewells: string[];
  waterTableVisible: boolean;
  terrainVisible: boolean;
  savingIds: string[];
}

