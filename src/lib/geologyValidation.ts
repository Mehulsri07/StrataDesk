import type { CrossSectionInput } from '@/lib/adapters';

/**
 * Validates a dataset of borewells for geological correctness.
 * Returns { isValid: true } if valid, or { isValid: false, error: string } if any issues are detected.
 */
export function validateBorewells(boreholes: CrossSectionInput[]): { isValid: boolean; error?: string } {
  for (let i = 0; i < boreholes.length; i++) {
    const bh = boreholes[i];
    const prefix = `Borewell "${bh.label || `BH-${i + 1}`}"`;

    // 1. Validate borewell-level numeric variables
    if (
      isNaN(bh.groundElevationMSL) ||
      !isFinite(bh.groundElevationMSL)
    ) {
      return {
        isValid: false,
        error: `${prefix} has invalid ground elevation (NaN or Infinity).`,
      };
    }

    if (
      isNaN(bh.totalDepthFt) ||
      !isFinite(bh.totalDepthFt) ||
      bh.totalDepthFt < 0
    ) {
      return {
        isValid: false,
        error: `${prefix} has invalid total depth: ${bh.totalDepthFt} ft.`,
      };
    }

    if (
      isNaN(bh.waterLevelFt) ||
      !isFinite(bh.waterLevelFt) ||
      bh.waterLevelFt < 0
    ) {
      return {
        isValid: false,
        error: `${prefix} has invalid water level: ${bh.waterLevelFt} ft.`,
      };
    }

    if (!bh.layers) {
      return {
        isValid: false,
        error: `${prefix} has no layers array defined.`,
      };
    }

    const seenLayerIds = new Set<string>();
    // Sort layers by startDepth to check for overlaps easily
    const sortedLayers = [...bh.layers].sort((a, b) => a.startDepth - b.startDepth);

    for (let j = 0; j < sortedLayers.length; j++) {
      const layer = sortedLayers[j];
      const layerDesc = `layer index ${j} ("${layer.material || 'unnamed'}")`;

      // 2. Validate IDs
      if (!layer.id) {
        return {
          isValid: false,
          error: `${prefix} has a layer with a missing or empty ID.`,
        };
      }
      if (seenLayerIds.has(layer.id)) {
        return {
          isValid: false,
          error: `${prefix} has duplicate layer ID: "${layer.id}".`,
        };
      }
      seenLayerIds.add(layer.id);

      // 3. Validate Material
      if (!layer.material || !layer.material.trim()) {
        return {
          isValid: false,
          error: `${prefix} contains a layer with an empty or undefined material name.`,
        };
      }

      // 4. Validate Layer Bounds
      if (
        isNaN(layer.startDepth) ||
        !isFinite(layer.startDepth) ||
        layer.startDepth < 0
      ) {
        return {
          isValid: false,
          error: `${prefix} has negative or invalid start depth in ${layerDesc}: ${layer.startDepth} ft.`,
        };
      }

      if (
        isNaN(layer.endDepth) ||
        !isFinite(layer.endDepth) ||
        layer.endDepth < 0
      ) {
        return {
          isValid: false,
          error: `${prefix} has negative or invalid end depth in ${layerDesc}: ${layer.endDepth} ft.`,
        };
      }

      if (layer.endDepth <= layer.startDepth) {
        return {
          isValid: false,
          error: `${prefix} has inverted depths in ${layerDesc}: ${layer.startDepth} ft to ${layer.endDepth} ft.`,
        };
      }

      // 5. Validate Layer Overlaps
      if (j > 0) {
        const prev = sortedLayers[j - 1];
        // Enforce no overlap with 0.001 ft numeric precision safety margin
        if (layer.startDepth < prev.endDepth - 0.001) {
          return {
            isValid: false,
            error: `${prefix} has overlapping layers: "${prev.material}" (${prev.startDepth}-${prev.endDepth} ft) and "${layer.material}" (${layer.startDepth}-${layer.endDepth} ft).`,
          };
        }
      }
    }
  }

  return { isValid: true };
}
