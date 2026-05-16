// ─────────────────────────────────────────────────────────────────────────────
// CrossSection — GIS & Geological Utilities
// ─────────────────────────────────────────────────────────────────────────────

import type {
  CrossSectionBorewell,
  NormalisedBorewell,
  NormalisedLayer,
} from './types'

// ─── Unit helpers ────────────────────────────────────────────────────────────

/** Convert feet to metres (1 ft = 0.3048 m) */
export const ftToM = (ft: number): number => ft * 0.3048

/** Convert metres to feet */
export const mToFt = (m: number): number => m / 0.3048

// ─── Haversine distance ───────────────────────────────────────────────────────

const R_EARTH = 6_371_000 // metres

/**
 * Returns the great-circle distance in **metres** between two lat/lng points.
 * Accurate to ~0.5% for distances < 100 km (sufficient for borewell cross-sections).
 */
export function haversineDistance(
  lat1: number, lng1: number,
  lat2: number, lng2: number,
): number {
  const φ1 = (lat1 * Math.PI) / 180
  const φ2 = (lat2 * Math.PI) / 180
  const Δφ = ((lat2 - lat1) * Math.PI) / 180
  const Δλ = ((lng2 - lng1) * Math.PI) / 180

  const a =
    Math.sin(Δφ / 2) ** 2 +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2

  return 2 * R_EARTH * Math.asin(Math.sqrt(a))
}

// ─── Elevation normalisation ─────────────────────────────────────────────────

/**
 * Normalises a borewell's strata layers from "depth below ground surface (ft)"
 * into "absolute MSL elevation (metres)".
 *
 * Formula (per spec §9):
 *   layer_top_MSL    = groundElevationMSL − ftToM(layer.fromDepth)
 *   layer_bottom_MSL = groundElevationMSL − ftToM(layer.toDepth)
 *
 * This is the fundamental geological requirement — without this, cross-sections
 * between borewells at different elevations are scientifically incorrect.
 */
export function normaliseBorewell(
  borewell: CrossSectionBorewell,
  xPosition: number,
): NormalisedBorewell {
  const { groundElevationMSL, waterLevelFt } = borewell

  const layers: NormalisedLayer[] = borewell.layers.map(layer => ({
    soilType: layer.material,
    topMSL:    groundElevationMSL - ftToM(layer.startDepth),
    bottomMSL: groundElevationMSL - ftToM(layer.endDepth),
  }))

  return {
    id:         borewell.id,
    label:      borewell.label,
    x:          xPosition,
    groundMSL:  groundElevationMSL,
    waterMSL:   groundElevationMSL - ftToM(waterLevelFt),
    layers,
  }
}

// ─── Layout calculation ───────────────────────────────────────────────────────

/**
 * Given an ordered array of borewells, compute:
 *  - SVG x-positions for each borewell (scaled to fit `canvasWidth`)
 *  - Normalised borewell objects with MSL-corrected layers
 *
 * Borewells are kept in the order provided (caller decides left-to-right order).
 * Horizontal spacing is proportional to real ground distance.
 */
export function layoutBorewells(
  borewells: CrossSectionBorewell[],
  canvasWidth: number,
  horizontalPadding: number = 80,
): NormalisedBorewell[] {
  if (borewells.length === 0) return []
  if (borewells.length === 1) {
    return [normaliseBorewell(borewells[0], canvasWidth / 2)]
  }

  // Compute cumulative distances from first borewell
  const cumulativeDistances: number[] = [0]
  for (let i = 1; i < borewells.length; i++) {
    const prev = borewells[i - 1]
    const curr = borewells[i]
    const d = haversineDistance(prev.lat, prev.lng, curr.lat, curr.lng)
    cumulativeDistances.push(cumulativeDistances[i - 1] + d)
  }

  const totalDistance = cumulativeDistances[cumulativeDistances.length - 1]
  const usableWidth = canvasWidth - horizontalPadding * 2

  return borewells.map((bw, i) => {
    const ratio = totalDistance > 0 ? cumulativeDistances[i] / totalDistance : i / (borewells.length - 1)
    const xPosition = horizontalPadding + ratio * usableWidth
    return normaliseBorewell(bw, xPosition)
  })
}

// ─── Y-scale helpers ──────────────────────────────────────────────────────────

export type ElevationBounds = {
  maxMSL: number   // top of canvas (highest ground point + margin)
  minMSL: number   // bottom of canvas (deepest drilled point − margin)
}

/**
 * Compute the global MSL elevation range across all borewells.
 * Adds vertical margin so labels and terrain aren't clipped.
 */
export function getElevationBounds(
  normalised: NormalisedBorewell[],
  marginMetres: number = 5,
): ElevationBounds {
  let maxMSL = -Infinity
  let minMSL = +Infinity

  for (const bw of normalised) {
    maxMSL = Math.max(maxMSL, bw.groundMSL)
    for (const layer of bw.layers) {
      minMSL = Math.min(minMSL, layer.bottomMSL)
    }
  }

  return {
    maxMSL: maxMSL + marginMetres,
    minMSL: minMSL - marginMetres,
  }
}

/**
 * Returns a function that maps an MSL elevation value → SVG y-coordinate.
 * Higher elevation = lower y value (= higher on screen).
 */
export function makeYScale(
  bounds: ElevationBounds,
  canvasHeight: number,
  verticalPadding: number = 40,
): (msl: number) => number {
  const usableH = canvasHeight - verticalPadding * 2
  const range = bounds.maxMSL - bounds.minMSL

  return (msl: number) =>
    verticalPadding + ((bounds.maxMSL - msl) / range) * usableH
}

/**
 * Formatted distance label between two borewells, e.g. "142 m" or "1.4 km".
 */
export function formatDistance(metres: number): string {
  if (metres < 1000) return `${Math.round(metres)} m`
  return `${(metres / 1000).toFixed(1)} km`
}

/**
 * Compute display string for inter-borewell distances (for ruler annotations).
 * Returns an array of { label, midX } objects — one per adjacent pair.
 */
export function getDistanceLabels(
  borewells: CrossSectionBorewell[],
  normalised: NormalisedBorewell[],
): { label: string; midX: number }[] {
  const result: { label: string; midX: number }[] = []

  for (let i = 1; i < borewells.length; i++) {
    const dist = haversineDistance(
      borewells[i - 1].lat, borewells[i - 1].lng,
      borewells[i].lat,     borewells[i].lng,
    )
    const midX = (normalised[i - 1].x + normalised[i].x) / 2
    result.push({ label: formatDistance(dist), midX })
  }

  return result
}
