/**
 * Boundary adapters — convert between external/legacy shapes and the
 * canonical domain models used throughout the app.
 *
 * Rule: adapters live here, not inside components or pages.
 * Components always speak the canonical types.
 */

import type { Borewell, StrataLayer } from '@/types';
import { getSoilColor } from '@/lib/soilColors';
import { generateId } from '@/types';

// ─── Dashboard layer shape (legacy, from Excel import) ────────────────────────

/**
 * The shape produced by the Excel parser in BorewellImportPage and
 * previously used as DashboardBorewell.layers.
 * Kept here only as an input type for the adapter — nothing else should
 * reference this shape directly.
 */
export interface ImportedLayer {
  fromDepth: number;
  toDepth: number;
  soilType: string;
  assembly?: string;
}

/**
 * Converts imported/legacy layer objects into canonical StrataLayer records.
 */
export function toStrataLayers(imported: ImportedLayer[]): StrataLayer[] {
  return imported.map(l => ({
    id:         generateId(),
    startDepth: l.fromDepth,
    endDepth:   l.toDepth,
    material:   l.soilType,
    color:      getSoilColor(l.soilType),
  }));
}

// ─── CrossSectionInput — unified input for the cross-section engine ───────────

/**
 * The single type the cross-section engine accepts.
 * Both the main app (Borewell) and the dashboard page map into this.
 */
export interface CrossSectionInput {
  id: string;
  label: string;
  lat: number;
  lng: number;
  /** Ground elevation in metres above MSL. Required for scientifically correct sections. */
  groundElevationMSL: number;
  totalDepthFt: number;
  waterLevelFt: number;
  layers: StrataLayer[];
}

/**
 * Maps a canonical Borewell into CrossSectionInput.
 * Falls back to 0 m MSL when elevation hasn't been fetched yet
 * (produces a flat section — acceptable until elevation is available).
 */
export function borewellToCSInput(bw: Borewell): CrossSectionInput {
  return {
    id:                 bw.id,
    label:              bw.name,
    lat:                bw.latitude,
    lng:                bw.longitude,
    groundElevationMSL: bw.groundElevationMSL ?? 0,
    totalDepthFt:       bw.totalDepth,
    waterLevelFt:       bw.waterLevel ?? 0,
    layers:             bw.layers,
  };
}
