/**
 * Depth Normalizer - Strict depth value normalization and validation
 * Handles unit conversion, validation, and sanitization of depth values
 */

class DepthNormalizer {
  constructor() {
    this.supportedUnits = {
      // Feet variants
      'ft': 'feet',
      'feet': 'feet', 
      'foot': 'feet',
      "'": 'feet',
      
      // Meter variants
      'm': 'meters',
      'meter': 'meters',
      'meters': 'meters',
      'metre': 'meters',
      'metres': 'meters'
    };
    
    this.conversionFactors = {
      'meters': 3.28084, // meters to feet
      'feet': 1.0        // feet to feet
    };
    
    // Validation limits (in feet)
    this.limits = {
      min: 0,
      max: 1000,        // 1000 feet maximum
      warningThreshold: 500  // Warn above 500 feet
    };
    
    // Precision settings
    this.precision = {
      decimalPlaces: 2,
      tolerance: 0.001
    };
  }
  
  /**
   * Normalizes a depth value to feet with strict validation
   * @param {any} rawDepth - Raw depth value from extraction
   * @param {string} rawUnit - Raw unit string from extraction
   * @returns {Object} Normalization result
   */
  normalize(rawDepth, rawUnit = 'ft') {
    const result = {
      success: false,
      normalizedDepth: null,
      normalizedUnit: 'feet',
      originalDepth: rawDepth,
      originalUnit: rawUnit,
      errors: [],
      warnings: []
    };
    
    try {
      // Step 1: Validate and convert depth to number
      const numericDepth = this.parseNumericDepth(rawDepth);
      if (numericDepth.errors.length > 0) {
        result.errors.push(...numericDepth.errors);
        return result;
      }
      
      // Step 2: Normalize unit
      const normalizedUnit = this.normalizeUnit(rawUnit);
      if (!normalizedUnit.success) {
        result.errors.push(...normalizedUnit.errors);
        result.warnings.push(...normalizedUnit.warnings);
        // Use default unit but continue
      }
      
      // Step 3: Convert to feet
      const depthInFeet = this.convertToFeet(numericDepth.value, normalizedUnit.unit || 'feet');
      
      // Step 4: Apply precision rounding
      const roundedDepth = this.applyPrecision(depthInFeet);
      
      // Step 5: Validate range
      const rangeValidation = this.validateRange(roundedDepth);
      result.errors.push(...rangeValidation.errors);
      result.warnings.push(...rangeValidation.warnings);
      
      // Step 6: Check for floating point issues
      const precisionCheck = this.checkPrecision(numericDepth.value, roundedDepth);
      result.warnings.push(...precisionCheck.warnings);
      
      result.success = result.errors.length === 0;
      result.normalizedDepth = roundedDepth;
      
      return result;
      
    } catch (error) {
      result.errors.push(`Depth normalization failed: ${error.message}`);
      return result;
    }
  }
  
  /**
   * Parses raw depth value to numeric
   * @param {any} rawDepth - Raw depth value
   * @returns {Object} Parse result
   */
  parseNumericDepth(rawDepth) {
    const result = {
      success: false,
      value: null,
      errors: [],
      warnings: []
    };
    
    // Handle null/undefined
    if (rawDepth === null || rawDepth === undefined) {
      result.errors.push('Depth value is null or undefined');
      return result;
    }
    
    // Handle already numeric values
    if (typeof rawDepth === 'number') {
      if (isNaN(rawDepth) || !isFinite(rawDepth)) {
        result.errors.push('Depth value is NaN or infinite');
        return result;
      }
      result.success = true;
      result.value = rawDepth;
      return result;
    }
    
    // Handle string values
    if (typeof rawDepth === 'string') {
      const cleaned = rawDepth.trim();
      
      if (cleaned === '') {
        result.errors.push('Depth value is empty string');
        return result;
      }
      
      // Remove common non-numeric characters but preserve decimal point and negative sign
      const sanitized = cleaned.replace(/[^\d.-]/g, '');
      
      if (sanitized === '') {
        result.errors.push('No numeric content found in depth value');
        return result;
      }
      
      const parsed = parseFloat(sanitized);
      
      if (isNaN(parsed) || !isFinite(parsed)) {
        result.errors.push(`Cannot parse depth value: '${rawDepth}'`);
        return result;
      }
      
      result.success = true;
      result.value = parsed;
      return result;
    }
    
    // Handle other types
    result.errors.push(`Invalid depth type: ${typeof rawDepth}`);
    return result;
  }
  
  /**
   * Normalizes unit string
   * @param {string} rawUnit - Raw unit string
   * @returns {Object} Normalization result
   */
  normalizeUnit(rawUnit) {
    const result = {
      success: false,
      unit: null,
      errors: [],
      warnings: []
    };
    
    if (!rawUnit || typeof rawUnit !== 'string') {
      result.warnings.push('No unit specified, assuming feet');
      result.unit = 'feet';
      result.success = true;
      return result;
    }
    
    const cleaned = rawUnit.toLowerCase().trim();
    
    if (cleaned === '') {
      result.warnings.push('Empty unit string, assuming feet');
      result.unit = 'feet';
      result.success = true;
      return result;
    }
    
    // Check supported units
    if (cleaned in this.supportedUnits) {
      result.unit = this.supportedUnits[cleaned];
      result.success = true;
      return result;
    }
    
    // Check for partial matches
    for (const [key, value] of Object.entries(this.supportedUnits)) {
      if (cleaned.includes(key) || key.includes(cleaned)) {
        result.unit = value;
        result.success = true;
        result.warnings.push(`Partial unit match: '${rawUnit}' interpreted as ${value}`);
        return result;
      }
    }
    
    result.warnings.push(`Unknown unit '${rawUnit}', assuming feet`);
    result.unit = 'feet';
    result.success = true;
    return result;
  }
  
  /**
   * Converts depth to feet
   * @param {number} depth - Numeric depth value
   * @param {string} unit - Normalized unit
   * @returns {number} Depth in feet
   */
  convertToFeet(depth, unit) {
    const factor = this.conversionFactors[unit] || 1.0;
    return depth * factor;
  }
  
  /**
   * Applies precision rounding
   * @param {number} depth - Depth value
   * @returns {number} Rounded depth
   */
  applyPrecision(depth) {
    const factor = Math.pow(10, this.precision.decimalPlaces);
    return Math.round(depth * factor) / factor;
  }
  
  /**
   * Validates depth range
   * @param {number} depth - Depth in feet
   * @returns {Object} Validation result
   */
  validateRange(depth) {
    const result = {
      errors: [],
      warnings: []
    };
    
    if (depth < this.limits.min) {
      result.errors.push(`Depth ${depth} ft is below minimum (${this.limits.min} ft)`);
    }
    
    if (depth > this.limits.max) {
      result.errors.push(`Depth ${depth} ft exceeds maximum (${this.limits.max} ft)`);
    } else if (depth > this.limits.warningThreshold) {
      result.warnings.push(`Depth ${depth} ft exceeds warning threshold (${this.limits.warningThreshold} ft)`);
    }
    
    return result;
  }
  
  /**
   * Checks for precision issues
   * @param {number} original - Original value
   * @param {number} rounded - Rounded value
   * @returns {Object} Check result
   */
  checkPrecision(original, rounded) {
    const result = {
      warnings: []
    };
    
    const difference = Math.abs(original - rounded);
    
    if (difference > this.precision.tolerance) {
      result.warnings.push(`Precision loss: ${original} rounded to ${rounded} (difference: ${difference.toFixed(4)})`);
    }
    
    return result;
  }
  
  /**
   * Normalizes an array of depth values
   * @param {Array} depths - Array of {depth, unit} objects
   * @returns {Object} Batch normalization result
   */
  normalizeBatch(depths) {
    const results = {
      success: true,
      normalized: [],
      errors: [],
      warnings: [],
      statistics: {
        total: depths.length,
        successful: 0,
        failed: 0,
        warnings: 0
      }
    };
    
    for (let i = 0; i < depths.length; i++) {
      const item = depths[i];
      const normalized = this.normalize(item.depth, item.unit);
      
      normalized.index = i;
      results.normalized.push(normalized);
      
      if (normalized.success) {
        results.statistics.successful++;
      } else {
        results.statistics.failed++;
        results.success = false;
      }
      
      if (normalized.warnings.length > 0) {
        results.statistics.warnings++;
      }
      
      // Collect all errors and warnings
      results.errors.push(...normalized.errors.map(err => `Item ${i}: ${err}`));
      results.warnings.push(...normalized.warnings.map(warn => `Item ${i}: ${warn}`));
    }
    
    return results;
  }
  
  /**
   * Validates depth sequence for gaps and overlaps
   * @param {Array} normalizedDepths - Array of normalized depth objects
   * @returns {Object} Sequence validation result
   */
  validateSequence(normalizedDepths) {
    const result = {
      success: true,
      errors: [],
      warnings: [],
      gaps: [],
      overlaps: []
    };
    
    if (normalizedDepths.length < 2) {
      return result; // No sequence to validate
    }
    
    // Sort by start depth
    const sorted = normalizedDepths
      .filter(d => d.success && d.normalizedDepth !== null)
      .sort((a, b) => a.normalizedDepth - b.normalizedDepth);
    
    for (let i = 0; i < sorted.length - 1; i++) {
      const current = sorted[i];
      const next = sorted[i + 1];
      
      // Assuming these are layer boundaries, check for gaps
      const gap = next.normalizedDepth - current.normalizedDepth;
      
      if (gap < 0) {
        // This shouldn't happen with sorted data, but check anyway
        result.overlaps.push({
          index1: current.index,
          index2: next.index,
          overlap: Math.abs(gap)
        });
        result.errors.push(`Depth overlap detected: ${current.normalizedDepth} ft and ${next.normalizedDepth} ft`);
        result.success = false;
      } else if (gap > 0.1) { // Gap larger than 0.1 feet
        result.gaps.push({
          index1: current.index,
          index2: next.index,
          gap: gap
        });
        result.warnings.push(`Depth gap detected: ${gap.toFixed(2)} ft between ${current.normalizedDepth} ft and ${next.normalizedDepth} ft`);
      }
    }
    
    return result;
  }
}

// Export for both browser and Node.js environments
if (typeof window !== 'undefined') {
  window.DepthNormalizer = DepthNormalizer;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { DepthNormalizer };
}