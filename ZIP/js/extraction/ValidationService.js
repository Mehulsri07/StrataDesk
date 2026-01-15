/**
 * ValidationService - Handles validation of extracted strata data
 * Validates depth sequences, data consistency, and extraction quality
 */

class ValidationService {
  constructor() {
    this.tolerances = {
      depthGap: 0.1, // Maximum acceptable gap in depth sequence
      minDepthInterval: 0.1 // Minimum depth interval
    };
  }

  /**
   * Validate a sequence of depth values
   * @param {Array<number>} depths - Array of depth values
   * @returns {Object} Validation result with valid flag and errors
   */
  validateDepthSequence(depths) {
    const errors = [];
    const warnings = [];

    if (!depths || depths.length === 0) {
      errors.push('No depth values found in the file');
      return { valid: false, errors, warnings };
    }

    // Check for non-numeric values
    const nonNumeric = depths.filter(d => typeof d !== 'number' || isNaN(d));
    if (nonNumeric.length > 0) {
      errors.push(`Found ${nonNumeric.length} non-numeric depth values`);
    }

    // Filter to valid numbers for further checks
    const validDepths = depths.filter(d => typeof d === 'number' && !isNaN(d));

    if (validDepths.length === 0) {
      errors.push('No valid numeric depth values found');
      return { valid: false, errors, warnings };
    }

    // Check for negative depths
    const negativeDepths = validDepths.filter(d => d < 0);
    if (negativeDepths.length > 0) {
      warnings.push(`Found ${negativeDepths.length} negative depth values`);
    }

    // Check for monotonic sequence (depths should generally increase)
    let increasing = 0;
    let decreasing = 0;
    for (let i = 1; i < validDepths.length; i++) {
      if (validDepths[i] > validDepths[i - 1]) increasing++;
      else if (validDepths[i] < validDepths[i - 1]) decreasing++;
    }

    // Determine if sequence is mostly increasing or decreasing
    const isIncreasing = increasing >= decreasing;
    
    // Check for inconsistent direction changes
    if (increasing > 0 && decreasing > 0) {
      const ratio = Math.min(increasing, decreasing) / Math.max(increasing, decreasing);
      if (ratio > 0.2) {
        warnings.push('Depth sequence has inconsistent direction changes');
      }
    }

    // Check for duplicate depths
    const uniqueDepths = new Set(validDepths);
    if (uniqueDepths.size < validDepths.length) {
      const duplicateCount = validDepths.length - uniqueDepths.size;
      warnings.push(`Found ${duplicateCount} duplicate depth values`);
    }

    // Check for large gaps
    const sortedDepths = [...validDepths].sort((a, b) => a - b);
    const intervals = [];
    for (let i = 1; i < sortedDepths.length; i++) {
      intervals.push(sortedDepths[i] - sortedDepths[i - 1]);
    }

    if (intervals.length > 0) {
      const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
      const largeGaps = intervals.filter(i => i > avgInterval * 3);
      if (largeGaps.length > 0) {
        warnings.push(`Found ${largeGaps.length} unusually large gaps in depth sequence`);
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      stats: {
        count: validDepths.length,
        min: Math.min(...validDepths),
        max: Math.max(...validDepths),
        isIncreasing,
        uniqueCount: uniqueDepths.size
      }
    };
  }

  /**
   * Check consistency of depth intervals
   * @param {Array<number>} depths - Array of depth values
   * @returns {Object} Consistency analysis result
   */
  checkDepthIntervalConsistency(depths) {
    if (!depths || depths.length < 2) {
      return { consistent: true, intervals: [], mode: 0 };
    }

    const intervals = [];
    for (let i = 1; i < depths.length; i++) {
      intervals.push(Math.abs(depths[i] - depths[i - 1]));
    }

    // Calculate mode (most common interval)
    const counts = {};
    intervals.forEach(interval => {
      const rounded = Math.round(interval * 10) / 10;
      counts[rounded] = (counts[rounded] || 0) + 1;
    });

    let maxCount = 0;
    let mode = intervals[0];
    for (const [interval, count] of Object.entries(counts)) {
      if (count > maxCount) {
        maxCount = count;
        mode = parseFloat(interval);
      }
    }

    // Check how many intervals match the mode
    const tolerance = mode * 0.1; // 10% tolerance
    const matchingIntervals = intervals.filter(i => Math.abs(i - mode) <= tolerance);
    const consistency = matchingIntervals.length / intervals.length;

    return {
      consistent: consistency > 0.8,
      intervals,
      mode,
      consistency,
      variableIntervals: consistency <= 0.8
    };
  }

  /**
   * Detect missing or invalid depth values
   * @param {Array<number>} depths - Array of depth values
   * @param {number} expectedInterval - Expected depth interval
   * @returns {Object} Detection result with missing indices
   */
  detectMissingDepths(depths, expectedInterval) {
    const missing = [];
    const invalid = [];

    if (!depths || depths.length < 2 || !expectedInterval) {
      return { missing, invalid };
    }

    const sortedDepths = [...depths].sort((a, b) => a - b);
    
    for (let i = 1; i < sortedDepths.length; i++) {
      const gap = sortedDepths[i] - sortedDepths[i - 1];
      const expectedGaps = Math.round(gap / expectedInterval);
      
      if (expectedGaps > 1) {
        // There are missing depths
        for (let j = 1; j < expectedGaps; j++) {
          missing.push(sortedDepths[i - 1] + (j * expectedInterval));
        }
      }
    }

    // Check for invalid (non-conforming) depths
    depths.forEach((depth, index) => {
      if (typeof depth !== 'number' || isNaN(depth)) {
        invalid.push({ index, value: depth, reason: 'Not a valid number' });
      }
    });

    return { missing, invalid };
  }

  /**
   * Validate layer boundaries
   * @param {Array<Object>} layers - Array of layer objects
   * @returns {Object} Validation result
   */
  validateLayerBoundaries(layers) {
    const errors = [];
    const warnings = [];

    if (!layers || layers.length === 0) {
      return { valid: true, errors, warnings };
    }

    // Sort layers by start depth
    const sortedLayers = [...layers].sort((a, b) => a.start_depth - b.start_depth);

    for (let i = 0; i < sortedLayers.length; i++) {
      const layer = sortedLayers[i];

      // Check start < end
      if (layer.start_depth > layer.end_depth) {
        errors.push(`Layer "${layer.material}": start depth (${layer.start_depth}) > end depth (${layer.end_depth})`);
      }

      // Check for overlaps with next layer
      if (i < sortedLayers.length - 1) {
        const nextLayer = sortedLayers[i + 1];
        if (layer.end_depth > nextLayer.start_depth) {
          warnings.push(`Layers "${layer.material}" and "${nextLayer.material}" overlap`);
        }
      }

      // Check for gaps between layers
      if (i < sortedLayers.length - 1) {
        const nextLayer = sortedLayers[i + 1];
        const gap = nextLayer.start_depth - layer.end_depth;
        if (gap > this.tolerances.depthGap) {
          warnings.push(`Gap of ${gap} between layers "${layer.material}" and "${nextLayer.material}"`);
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }
}

// Export for use in other modules
if (typeof window !== 'undefined') {
  window.ValidationService = ValidationService;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { ValidationService };
}
