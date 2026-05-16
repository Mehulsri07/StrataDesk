// ─────────────────────────────────────────────────────────────────────────────
// cross-section — Public API
// ─────────────────────────────────────────────────────────────────────────────

export { CrossSectionView, CrossSectionView as CrossSection } from './CrossSectionView'
export type { CrossSectionViewProps } from './CrossSectionView'
export type { CrossSectionBorewell } from './types'
export { haversineDistance, ftToM, mToFt, formatDistance } from './geoUtils'
export { getSoilColor } from './interpolate'
