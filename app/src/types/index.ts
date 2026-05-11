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
}

export const DEFAULT_MATERIALS: { name: string; color: string }[] = [
  { name: 'Clay', color: '#8D6E63' },
  { name: 'Sand', color: '#E0C097' },
  { name: 'Kankar', color: '#A1887F' },
  { name: 'Sandy Kankar', color: '#BCAAA4' },
  { name: 'Gravel', color: '#9E9E9E' },
  { name: 'Rock', color: '#616161' },
  { name: 'Hard Rock', color: '#424242' },
  { name: 'Clay Kankar', color: '#6D4C41' },
  { name: 'Silt', color: '#A0826D' },
  { name: 'Loam', color: '#9C7A5C' },
  { name: 'Top Soil', color: '#6B5D4F' },
  { name: 'Fill', color: '#8B7355' },
  { name: 'Murrum', color: '#B8860B' },
  { name: 'Weathered', color: '#CD853F' },
];

export function getColorForMaterial(material: string): string {
  const normalized = material.toLowerCase().trim();
  const materialMap: { patterns: string[]; color: string }[] = [
    { patterns: ['clay', 'clayey', 'clays'], color: '#8D6E63' },
    { patterns: ['sand', 'sandy', 'sands'], color: '#E0C097' },
    { patterns: ['kankar', 'calcareous', 'calcrete'], color: '#A1887F' },
    { patterns: ['sandy kankar', 'sand kankar'], color: '#BCAAA4' },
    { patterns: ['gravel', 'gravelly', 'gravels', 'pebble'], color: '#9E9E9E' },
    { patterns: ['rock', 'rocky', 'stone'], color: '#616161' },
    { patterns: ['hard rock', 'bedrock', 'boulder'], color: '#424242' },
    { patterns: ['clay kankar', 'clayey kankar'], color: '#6D4C41' },
    { patterns: ['silt', 'silty', 'silts'], color: '#A0826D' },
    { patterns: ['loam', 'loamy'], color: '#9C7A5C' },
    { patterns: ['top soil', 'topsoil', 'soil'], color: '#6B5D4F' },
    { patterns: ['fill', 'filled', 'filling'], color: '#8B7355' },
    { patterns: ['murrum', 'moorum'], color: '#B8860B' },
    { patterns: ['weathered', 'decomposed'], color: '#CD853F' },
  ];
  for (const { patterns, color } of materialMap) {
    for (const pattern of patterns) {
      if (normalized.includes(pattern)) return color;
    }
  }
  return '#78909C';
}

export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

export function createBorewell(data: Partial<Borewell>): Borewell {
  const now = new Date().toISOString();
  return {
    id: generateId(),
    name: data.name || '',
    location: data.location || '',
    latitude: data.latitude || 0,
    longitude: data.longitude || 0,
    diameter: data.diameter || 8,
    totalDepth: data.totalDepth || 0,
    waterLevel: data.waterLevel ?? null,
    notes: data.notes || '',
    layers: data.layers || [],
    selectedForCrossSection: false,
    createdAt: now,
    updatedAt: now,
  };
}

export function lightenColor(hex: string, amount: number): string {
  const num = parseInt(hex.replace('#', ''), 16);
  const r = Math.min(255, ((num >> 16) & 0xff) + amount);
  const g = Math.min(255, ((num >> 8) & 0xff) + amount);
  const b = Math.min(255, (num & 0xff) + amount);
  return `rgb(${r},${g},${b})`;
}

export function darkenColor(hex: string, amount: number): string {
  const num = parseInt(hex.replace('#', ''), 16);
  const r = Math.max(0, ((num >> 16) & 0xff) - amount);
  const g = Math.max(0, ((num >> 8) & 0xff) - amount);
  const b = Math.max(0, (num & 0xff) - amount);
  return `rgb(${r},${g},${b})`;
}

export function generateDepthTicks(totalDepth: number): number[] {
  if (!totalDepth) return [];
  const step = totalDepth <= 50 ? 5 : totalDepth <= 200 ? 10 : 25;
  const ticks: number[] = [0];
  for (let d = step; d < totalDepth; d += step) ticks.push(d);
  ticks.push(totalDepth);
  return ticks;
}

export function checkOverlap(layers: StrataLayer[]): boolean {
  const sorted = [...layers].sort((a, b) => a.startDepth - b.startDepth);
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i].startDepth < sorted[i - 1].endDepth) return true;
  }
  return false;
}
