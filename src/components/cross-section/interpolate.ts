// ─────────────────────────────────────────────────────────────────────────────
// CrossSection — Geological Interpolation
//
// Core job: given two adjacent normalised borewells, produce filled SVG
// polygons for each geological layer so the cross-section looks continuous.
//
// Algorithm:
//   For each "soil type band" that appears in BOTH adjacent borewells,
//   build a 4-corner polygon: left-top → right-top → right-bottom → left-bottom.
//   Where a layer is absent on one side, taper to a point (triangle).
//   The union of all polygons fills the entire subsurface with no gaps/overlaps.
// ─────────────────────────────────────────────────────────────────────────────

import type { NormalisedBorewell, GeologicalPath } from './types'
import { getSoilColor } from '@/lib/soilColors'

export { getSoilColor }

/**
 * Collect all unique soil types across all borewells, preserving appearance order.
 */
export function collectSoilTypes(borewells: NormalisedBorewell[]): string[] {
  const seen = new Set<string>()
  const order: string[] = []
  for (const bw of borewells) {
    for (const layer of bw.layers) {
      const key = normKey(layer.soilType)
      if (!seen.has(key)) { seen.add(key); order.push(layer.soilType) }
    }
  }
  return order
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

const normKey = (s: string) => s.toLowerCase().replace(/\s*\(.*?\)/g, '').trim()

/**
 * Find the MSL elevation range of a named soil type within a single borewell.
 * Returns null if that soil type doesn't appear.
 *
 * When a soil type appears in multiple non-contiguous intervals (rare),
 * we use the union (outermost top + outermost bottom).
 */
function findBand(
  borewell: NormalisedBorewell,
  soilKey: string,
): { topMSL: number; bottomMSL: number } | null {
  let topMSL    = -Infinity
  let bottomMSL = +Infinity
  let found = false

  for (const layer of borewell.layers) {
    if (normKey(layer.soilType) === soilKey) {
      topMSL    = Math.max(topMSL,    layer.topMSL)
      bottomMSL = Math.min(bottomMSL, layer.bottomMSL)
      found = true
    }
  }
  return found ? { topMSL, bottomMSL } : null
}

// ─── Main export: build all polygons for a single inter-borewell span ─────────

/**
 * Builds filled geological paths for the span between two adjacent borewells.
 * Supports smooth Bezier curves or strict straight lines.
 */
export function buildSpanPaths(
  left: NormalisedBorewell,
  right: NormalisedBorewell,
  yScale: (msl: number) => number,
  mode: 'smooth' | 'strict' = 'smooth'
): GeologicalPath[] {
  const paths: GeologicalPath[] = []
  const allSoilKeys = Array.from(new Set([
    ...left.layers.map(l => normKey(l.soilType)),
    ...right.layers.map(l => normKey(l.soilType))
  ]))

  const sm = mode === 'smooth'
  const bez = (x1: number, y1: number, x2: number, y2: number) => 
    sm ? ` C${(x1 + (x2 - x1) * 0.45).toFixed(1)},${y1.toFixed(1)} ${(x1 + (x2 - x1) * 0.55).toFixed(1)},${y2.toFixed(1)} ${x2.toFixed(1)},${y2.toFixed(1)}`
       : ` L${x2.toFixed(1)},${y2.toFixed(1)}`

  const lx = left.x
  const rx = right.x

  for (const key of allSoilKeys) {
    const leftB  = findBand(left, key)
    const rightB = findBand(right, key)

    if (!leftB && !rightB) continue

    // Use the name from whichever side has it
    const sample = (left.layers.find(l => normKey(l.soilType) === key) || 
                    right.layers.find(l => normKey(l.soilType) === key))!
    const color = getSoilColor(sample.soilType)

    // Elevations: if absent on one side, taper to the vertical midpoint of the other side's band
    const yTL = yScale(leftB ? leftB.topMSL : (rightB!.topMSL + rightB!.bottomMSL)/2)
    const yBL = yScale(leftB ? leftB.bottomMSL : (rightB!.topMSL + rightB!.bottomMSL)/2)
    const yTR = yScale(rightB ? rightB.topMSL : (leftB!.topMSL + leftB!.bottomMSL)/2)
    const yBR = yScale(rightB ? rightB.bottomMSL : (leftB!.topMSL + leftB!.bottomMSL)/2)

    if (Math.abs(yBL - yTL) < 0.5 && Math.abs(yBR - yTR) < 0.5) continue

    const d = `M${lx.toFixed(1)},${yTL.toFixed(1)}` + 
              bez(lx, yTL, rx, yTR) + 
              ` L${rx.toFixed(1)},${yBR.toFixed(1)}` + 
              bez(rx, yBR, lx, yBL) + "Z"

    paths.push({
      soilType: sample.soilType,
      d,
      color,
    })
  }

  return paths.sort(() => 0)
}

// ─── Terrain surface path ─────────────────────────────────────────────────────

/**
 * Build an SVG `d` string for the terrain surface profile.
 * Uses cubic bezier interpolation between borewell ground points for a
 * natural topographic curve rather than a jagged line.
 */
export function buildTerrainPath(
  borewells: NormalisedBorewell[],
  yScale: (msl: number) => number,
  canvasWidth: number,
): string {
  if (borewells.length === 0) return ''

  const points: [number, number][] = borewells.map(bw => [bw.x, yScale(bw.groundMSL)])

  if (points.length === 1) {
    const [, y] = points[0]
    return `M 0,${y} L ${canvasWidth},${y}`
  }

  // Smooth through borewell ground points with catmull-rom → cubic bezier
  let d = `M ${points[0][0].toFixed(1)},${points[0][1].toFixed(1)}`

  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[Math.max(0, i - 1)]
    const p1 = points[i]
    const p2 = points[i + 1]
    const p3 = points[Math.min(points.length - 1, i + 2)]

    // Catmull-Rom to Cubic Bezier conversion
    const cp1x = p1[0] + (p2[0] - p0[0]) / 6
    const cp1y = p1[1] + (p2[1] - p0[1]) / 6
    const cp2x = p2[0] - (p3[0] - p1[0]) / 6
    const cp2y = p2[1] - (p3[1] - p1[1]) / 6

    d += ` C ${cp1x.toFixed(1)},${cp1y.toFixed(1)} ${cp2x.toFixed(1)},${cp2y.toFixed(1)} ${p2[0].toFixed(1)},${p2[1].toFixed(1)}`
  }

  return d
}
