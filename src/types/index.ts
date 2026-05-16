/**
 * Public surface of the StrataDesk types package.
 *
 * Consumers should import from '@/types' rather than from individual files,
 * so internal structure can change without touching import statements.
 */

export type {
  StrataLayer,
  Borewell,
  SearchResult,
  MapMode,
  ViewMode,
  CrossSectionMode,
  AppState,
  CustomMaterial,
} from './models';

export { DEFAULT_MATERIALS } from './constants';

export {
  generateId,
  createBorewell,
  createLayer,
  lightenColor,
  darkenColor,
  generateDepthTicks,
  checkOverlap,
} from './utils';
