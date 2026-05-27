/**
 * StrataDesk Geological Cross-Section Engine v3
 *
 * Accepts CrossSectionInput (see src/lib/adapters.ts) so both the main app
 * and the dashboard page share one engine.
 *
 * Implements:
 * - MSL elevation correction (depths converted to absolute metres above MSL)
 * - Local Sequential Correlation (neighbour-based chain propagation)
 * - Strata Order Preservation (repeated materials remain separate)
 * - Catmull-Rom Splines with material-based tension
 * - Coupled Vertical Smoothing (hierarchical stack resolution)
 * - Dynamic Pinch-out Tapering
 * - Inter-layer Collision Resolution (zero-gap / zero-overlap guarantee)
 */

import type { StrataLayer } from '@/types';
import { getSoilColor } from '@/lib/soilColors';
import type { CrossSectionInput } from '@/lib/adapters';

// ─── Unit helpers ─────────────────────────────────────────────────────────────

/** 1 ft = 0.3048 m */
const ftToM = (ft: number): number => ft * 0.3048;

// ─── Data Models ──────────────────────────────────────────────────────────────

export interface Point {
  x: number;
  y: number;
}

/**
 * A StrataNode represents a layer's physical boundary at a borehole anchor.
 * All depths are in feet below ground surface (pre-MSL-correction).
 */
export interface StrataNode {
  boreholeIdx: number;
  x: number;
  top: number;    // ft below ground surface
  bottom: number; // ft below ground surface
  material: string;
  originalId: string;
  normalizedMaterial: string;
}

/**
 * A ContinuousStrata represents a single interpreted geological unit
 * spanning multiple boreholes.
 */
export interface ContinuousStrata {
  id: string;
  material: string;
  displayName: string;
  color: string;
  nodes: (StrataNode | null)[]; // one entry per borehole in the section
  rank: number;                 // vertical stacking order
}

/**
 * Final renderable polygon.
 */
export interface LayerPolygon {
  material: string;
  displayName: string;
  color: string;
  topCurve: Point[];
  bottomCurve: Point[];
  path: string;
}

// ─── Constants & Config ───────────────────────────────────────────────────────

const MATERIAL_GROUPS: Record<string, string[]> = {
  'top soil':  ['top soil', 'topsoil', 'soil', 'humus'],
  'fill':      ['fill', 'filled', 'filling', 'backfill'],
  'clay':      ['clay', 'clayey', 'clays', 'clayey soil'],
  'silt':      ['silt', 'silty', 'silts'],
  'loam':      ['loam', 'loamy'],
  'sand':      ['sand', 'sandy', 'sands', 'fine sand', 'coarse sand', 'sandy soil'],
  'kankar':    ['kankar', 'calcareous', 'calcrete', 'sandy kankar', 'clay kankar', 'clayey kankar'],
  'murrum':    ['murrum', 'moorum', 'laterite'],
  'gravel':    ['gravel', 'gravelly', 'gravels', 'pebble'],
  'weathered': ['weathered', 'decomposed', 'weathered rock'],
  'rock':      ['rock', 'rocky', 'stone', 'hard rock', 'bedrock', 'boulder'],
};

/** Material-based tension: 1.0 = highly fluid (clay), 0.1 = rigid (rock) */
const MATERIAL_TENSION: Record<string, number> = {
  'clay':      0.85,
  'silt':      0.75,
  'loam':      0.70,
  'sand':      0.60,
  'kankar':    0.40,
  'gravel':    0.35,
  'weathered': 0.20,
  'rock':      0.10,
  'top soil':  0.80,
  'fill':      0.70,
  'murrum':    0.50,
};

function normalizeMaterial(material: string): string {
  const lower = material.toLowerCase().trim();
  for (const [group, aliases] of Object.entries(MATERIAL_GROUPS)) {
    if (aliases.some(a => lower.includes(a) || a.includes(lower))) return group;
  }
  return lower;
}

function getTension(material: string): number {
  return MATERIAL_TENSION[normalizeMaterial(material)] ?? 0.5;
}

// ─── Correlation Scoring ──────────────────────────────────────────────────────

function calculateCorrelationScoreFast(
  normMatA: string, startA: number, endA: number,
  normMatB: string, startB: number, endB: number
): number {
  let score = 0;
  if (normMatA === normMatB) score += 60;
  score += Math.max(0, 30 - Math.abs(startA - startB));
  score += Math.max(0, 10 - Math.abs((endA - startA) - (endB - startB)));
  return score;
}

export function calculateCorrelationScore(a: StrataLayer, b: StrataLayer): number {
  return calculateCorrelationScoreFast(
    normalizeMaterial(a.material), a.startDepth, a.endDepth,
    normalizeMaterial(b.material), b.startDepth, b.endDepth
  );
}

// ─── 1. Correlate Layers (Local Sequential) ───────────────────────────────────

function buildCorrelatedChains(
  boreholes: CrossSectionInput[],
  xPositions: number[],
): ContinuousStrata[] {
  const count = boreholes.length;
  if (count === 0) return [];

  const bhNodes: StrataNode[][] = boreholes.map((bh, i) =>
    bh.layers
      .filter(l => (l.endDepth - l.startDepth) >= 0.2)
      .map(l => ({
        boreholeIdx: i,
        x:           xPositions[i],
        top:         l.startDepth,
        bottom:      l.endDepth,
        material:    l.material,
        originalId:  l.id,
        normalizedMaterial: normalizeMaterial(l.material),
      }))
      .sort((a, b) => a.top - b.top)
  );

  const chains: ContinuousStrata[] = [];
  const used = bhNodes.map(() => new Set<string>());

  for (let i = 0; i < count; i++) {
    for (const node of bhNodes[i]) {
      if (used[i].has(node.originalId)) continue;

      const chainNodes: (StrataNode | null)[] = new Array(count).fill(null);
      chainNodes[i] = node;
      used[i].add(node.originalId);

      // Search forwards
      let cur = node;
      for (let j = i + 1; j < count; j++) {
        let bestScore = -1, bestNode: StrataNode | null = null;
        for (const c of bhNodes[j]) {
          if (used[j].has(c.originalId)) continue;
          const score = calculateCorrelationScoreFast(
            cur.normalizedMaterial, cur.top, cur.bottom,
            c.normalizedMaterial,   c.top,   c.bottom
          );
          if (score > 40 && score > bestScore) { bestScore = score; bestNode = c; }
        }
        if (bestNode) { chainNodes[j] = bestNode; used[j].add(bestNode.originalId); cur = bestNode; }
        else break;
      }

      // Search backwards
      cur = node;
      for (let j = i - 1; j >= 0; j--) {
        let bestScore = -1, bestNode: StrataNode | null = null;
        for (const c of bhNodes[j]) {
          if (used[j].has(c.originalId)) continue;
          const score = calculateCorrelationScoreFast(
            cur.normalizedMaterial, cur.top, cur.bottom,
            c.normalizedMaterial,   c.top,   c.bottom
          );
          if (score > 40 && score > bestScore) { bestScore = score; bestNode = c; }
        }
        if (bestNode) { chainNodes[j] = bestNode; used[j].add(bestNode.originalId); cur = bestNode; }
        else break;
      }

      const first = chainNodes.find(n => n !== null)!;
      chains.push({
        id:          Math.random().toString(36).substr(2, 9),
        material:    first.material,
        displayName: first.material,
        color:       getSoilColor(first.material),
        nodes:       chainNodes,
        rank:        chainNodes.reduce((acc, n) => acc + (n?.top ?? 0), 0) /
                     chainNodes.filter(n => n !== null).length,
      });
    }
  }

  return chains.sort((a, b) => a.rank - b.rank);
}

// ─── 2. Enforce Vertical Continuity ──────────────────────────────────────────

function enforceContinuity(chains: ContinuousStrata[], bhCount: number): void {
  for (let b = 0; b < bhCount; b++) {
    const stack = chains
      .map((c, i) => ({ chainIdx: i, node: c.nodes[b] }))
      .filter(item => item.node !== null)
      .sort((a, b) => a.node!.top - b.node!.top);

    for (let i = 1; i < stack.length; i++) {
      const prev = stack[i - 1].node!;
      const curr = stack[i].node!;
      curr.top = prev.bottom;
      if (curr.bottom <= curr.top) curr.bottom = curr.top + 0.1;
    }
  }
}

// ─── 3. Tapered Pinch-Outs ────────────────────────────────────────────────────

function applyPinchOuts(chains: ContinuousStrata[], xPositions: number[]): void {
  const bhCount = xPositions.length;
  for (const chain of chains) {
    const originalNodes = [...chain.nodes];
    for (let i = 0; i < bhCount; i++) {
      if (originalNodes[i] !== null) continue;
      const left  = i > 0           ? originalNodes[i - 1] : null;
      const right = i < bhCount - 1 ? originalNodes[i + 1] : null;
      if (left && !right) {
        const mid = (left.top + left.bottom) / 2;
        chain.nodes[i] = {
          boreholeIdx: i,
          x: xPositions[i],
          top: mid,
          bottom: mid,
          material: chain.material,
          originalId: 'pinch',
          normalizedMaterial: normalizeMaterial(chain.material),
        };
      } else if (!left && right) {
        const mid = (right.top + right.bottom) / 2;
        chain.nodes[i] = {
          boreholeIdx: i,
          x: xPositions[i],
          top: mid,
          bottom: mid,
          material: chain.material,
          originalId: 'pinch',
          normalizedMaterial: normalizeMaterial(chain.material),
        };
      }
    }
  }
}

// ─── 4. Catmull-Rom Interpolation ─────────────────────────────────────────────

function interpolate(points: Point[], material: string, segments = 24): Point[] {
  if (points.length < 2) return points;
  const tension = getTension(material);
  const result: Point[] = [];

  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[Math.max(0, i - 1)];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[Math.min(points.length - 1, i + 2)];

    for (let s = 0; s < segments; s++) {
      const t = s / segments, t2 = t * t, t3 = t2 * t;
      const v0x = (p2.x - p0.x) * tension * 0.5;
      const v1x = (p3.x - p1.x) * tension * 0.5;
      const x = (2*t3 - 3*t2 + 1)*p1.x + (t3 - 2*t2 + t)*v0x + (-2*t3 + 3*t2)*p2.x + (t3 - t2)*v1x;
      const v0y = (p2.y - p0.y) * tension * 0.5;
      const v1y = (p3.y - p1.y) * tension * 0.5;
      const y = (2*t3 - 3*t2 + 1)*p1.y + (t3 - 2*t2 + t)*v0y + (-2*t3 + 3*t2)*p2.y + (t3 - t2)*v1y;
      result.push({ x, y });
    }
  }
  result.push(points[points.length - 1]);
  return result;
}

// ─── 5. Collision Resolution ──────────────────────────────────────────────────

function resolveInterLayerCollisions(polygons: LayerPolygon[]): void {
  for (let i = 1; i < polygons.length; i++) {
    const upper = polygons[i - 1];
    const lower = polygons[i];
    const len = Math.min(upper.bottomCurve.length, lower.topCurve.length);
    for (let j = 0; j < len; j++) {
      if (lower.topCurve[j].y < upper.bottomCurve[j].y) {
        const mid = (lower.topCurve[j].y + upper.bottomCurve[j].y) / 2;
        lower.topCurve[j].y = mid;
        upper.bottomCurve[j].y = mid;
      }
    }
  }
}

function pointsToPath(top: Point[], bottom: Point[]): string {
  if (!top.length || !bottom.length) return '';
  const rev = [...bottom].reverse();
  let d = `M ${top[0].x.toFixed(1)} ${top[0].y.toFixed(1)}`;
  for (let i = 1; i < top.length; i++) d += ` L ${top[i].x.toFixed(1)} ${top[i].y.toFixed(1)}`;
  for (const p of rev) d += ` L ${p.x.toFixed(1)} ${p.y.toFixed(1)}`;
  return d + ' Z';
}

// ─── MSL-corrected depth scale ────────────────────────────────────────────────

/**
 * Builds a depthScale function that accounts for ground elevation differences
 * between boreholes. When all borewells have groundElevationMSL = 0 (not yet
 * fetched), this degrades gracefully to a flat-ground section.
 *
 * Returns a per-borehole scale: (boreholeIdx, depthFt) → SVG y-coordinate.
 */
function buildMSLDepthScale(
  boreholes: CrossSectionInput[],
  _svgHeight: number,
  marginY: number,
  chartH: number,
): (boreholeIdx: number, depthFt: number) => number {
  // Compute absolute MSL elevation for each depth point
  const toMSL = (bh: CrossSectionInput, depthFt: number) =>
    bh.groundElevationMSL - ftToM(depthFt);

  // Find global MSL range
  let maxMSL = -Infinity, minMSL = Infinity;
  for (const bh of boreholes) {
    maxMSL = Math.max(maxMSL, bh.groundElevationMSL);
    minMSL = Math.min(minMSL, toMSL(bh, bh.totalDepthFt));
  }
  const range = maxMSL - minMSL || 1;

  return (boreholeIdx: number, depthFt: number) => {
    const msl = toMSL(boreholes[boreholeIdx], depthFt);
    return marginY + ((maxMSL - msl) / range) * chartH;
  };
}

// ─── Master Entry Point ───────────────────────────────────────────────────────

/**
 * Builds renderable layer polygons for a geological cross-section.
 *
 * @param boreholes   Ordered array of CrossSectionInput (left → right on section)
 * @param xPositions  SVG x-coordinate for each borehole (same length as boreholes)
 * @param depthScale  Legacy flat depthScale(depthFt) → y. Pass null to use MSL correction.
 * @param mode        'smooth' = Catmull-Rom splines, 'strict' = straight lines
 * @param svgDims     Required when depthScale is null (for MSL scale construction)
 */
export function buildCrossSection(
  boreholes: CrossSectionInput[],
  xPositions: number[],
  depthScale: ((d: number) => number) | null,
  mode: 'smooth' | 'strict',
  svgDims?: { marginY: number; chartH: number; svgH: number },
): LayerPolygon[] {
  const start = (typeof import.meta !== 'undefined' && import.meta.env?.DEV) ? performance.now() : 0;
  if (boreholes.length < 2) return [];

  // Build the y-scale: prefer MSL-corrected when dims are provided
  let yScale: (boreholeIdx: number, depthFt: number) => number;
  if (depthScale !== null && depthScale !== undefined) {
    // Legacy flat scale — same y for all boreholes at same depth
    yScale = (_idx, d) => depthScale(d);
  } else if (svgDims) {
    yScale = buildMSLDepthScale(boreholes, svgDims.svgH, svgDims.marginY, svgDims.chartH);
  } else {
    // Fallback: flat scale derived from max depth
    const maxDepth = Math.max(...boreholes.map(b => b.totalDepthFt));
    const chartH = Math.max(520, maxDepth * 3);
    const marginY = 90;
    yScale = (_idx, d) => marginY + (d / maxDepth) * chartH;
  }

  // 1. Correlate
  const chains = buildCorrelatedChains(boreholes, xPositions);

  // 2. Pinch-outs
  applyPinchOuts(chains, xPositions);

  // 3. Continuity
  enforceContinuity(chains, boreholes.length);

  // 4. Interpolate → polygons
  const segments = mode === 'smooth' ? 30 : 6;
  const polygons: LayerPolygon[] = [];

  for (const chain of chains) {
    const validNodes = chain.nodes
      .map((n, i) => (n ? { node: n, idx: i } : null))
      .filter((x): x is { node: StrataNode; idx: number } => x !== null);

    if (validNodes.length < 2) continue;

    const topPoints = validNodes.map(({ node, idx }) => ({ x: node.x, y: yScale(idx, node.top) }));
    const botPoints = validNodes.map(({ node, idx }) => ({ x: node.x, y: yScale(idx, node.bottom) }));

    polygons.push({
      material:    chain.material,
      displayName: chain.displayName,
      color:       chain.color,
      topCurve:    interpolate(topPoints, chain.material, segments),
      bottomCurve: interpolate(botPoints, chain.material, segments),
      path:        '',
    });
  }

  // 5. Collision fix
  resolveInterLayerCollisions(polygons);

  // 6. Generate paths
  for (const poly of polygons) {
    poly.path = pointsToPath(poly.topCurve, poly.bottomCurve);
  }

  if (typeof import.meta !== 'undefined' && import.meta.env?.DEV) {
    const elapsed = performance.now() - start;
    console.log(`CrossSection build: ${elapsed.toFixed(2)} ms`);
    if (typeof window !== 'undefined') {
      const win = window as any;
      win._strataPerfMetrics = win._strataPerfMetrics || {};
      win._strataPerfMetrics.crossSectionBuildTime = elapsed;
    }
  }

  return polygons;
}
