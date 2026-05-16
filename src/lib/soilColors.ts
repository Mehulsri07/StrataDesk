/**
 * Single source of truth for soil/material colour resolution.
 *
 * Previously split between:
 *   - getColorForMaterial() in @/types/constants.ts  (used by the main app)
 *   - getSoilColor()         in components/CrossSection/interpolate.ts (used by the dashboard)
 *
 * Both are now deleted and replaced by getSoilColor() here.
 * The palette is the union of both originals, with the MSL-corrected
 * component's entries taking precedence (they were more complete).
 */

const SOIL_PALETTE: [RegExp, string][] = [
  // Specific compound names first (order matters — most specific → least specific)
  [/sandy\s*kankar|sand\s*kankar/i,  '#BCAAA4'],
  [/clay\s*kankar|clayey\s*kankar/i, '#6D4C41'],
  [/hard\s*rock|bedrock|boulder/i,   '#424242'],
  [/top\s*soil|topsoil/i,            '#6B5D4F'],

  // Single-word / broad matches
  [/kankar|calcareous|calcrete/i,    '#A1887F'],
  [/clay|clayey/i,                   '#8D6E63'],
  [/sand|sandy/i,                    '#E0C097'],
  [/gravel|gravelly|pebble/i,        '#9E9E9E'],
  [/rock|rocky|stone/i,              '#616161'],
  [/silt|silty/i,                    '#A0826D'],
  [/loam|loamy/i,                    '#9C7A5C'],
  [/fill|filled|filling|backfill/i,  '#8B7355'],
  [/murrum|moorum|laterite/i,        '#B8860B'],
  [/weathered|decomposed/i,          '#CD853F'],
  [/water|aquifer/i,                 '#2d6a8a'],
  [/shale/i,                         '#6e6e82'],
  [/soil|humus/i,                    '#6B5D4F'],
];

/**
 * Resolves a display colour for a given material/soil-type string.
 * Falls back to a neutral slate if no pattern matches.
 */
export function getSoilColor(material: string): string {
  for (const [re, color] of SOIL_PALETTE) {
    if (re.test(material)) return color;
  }
  return '#78909C';
}
