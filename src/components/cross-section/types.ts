// ─────────────────────────────────────────────────────────────────────────────
// CrossSection — Shared Types
// ─────────────────────────────────────────────────────────────────────────────

/**
 * A single strata layer as stored in the database / returned by the API.
 * `fromDepth` and `toDepth` are feet below ground surface (positive = deeper).
 */
export type StrataLayer = {
  fromDepth: number   // ft below ground surface
  toDepth: number     // ft below ground surface
  soilType: string    // e.g. "Clay", "Sand", "Kanker Clay"
  assembly?: string   // e.g. "Plain pipe" | "Ribbed Screen"
}

/**
 * A single borewell with enough data to appear in a cross-section.
 * `groundElevationMSL` is metres above sea level (from elevation API or survey).
 * `waterLevelFt` is depth-to-water in feet below ground surface.
 */
export type CrossSectionBorewell = {
  id: string
  label: string                    // displayed above the borehole column
  lat: number
  lng: number
  groundElevationMSL: number       // metres above MSL  (required for normalisation)
  totalDepthFt: number             // total drilled depth in feet
  waterLevelFt: number             // depth to water table in feet
  layers: StrataLayer[]
}

// ── Internal computed types ────────────────────────────────────────────────

/**
 * After elevation normalisation, every depth interval is expressed as
 * absolute metres above MSL (negative = below MSL).
 */
export type NormalisedLayer = {
  soilType: string
  assembly?: string
  /** Absolute MSL elevation of the TOP of this layer (metres). Higher = shallower. */
  topMSL: number
  /** Absolute MSL elevation of the BOTTOM of this layer (metres). */
  bottomMSL: number
}

export type NormalisedBorewell = {
  id: string
  label: string
  /** Horizontal position on the cross-section canvas (SVG px). */
  x: number
  /** MSL elevation of the ground surface (metres). */
  groundMSL: number
  /** MSL elevation of the water table (metres). */
  waterMSL: number
  layers: NormalisedLayer[]
}

/**
 * A filled geological polygon spanning two adjacent borewells.
 * `points` is an SVG polygon points string.
 */
export type GeologicalPolygon = {
  soilType: string
  points: string
  color: string
}

/**
 * A filled geological path (Bezier) spanning two adjacent borewells.
 * 'd' is an SVG path data string.
 */
export type GeologicalPath = {
  soilType: string
  d: string
  color: string
}
