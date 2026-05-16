/**
 * Domain utility functions for StrataDesk.
 * Factory functions, ID generation, color manipulation, and validation helpers.
 */

import type { Borewell, StrataLayer } from './models';
import { getSoilColor } from '@/lib/soilColors';

// ─── ID Generation ────────────────────────────────────────────────────────────

export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2);
}

// ─── Factory Functions ────────────────────────────────────────────────────────

export function createBorewell(data: Partial<Borewell>): Borewell {
  const now = new Date().toISOString();
  return {
    id:                     generateId(),
    name:                   data.name     || '',
    location:               data.location || '',
    latitude:               data.latitude  || 0,
    longitude:              data.longitude || 0,
    diameter:               data.diameter  || 8,
    totalDepth:             data.totalDepth || 0,
    waterLevel:             data.waterLevel ?? null,
    notes:                  data.notes    || '',
    layers:                 data.layers   || [],
    selectedForCrossSection: false,
    createdAt:              now,
    updatedAt:              now,
  };
}

export function createLayer(overrides: Partial<StrataLayer> = {}): StrataLayer {
  const material = overrides.material || 'Clay';
  return {
    id:         generateId(),
    startDepth: overrides.startDepth ?? 0,
    endDepth:   overrides.endDepth   ?? 0,
    material,
    color:      overrides.color || getSoilColor(material),
    confidence: overrides.confidence,
  };
}

// ─── Color Manipulation ───────────────────────────────────────────────────────

export function lightenColor(hex: string, amount: number): string {
  const num = parseInt(hex.replace('#', ''), 16);
  const r = Math.min(255, ((num >> 16) & 0xff) + amount);
  const g = Math.min(255, ((num >>  8) & 0xff) + amount);
  const b = Math.min(255, ( num        & 0xff) + amount);
  return `rgb(${r},${g},${b})`;
}

export function darkenColor(hex: string, amount: number): string {
  const num = parseInt(hex.replace('#', ''), 16);
  const r = Math.max(0, ((num >> 16) & 0xff) - amount);
  const g = Math.max(0, ((num >>  8) & 0xff) - amount);
  const b = Math.max(0, ( num        & 0xff) - amount);
  return `rgb(${r},${g},${b})`;
}

// ─── Depth / Layer Validation ─────────────────────────────────────────────────

/**
 * Generates evenly-spaced depth tick marks for a given total depth.
 */
export function generateDepthTicks(totalDepth: number): number[] {
  if (!totalDepth) return [];
  const step = totalDepth <= 50 ? 5 : totalDepth <= 200 ? 10 : 25;
  const ticks: number[] = [0];
  for (let d = step; d < totalDepth; d += step) ticks.push(d);
  ticks.push(totalDepth);
  return ticks;
}

/**
 * Returns true if any two layers in the array overlap in depth.
 */
export function checkOverlap(layers: StrataLayer[]): boolean {
  const sorted = [...layers].sort((a, b) => a.startDepth - b.startDepth);
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i].startDepth < sorted[i - 1].endDepth) return true;
  }
  return false;
}
