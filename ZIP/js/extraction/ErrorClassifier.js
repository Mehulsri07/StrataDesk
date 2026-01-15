/**
 * Error Classifier - Semantic classification of extraction errors
 * Classifies errors as Fatal, Recoverable, or Warning with confidence impact
 */

class ErrorClassifier {
  constructor() {
    this.errorTypes = {
      FATAL: 'fatal',
      RECOVERABLE: 'recoverable', 
      WARNING: 'warning'
    };
    
    // Error patterns and their classifications
    this.errorPatterns = {
      // Fatal errors - abort extraction, no save possible
      fatal: [
        /file.*corrupt/i,
        /cannot.*read.*file/i,
        /invalid.*file.*format/i,
        /no.*data.*found/i,
        /critical.*parsing.*error/i,
        /schema.*violation/i,
        /database.*connection.*failed/i
      ],
      
      // Recoverable errors - force review + downgrade confidence
      recoverable: [
        /missing.*required.*field/i,
        /invalid.*depth.*value/i,
        /duplicate.*unit.*number/i,
        /percentage.*sum.*incorrect/i,
        /inconsistent.*data/i,
        /ambiguous.*material/i,
        /partial.*extraction/i,
        /validation.*failed/i
      ],
      
      // Warnings - log only, no behavior change
      warning: [
        /minor.*rounding.*difference/i,
        /format.*may.*not.*be.*standard/i,
        /optional.*field.*missing/i,
        /unusual.*value.*detected/i,
        /confidence.*below.*threshold/i
      ]
    };
  }
  
  /**
   * Classifies an error message into semantic categories
   * @param {string} errorMessage - The error message to classify
   * @returns {Object} Classification result
   */
  classifyError(errorMessage) {
    if (!errorMessage || typeof errorMessage !== 'string') {
      return {
        type: this.errorTypes.FATAL,
        reason: 'Invalid error message',
        confidenceImpact: 1.0,
        shouldAbort: true,
        allowSave: false
      };
    }
    
    // Check fatal patterns first
    for (const pattern of this.errorPatterns.fatal) {
      if (pattern.test(errorMessage)) {
        return {
          type: this.errorTypes.FATAL,
          reason: 'Critical system or data error',
          confidenceImpact: 1.0,
          shouldAbort: true,
          allowSave: false,
          requiresUserAction: false
        };
      }
    }
    
    // Check recoverable patterns
    for (const pattern of this.errorPatterns.recoverable) {
      if (pattern.test(errorMessage)) {
        return {
          type: this.errorTypes.RECOVERABLE,
          reason: 'Data quality issue requiring review',
          confidenceImpact: 0.3, // Significant confidence reduction
          shouldAbort: false,
          allowSave: false, // Must go through review
          requiresUserAction: true,
          forceReview: true
        };
      }
    }
    
    // Check warning patterns
    for (const pattern of this.errorPatterns.warning) {
      if (pattern.test(errorMessage)) {
        return {
          type: this.errorTypes.WARNING,
          reason: 'Minor issue, extraction can continue',
          confidenceImpact: 0.05, // Minimal confidence reduction
          shouldAbort: false,
          allowSave: true,
          requiresUserAction: false,
          forceReview: false
        };
      }
    }
    
    // Default to recoverable for unknown errors
    return {
      type: this.errorTypes.RECOVERABLE,
      reason: 'Unknown error type, requires review',
      confidenceImpact: 0.2,
      shouldAbort: false,
      allowSave: false,
      requiresUserAction: true,
      forceReview: true
    };
  }
  
  /**
   * Classifies multiple errors and determines overall action
   * @param {Array<string>} errors - Array of error messages
   * @returns {Object} Overall classification result
   */
  classifyErrors(errors) {
    if (!errors || !Array.isArray(errors) || errors.length === 0) {
      return {
        overallType: this.errorTypes.WARNING,
        shouldAbort: false,
        allowSave: true,
        forceReview: false,
        totalConfidenceImpact: 0,
        classifications: []
      };
    }
    
    const classifications = errors.map(error => ({
      message: error,
      ...this.classifyError(error)
    }));
    
    // Determine overall action based on worst error type
    const hasFatal = classifications.some(c => c.type === this.errorTypes.FATAL);
    const hasRecoverable = classifications.some(c => c.type === this.errorTypes.RECOVERABLE);
    
    let overallType;
    let shouldAbort = false;
    let allowSave = true;
    let forceReview = false;
    
    if (hasFatal) {
      overallType = this.errorTypes.FATAL;
      shouldAbort = true;
      allowSave = false;
      forceReview = false; // Can't review if fatal
    } else if (hasRecoverable) {
      overallType = this.errorTypes.RECOVERABLE;
      shouldAbort = false;
      allowSave = false; // Must go through review first
      forceReview = true;
    } else {
      overallType = this.errorTypes.WARNING;
      shouldAbort = false;
      allowSave = true;
      forceReview = false;
    }
    
    // Calculate total confidence impact
    const totalConfidenceImpact = classifications.reduce(
      (sum, c) => sum + c.confidenceImpact, 0
    );
    
    return {
      overallType,
      shouldAbort,
      allowSave,
      forceReview,
      totalConfidenceImpact: Math.min(totalConfidenceImpact, 1.0), // Cap at 100%
      classifications,
      summary: {
        fatal: classifications.filter(c => c.type === this.errorTypes.FATAL).length,
        recoverable: classifications.filter(c => c.type === this.errorTypes.RECOVERABLE).length,
        warning: classifications.filter(c => c.type === this.errorTypes.WARNING).length
      }
    };
  }
  
  /**
   * Validates depth values and classifies issues
   * @param {number} depth - Depth value to validate
   * @param {string} unit - Depth unit (ft, feet, meters, m)
   * @returns {Object} Validation result
   */
  validateDepth(depth, unit = 'ft') {
    const errors = [];
    
    // Check for valid numeric value
    if (typeof depth !== 'number' || isNaN(depth)) {
      errors.push('Invalid depth value: not a number');
    } else {
      // Check for reasonable depth ranges
      const normalizedDepth = this.normalizeDepth(depth, unit);
      
      if (normalizedDepth < 0) {
        errors.push('Invalid depth value: negative depth not allowed');
      } else if (normalizedDepth > 1000) { // 1000 feet max
        errors.push('Invalid depth value: exceeds maximum reasonable depth (1000 ft)');
      } else if (normalizedDepth > 500) {
        errors.push('Unusual value detected: depth exceeds 500 feet');
      }
      
      // Check for floating point precision issues
      if (depth % 0.01 !== 0 && Math.abs(depth - Math.round(depth * 100) / 100) > 0.001) {
        errors.push('Minor rounding difference in depth value');
      }
    }
    
    return this.classifyErrors(errors);
  }
  
  /**
   * Normalizes depth to feet for comparison
   * @param {number} depth - Depth value
   * @param {string} unit - Unit (ft, feet, meters, m)
   * @returns {number} Depth in feet
   */
  normalizeDepth(depth, unit) {
    const normalizedUnit = (unit || 'ft').toLowerCase().trim();
    
    switch (normalizedUnit) {
      case 'm':
      case 'meter':
      case 'meters':
        return depth * 3.28084; // Convert meters to feet
      case 'ft':
      case 'feet':
      case 'foot':
      default:
        return depth;
    }
  }
  
  /**
   * Validates material name and classifies issues
   * @param {string} material - Material name to validate
   * @returns {Object} Validation result
   */
  validateMaterial(material) {
    const errors = [];
    
    if (!material || typeof material !== 'string') {
      errors.push('Missing required field: material');
    } else {
      const cleaned = material.trim();
      
      if (cleaned.length === 0) {
        errors.push('Missing required field: material');
      } else if (cleaned.length > 100) {
        errors.push('Invalid material: name too long (max 100 characters)');
      } else if (!/^[a-zA-Z0-9\s\-_.,()]+$/.test(cleaned)) {
        errors.push('Ambiguous material: contains invalid characters');
      }
    }
    
    return this.classifyErrors(errors);
  }
  
  /**
   * Creates a user-friendly error report
   * @param {Object} classification - Error classification result
   * @returns {Object} User-friendly report
   */
  createErrorReport(classification) {
    const { overallType, shouldAbort, allowSave, forceReview, summary } = classification;
    
    let title, message, actions;
    
    switch (overallType) {
      case this.errorTypes.FATAL:
        title = 'Extraction Failed';
        message = 'Critical errors prevent data extraction. Please check the file and try again.';
        actions = ['Close', 'Try Different File'];
        break;
        
      case this.errorTypes.RECOVERABLE:
        title = 'Review Required';
        message = 'Data quality issues detected. Please review and correct the extracted data before saving.';
        actions = ['Review Data', 'Cancel'];
        break;
        
      case this.errorTypes.WARNING:
        title = 'Extraction Complete with Warnings';
        message = 'Minor issues detected but extraction was successful. You may save or review the data.';
        actions = ['Save', 'Review Data', 'Cancel'];
        break;
        
      default:
        title = 'Unknown Status';
        message = 'Unable to determine extraction status.';
        actions = ['Close'];
    }
    
    return {
      title,
      message,
      actions,
      severity: overallType,
      canSave: allowSave,
      mustReview: forceReview,
      shouldAbort,
      errorCounts: summary
    };
  }
}

// Export for both browser and Node.js environments
if (typeof window !== 'undefined') {
  window.ErrorClassifier = ErrorClassifier;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { ErrorClassifier };
}