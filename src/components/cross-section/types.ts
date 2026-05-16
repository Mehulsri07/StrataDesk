// ─────────────────────────────────────────────────────────────────────────────
// CrossSection — Shared Types
// ─────────────────────────────────────────────────────────────────────────────

// Re-export the canonical StrataLayer so the rest of this module uses one type.
export type { StrataLayer } from '@/types'

/**
 * Input type for the CrossSectionView component.
 * Matches CrossSectionInput from src/lib/adapters.ts exactly so callers
 * don't need a separate mapping step.
 */
export type CrossSectionBorewell = {
  id: string
  label: string
  lat: number
  lng: number
  groundElevationMSL: number  // metres above MSL
  totalDepthFt: number        // total drilled depth in feet
  waterLevelFt: number        // depth to water table in feet
  layers: import('@/types').StrataLayer[]
}

// ── Internal computed types ────────────────────────────────────────────────

export type NormalisedLayer = {
  soilType: string
  assembly?: string
  topMSL: number
  bottomMSL: number
}

export type NormalisedBorewell = {
  id: string
  label: string
  x: number
  groundMSL: number
  waterMSL: number
  layers: NormalisedLayer[]
}

export type GeologicalPolygon = {
  soilType: string
  points: string
  color: string
}

export type GeologicalPath = {
  soilType: string
  d: string
  color: string
}
