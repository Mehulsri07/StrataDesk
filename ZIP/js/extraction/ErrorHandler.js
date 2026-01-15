/**
 * ErrorHandler - Semantic error classification system for strata extraction
 * Provides strict error semantics: Fatal, Recoverable, Warning
 * 
 * Feature: strata-chart-extraction
 * Requirements: 6.1, 6.2, 6.3
 */

class ErrorHandler {
  constructor() {
    // Semantic error classifications
    this.ERROR_SEVERITY = {
      FATAL: 'fatal',           // Abort extraction, no save possible
      RECOVERABLE: 'recoverable', // Force review + downgrade confidence
      WARNING: 'warning'        // Log only, no behavior change
    };
    
    this.errorTypes = {
      // FATAL errors - abort extraction
      DEPTH_DETECTION_FAILED: { 
        type: 'depth_detection_failed', 
        severity: this.ERROR_SEVERITY.FATAL,
        message: 'Cannot proceed without depth information'
      },
      UNSUPPORTED_FORMAT: { 
        type: 'unsupported_format', 
        severity: this.ERROR_SEVERITY.FATAL,
        message: 'File format cannot be processed'
      },
      FILE_CORRUPTED: { 
        type: 'file_corrupted', 
        severity: this.ERROR_SEVERITY.FATAL,
        message: 'File is unreadable or corrupted'
      },
      INSUFFICIENT_DATA: { 
        type: 'insufficient_data', 
        severity: this.ERROR_SEVERITY.FATAL,
        message: 'Not enough data to create valid strata layers'
      },
      SCHEMA_VALIDATION_FAILED: {
        type: 'schema_validation_failed',
        severity: this.ERROR_SEVERITY.FATAL,
        message: 'Data does not conform to required schema'
      },
      
      // RECOVERABLE errors - force review, downgrade confidence
      MATERIAL_IDENTIFICATION_FAILED: { 
        type: 'material_identification_failed', 
        severity: this.ERROR_SEVERITY.RECOVERABLE,
        message: 'Some materials could not be identified automatically'
      },
      PARSING_ERROR: { 
        type: 'parsing_error', 
        severity: this.ERROR_SEVERITY.RECOVERABLE,
        message: 'Partial parsing errors occurred'
      },
      VALIDATION_ERROR: { 
        type: 'validation_error', 
        severity: this.ERROR_SEVERITY.RECOVERABLE,
        message: 'Data validation issues found'
      },
      CONFIDENCE_TOO_LOW: { 
        type: 'confidence_too_low', 
        severity: this.ERROR_SEVERITY.RECOVERABLE,
        message: 'Extraction confidence is below threshold'
      },
      DEPTH_UNIT_INCONSISTENCY: {
        type: 'depth_unit_inconsistency',
        severity: this.ERROR_SEVERITY.RECOVERABLE,
        message: 'Inconsistent depth units detected'
      },
      
      // WARNING errors - log only
      MINOR_FORMATTING_ISSUES: {
        type: 'minor_formatting_issues',
        severity: this.ERROR_SEVERITY.WARNING,
        message: 'Minor formatting inconsistencies detected'
      },
      METADATA_INCOMPLETE: {
        type: 'metadata_incomplete',
        severity: this.ERROR_SEVERITY.WARNING,
        message: 'Some optional metadata is missing'
      }
    };
  }

  /**
   * Create a semantic error with strict classification
   * @param {string} errorTypeKey - Key from this.errorTypes
   * @param {Object} context - Error context information
   * @returns {Object} Semantic error object
   */
  createSemanticError(errorTypeKey, context) {
    context = context || {};
    const errorDef = this.errorTypes[errorTypeKey];
    if (!errorDef) {
      throw new Error(`Unknown error type: ${errorTypeKey}`);
    }
    
    const error = {
      type: errorDef.type,
      severity: errorDef.severity,
      message: errorDef.message,
      context: context,
      timestamp: new Date().toISOString(),
      
      // Semantic behavior flags
      shouldAbort: errorDef.severity === this.ERROR_SEVERITY.FATAL,
      shouldForceReview: errorDef.severity === this.ERROR_SEVERITY.RECOVERABLE,
      shouldDowngradeConfidence: errorDef.severity === this.ERROR_SEVERITY.RECOVERABLE,
      shouldLogOnly: errorDef.severity === this.ERROR_SEVERITY.WARNING,
      
      // Recovery actions
      canRetry: this.canRetry(errorTypeKey),
      requiresManualIntervention: this.requiresManualIntervention(errorTypeKey),
      fallbackAvailable: this.hasFallback(errorTypeKey)
    };
    
    // Add specific details based on error type
    this.enrichErrorWithDetails(error, errorTypeKey, context);
    
    return error;
  }

  /**
   * Process extraction result and classify all errors semantically
   * @param {Object} extractionResult - Result from extraction process
   * @returns {Object} Processed result with semantic error classification
   */
  processExtractionResult(extractionResult) {
    const errors = extractionResult.errors || [];
    const warnings = extractionResult.warnings || [];
    const chart = extractionResult.chart;
    const confidence = extractionResult.confidence;
    
    const processedResult = {
      ...extractionResult,
      semanticErrors: {
        fatal: [],
        recoverable: [],
        warnings: []
      },
      canProceed: true,
      mustForceReview: false,
      confidenceAdjustment: 0,
      recommendedAction: 'proceed'
    };
    
    // Process each error semantically
    [...errors, ...warnings].forEach(errorMsg => {
      const semanticError = this.classifyError(errorMsg, extractionResult);
      
      switch (semanticError.severity) {
        case this.ERROR_SEVERITY.FATAL:
          processedResult.semanticErrors.fatal.push(semanticError);
          processedResult.canProceed = false;
          processedResult.recommendedAction = 'abort';
          break;
          
        case this.ERROR_SEVERITY.RECOVERABLE:
          processedResult.semanticErrors.recoverable.push(semanticError);
          processedResult.mustForceReview = true;
          processedResult.confidenceAdjustment -= 0.2; // Downgrade confidence
          if (processedResult.recommendedAction !== 'abort') {
            processedResult.recommendedAction = 'review_required';
          }
          break;
          
        case this.ERROR_SEVERITY.WARNING:
          processedResult.semanticErrors.warnings.push(semanticError);
          // No behavior change for warnings
          break;
      }
    });
    
    // Apply confidence adjustment
    if (processedResult.confidenceAdjustment < 0 && confidence) {
      const adjustedScore = Math.max(0, confidence.score + processedResult.confidenceAdjustment);
      processedResult.confidence = {
        ...confidence,
        score: adjustedScore,
        level: this.getConfidenceLevel(adjustedScore),
        adjustedForErrors: true
      };
    }
    
    // Enforce semantic rules
    this.enforceSemanticRules(processedResult);
    
    return processedResult;
  }

  /**
   * Classify a raw error message into semantic categories
   * @param {string} errorMsg - Raw error message
   * @param {Object} context - Extraction context
   * @returns {Object} Semantic error object
   */
  classifyError(errorMsg, context) {
    context = context || {};
    const msg = errorMsg.toLowerCase();
    
    // Fatal error patterns
    if (msg.includes('depth') && (msg.includes('not found') || msg.includes('failed'))) {
      return this.createSemanticError('DEPTH_DETECTION_FAILED', { originalMessage: errorMsg });
    }
    
    if (msg.includes('unsupported') || msg.includes('format')) {
      return this.createSemanticError('UNSUPPORTED_FORMAT', { originalMessage: errorMsg });
    }
    
    if (msg.includes('corrupted') || msg.includes('cannot read') || msg.includes('parse error')) {
      return this.createSemanticError('FILE_CORRUPTED', { originalMessage: errorMsg });
    }
    
    if (msg.includes('insufficient') || msg.includes('no data') || msg.includes('empty')) {
      return this.createSemanticError('INSUFFICIENT_DATA', { originalMessage: errorMsg });
    }
    
    if (msg.includes('schema') && msg.includes('validation')) {
      return this.createSemanticError('SCHEMA_VALIDATION_FAILED', { originalMessage: errorMsg });
    }
    
    // Recoverable error patterns
    if (msg.includes('material') && (msg.includes('not found') || msg.includes('failed'))) {
      return this.createSemanticError('MATERIAL_IDENTIFICATION_FAILED', { originalMessage: errorMsg });
    }
    
    if (msg.includes('confidence') && msg.includes('low')) {
      return this.createSemanticError('CONFIDENCE_TOO_LOW', { originalMessage: errorMsg });
    }
    
    if (msg.includes('validation') && !msg.includes('schema')) {
      return this.createSemanticError('VALIDATION_ERROR', { originalMessage: errorMsg });
    }
    
    if (msg.includes('unit') && (msg.includes('inconsistent') || msg.includes('mismatch'))) {
      return this.createSemanticError('DEPTH_UNIT_INCONSISTENCY', { originalMessage: errorMsg });
    }
    
    // Warning patterns
    if (msg.includes('formatting') || msg.includes('minor')) {
      return this.createSemanticError('MINOR_FORMATTING_ISSUES', { originalMessage: errorMsg });
    }
    
    if (msg.includes('metadata') && msg.includes('missing')) {
      return this.createSemanticError('METADATA_INCOMPLETE', { originalMessage: errorMsg });
    }
    
    // Default to recoverable if we can't classify
    return this.createSemanticError('PARSING_ERROR', { 
      originalMessage: errorMsg,
      note: 'Unclassified error - defaulting to recoverable'
    });
  }

  /**
   * Enforce semantic rules on processed result
   * @param {Object} processedResult - Result to enforce rules on
   */
  enforceSemanticRules(processedResult) {
    // Rule 1: Fatal errors always abort, no exceptions
    if (processedResult.semanticErrors.fatal.length > 0) {
      processedResult.canProceed = false;
      processedResult.recommendedAction = 'abort';
      processedResult.mustForceReview = false; // Can't review if aborting
    }
    
    // Rule 2: Any recovery action must reduce confidence
    if (processedResult.semanticErrors.recoverable.length > 0) {
      processedResult.mustForceReview = true;
      if (processedResult.confidenceAdjustment >= 0) {
        processedResult.confidenceAdjustment = -0.1; // Minimum penalty
      }
    }
    
    // Rule 3: Partial extraction must never auto-save
    if (processedResult.mustForceReview) {
      processedResult.autoSaveAllowed = false;
    } else {
      processedResult.autoSaveAllowed = true;
    }
    
    // Rule 4: Ambiguous data must not silently pass
    const hasAmbiguousData = processedResult.semanticErrors.recoverable.some(error => 
      error.type.includes('confidence') || error.type.includes('identification')
    );
    
    if (hasAmbiguousData && !processedResult.mustForceReview) {
      throw new Error('SEMANTIC RULE VIOLATION: Ambiguous data cannot bypass review');
    }
  }

  /**
   * Normalize depth values with strict validation
   * @param {number} depth - Raw depth value
   * @param {string} unit - Depth unit
   * @returns {Object} Normalized depth result
   */
  normalizeDepth(depth, unit) {
    unit = unit || 'feet';
    // Reject absurd values immediately
    if (!isFinite(depth) || isNaN(depth)) {
      return {
        success: false,
        error: this.createSemanticError('VALIDATION_ERROR', {
          message: 'Depth value is not a valid number',
          value: depth
        })
      };
    }
    
    if (depth < 0) {
      return {
        success: false,
        error: this.createSemanticError('VALIDATION_ERROR', {
          message: 'Depth cannot be negative',
          value: depth
        })
      };
    }
    
    if (depth > 10000) { // Reasonable maximum depth
      return {
        success: false,
        error: this.createSemanticError('VALIDATION_ERROR', {
          message: 'Depth exceeds reasonable maximum (10,000 units)',
          value: depth
        })
      };
    }
    
    // Normalize units to feet
    let normalizedDepth = depth;
    const normalizedUnit = 'feet';
    
    if (unit && (unit.toLowerCase().includes('m') || unit.toLowerCase() === 'meters')) {
      normalizedDepth = depth * 3.28084; // Convert meters to feet
    }
    
    // Round to reasonable precision (2 decimal places)
    normalizedDepth = Math.round(normalizedDepth * 100) / 100;
    
    return {
      success: true,
      depth: normalizedDepth,
      unit: normalizedUnit,
      originalDepth: depth,
      originalUnit: unit
    };
  }

  /**
   * Sanitize material name with strict validation
   * @param {string} material - Raw material name
   * @returns {Object} Sanitized material result
   */
  sanitizeMaterial(material) {
    if (!material || typeof material !== 'string') {
      return {
        success: false,
        error: this.createSemanticError('VALIDATION_ERROR', {
          message: 'Material name must be a non-empty string',
          value: material
        })
      };
    }
    
    // Remove invalid characters and normalize
    const sanitized = material
      .trim()
      .replace(/[^\w\s\-\.]/g, '') // Remove special chars except word chars, spaces, hyphens, dots
      .replace(/\s+/g, ' ') // Normalize whitespace
      .toLowerCase();
    
    if (sanitized.length === 0) {
      return {
        success: false,
        error: this.createSemanticError('VALIDATION_ERROR', {
          message: 'Material name cannot be empty after sanitization',
          original: material
        })
      };
    }
    
    if (sanitized.length > 100) {
      return {
        success: false,
        error: this.createSemanticError('VALIDATION_ERROR', {
          message: 'Material name too long (max 100 characters)',
          length: sanitized.length
        })
      };
    }
    
    return {
      success: true,
      material: sanitized,
      original: material
    };
  }

  /**
   * Helper methods for error classification
   */
  canRetry(errorTypeKey) {
    const retryableErrors = ['FILE_CORRUPTED', 'PARSING_ERROR'];
    return retryableErrors.includes(errorTypeKey);
  }

  requiresManualIntervention(errorTypeKey) {
    const manualErrors = ['MATERIAL_IDENTIFICATION_FAILED', 'CONFIDENCE_TOO_LOW', 'VALIDATION_ERROR'];
    return manualErrors.includes(errorTypeKey);
  }

  hasFallback(errorTypeKey) {
    const fatalErrors = ['UNSUPPORTED_FORMAT', 'SCHEMA_VALIDATION_FAILED'];
    return !fatalErrors.includes(errorTypeKey);
  }

  getConfidenceLevel(score) {
    if (score >= 0.8) return 'high';
    if (score >= 0.5) return 'medium';
    return 'low';
  }

  enrichErrorWithDetails(error, errorTypeKey, context) {
    // Add specific guidance based on error type
    switch (errorTypeKey) {
      case 'DEPTH_DETECTION_FAILED':
        error.guidance = [
          'Ensure depth values are in a clearly labeled column',
          'Use consistent numeric format for all depth values',
          'Check that depth increments are regular and logical'
        ];
        break;
        
      case 'MATERIAL_IDENTIFICATION_FAILED':
        error.guidance = [
          'Review extracted layers and add missing material names',
          'Use standard geological terminology',
          'Ensure material information is in text format, not just colors'
        ];
        break;
        
      case 'CONFIDENCE_TOO_LOW':
        error.guidance = [
          'Carefully review all extracted data before saving',
          'Consider using manual entry for critical accuracy',
          'Verify source data quality and clarity'
        ];
        break;
    }
  }

  /**
   * Create specific error message for depth detection failures
   * @param {Object} context - Error context information
   * @returns {Object} Formatted error message
   */
  createDepthDetectionError(context) {
    context = context || {};
    const { filename, attemptedColumns, fileType } = context;
    
    const baseMessage = 'Unable to detect depth information in the file';
    const details = [];
    
    if (fileType === 'excel') {
      details.push('• No column containing depth values was found');
      details.push('• Depth columns should contain numeric values in sequence (e.g., 0, 5, 10, 15...)');
      details.push('• Common depth column headers: "Depth", "Depth (ft)", "Depth (m)", "From", "To"');
      
      if (attemptedColumns && attemptedColumns.length > 0) {
        details.push(`• Checked columns: ${attemptedColumns.join(', ')}`);
      }
      
      details.push('• Ensure depth values are in a single column with consistent increments');
    } else if (fileType === 'pdf') {
      details.push('• No readable depth scale was found in the PDF');
      details.push('• Depth labels should be clearly visible and not obscured');
      details.push('• Common depth formats: "0 ft", "5\'", "10 feet", "0 m", "5 meters"');
      details.push('• Ensure the PDF is not a scanned image without text layer');
    }
    
    return {
      type: this.errorTypes.DEPTH_DETECTION_FAILED,
      title: 'Depth Detection Failed',
      message: baseMessage,
      details: details,
      filename: filename || 'Unknown file',
      suggestions: this.getDepthDetectionSuggestions(fileType),
      canRetry: true,
      fallbackAvailable: true
    };
  }

  /**
   * Create specific error message for material identification failures
   * @param {Object} context - Error context information
   * @returns {Object} Formatted error message
   */
  createMaterialIdentificationError(context) {
    context = context || {};
    const { filename, layersFound, layersFailed, fileType } = context;
    
    const baseMessage = layersFailed && layersFound 
      ? `Could not identify materials for ${layersFailed} out of ${layersFound} layers`
      : 'Unable to identify material types in the strata chart';
    
    const details = [];
    
    if (fileType === 'excel') {
      details.push('• No column containing material names was found');
      details.push('• Material columns should contain text descriptions of geological materials');
      details.push('• Common materials: Clay, Sand, Gravel, Rock, Limestone, Sandstone, Silt');
      details.push('• Material information can be in text or background colors');
      
      if (layersFailed && layersFound) {
        details.push(`• Successfully identified ${layersFound - layersFailed} layers`);
        details.push(`• Failed to identify ${layersFailed} layers`);
      }
    } else if (fileType === 'pdf') {
      details.push('• Material text could not be read from the PDF');
      details.push('• Ensure material names are clearly visible and not in images');
      details.push('• Text should not be rotated or in unusual fonts');
      details.push('• Colored regions should have readable text labels');
    }
    
    return {
      type: this.errorTypes.MATERIAL_IDENTIFICATION_FAILED,
      title: 'Material Identification Failed',
      message: baseMessage,
      details: details,
      filename: filename || 'Unknown file',
      suggestions: this.getMaterialIdentificationSuggestions(fileType),
      canRetry: false,
      fallbackAvailable: true,
      partialSuccess: layersFailed && layersFound && (layersFound - layersFailed) > 0
    };
  }

  /**
   * Create error message for unsupported file formats
   * @param {Object} context - Error context information
   * @returns {Object} Formatted error message
   */
  createUnsupportedFormatError(context) {
    context = context || {};
    const { filename, fileType, detectedType } = context;
    
    const baseMessage = 'File format is not supported for strata extraction';
    const details = [
      '• Supported formats: Excel (.xlsx, .xls) and PDF (.pdf)',
      '• Excel files should contain strata chart data in tabular format',
      '• PDF files should contain readable text and depth scales',
      '• Scanned images without text layers are not supported'
    ];
    
    if (detectedType) {
      details.unshift(`• Detected file type: ${detectedType}`);
    }
    
    if (fileType && !['excel', 'pdf'].includes(fileType)) {
      details.unshift(`• Attempted to process as: ${fileType}`);
    }
    
    return {
      type: this.errorTypes.UNSUPPORTED_FORMAT,
      title: 'Unsupported File Format',
      message: baseMessage,
      details: details,
      filename: filename || 'Unknown file',
      suggestions: this.getFormatSuggestions(),
      canRetry: false,
      fallbackAvailable: true
    };
  }

  /**
   * Create error message for file corruption or parsing issues
   * @param {Object} context - Error context information
   * @returns {Object} Formatted error message
   */
  createFileCorruptedError(context) {
    context = context || {};
    const { filename, fileType, originalError } = context;
    
    const baseMessage = 'File appears to be corrupted or cannot be read';
    const details = [];
    
    if (fileType === 'excel') {
      details.push('• Excel file structure may be damaged');
      details.push('• Try opening the file in Excel to verify it works');
      details.push('• Re-save the file as a new .xlsx file');
      details.push('• Ensure the file is not password protected');
    } else if (fileType === 'pdf') {
      details.push('• PDF file may be corrupted or encrypted');
      details.push('• Try opening the file in a PDF viewer to verify it works');
      details.push('• Ensure the PDF is not password protected');
      details.push('• Re-export or re-save the PDF if possible');
    }
    
    if (originalError) {
      details.push(`• Technical error: ${originalError.message || originalError}`);
    }
    
    return {
      type: this.errorTypes.FILE_CORRUPTED,
      title: 'File Cannot Be Read',
      message: baseMessage,
      details: details,
      filename: filename || 'Unknown file',
      suggestions: this.getFileCorruptionSuggestions(fileType),
      canRetry: true,
      fallbackAvailable: true
    };
  }

  /**
   * Create error message for insufficient data
   * @param {Object} context - Error context information
   * @returns {Object} Formatted error message
   */
  createInsufficientDataError(context) {
    context = context || {};
    const { filename, dataFound, dataRequired, fileType } = context;
    
    const baseMessage = 'Insufficient data found to create strata layers';
    const details = [];
    
    if (dataFound && dataRequired) {
      details.push(`• Found: ${dataFound}`);
      details.push(`• Required: ${dataRequired}`);
    }
    
    if (fileType === 'excel') {
      details.push('• Need at least depth and material information');
      details.push('• Ensure the spreadsheet contains actual strata data');
      details.push('• Check that data is in the expected format');
    } else if (fileType === 'pdf') {
      details.push('• Need readable depth scale and material information');
      details.push('• Ensure the PDF contains a complete strata chart');
      details.push('• Check that text is selectable (not just an image)');
    }
    
    return {
      type: this.errorTypes.INSUFFICIENT_DATA,
      title: 'Insufficient Data',
      message: baseMessage,
      details: details,
      filename: filename || 'Unknown file',
      suggestions: this.getInsufficientDataSuggestions(fileType),
      canRetry: false,
      fallbackAvailable: true
    };
  }

  /**
   * Create error message for low confidence extractions
   * @param {Object} context - Error context information
   * @returns {Object} Formatted error message
   */
  createLowConfidenceError(context) {
    context = context || {};
    const { filename, confidenceLevel, threshold, layersAffected } = context;
    
    const baseMessage = 'Extraction confidence is too low for reliable results';
    const details = [
      `• Current confidence: ${confidenceLevel || 'Unknown'}`,
      `• Minimum required: ${threshold || 'Medium'}`,
      '• Low confidence may indicate unclear or ambiguous data'
    ];
    
    if (layersAffected) {
      details.push(`• ${layersAffected} layers have low confidence`);
    }
    
    details.push('• You can proceed with manual review and editing');
    details.push('• Consider using manual entry for better accuracy');
    
    return {
      type: this.errorTypes.CONFIDENCE_TOO_LOW,
      title: 'Low Extraction Confidence',
      message: baseMessage,
      details: details,
      filename: filename || 'Unknown file',
      suggestions: this.getLowConfidenceSuggestions(),
      canRetry: false,
      fallbackAvailable: true,
      isWarning: true
    };
  }

  /**
   * Get suggestions for depth detection issues
   * @param {string} fileType - Type of file being processed
   * @returns {Array<string>} Array of suggestion strings
   */
  getDepthDetectionSuggestions(fileType) {
    const suggestions = [
      'Use manual entry instead of automatic extraction',
      'Check the file format and ensure it contains strata data'
    ];
    
    if (fileType === 'excel') {
      suggestions.unshift(
        'Ensure depth values are in a single column with clear headers',
        'Use consistent depth increments (e.g., every 5 feet)',
        'Place depth data in the first few columns of the spreadsheet'
      );
    } else if (fileType === 'pdf') {
      suggestions.unshift(
        'Ensure the PDF has selectable text (not just an image)',
        'Check that depth labels are clearly visible',
        'Try converting the PDF to Excel format first'
      );
    }
    
    return suggestions;
  }

  /**
   * Get suggestions for material identification issues
   * @param {string} fileType - Type of file being processed
   * @returns {Array<string>} Array of suggestion strings
   */
  getMaterialIdentificationSuggestions(fileType) {
    const suggestions = [
      'Use manual entry to specify materials for each layer',
      'Review the extracted data and add missing materials manually'
    ];
    
    if (fileType === 'excel') {
      suggestions.unshift(
        'Ensure material names are in text format, not just colors',
        'Use standard geological terms (Clay, Sand, Rock, etc.)',
        'Place material data adjacent to depth information'
      );
    } else if (fileType === 'pdf') {
      suggestions.unshift(
        'Ensure material labels are readable text, not just colors',
        'Check that text is not rotated or in unusual fonts',
        'Try converting the PDF to Excel format first'
      );
    }
    
    return suggestions;
  }

  /**
   * Get suggestions for format issues
   * @returns {Array<string>} Array of suggestion strings
   */
  getFormatSuggestions() {
    return [
      'Convert your data to Excel (.xlsx) format',
      'Ensure PDF files have selectable text layers',
      'Use supported file formats: .xlsx, .xls, or .pdf',
      'Check that the file is not corrupted',
      'Try manual entry if automatic extraction is not possible'
    ];
  }

  /**
   * Get suggestions for file corruption issues
   * @param {string} fileType - Type of file being processed
   * @returns {Array<string>} Array of suggestion strings
   */
  getFileCorruptionSuggestions(fileType) {
    const suggestions = [
      'Try uploading the file again',
      'Check that the file is not corrupted by opening it in its native application',
      'Use manual entry as an alternative'
    ];
    
    if (fileType === 'excel') {
      suggestions.unshift(
        'Open the file in Excel and re-save it as a new .xlsx file',
        'Remove any password protection from the file'
      );
    } else if (fileType === 'pdf') {
      suggestions.unshift(
        'Open the file in a PDF viewer to verify it works',
        'Re-export the PDF from its original source if possible'
      );
    }
    
    return suggestions;
  }

  /**
   * Get suggestions for insufficient data issues
   * @param {string} fileType - Type of file being processed
   * @returns {Array<string>} Array of suggestion strings
   */
  getInsufficientDataSuggestions(fileType) {
    const suggestions = [
      'Verify that the file contains complete strata chart data',
      'Use manual entry to input the strata information',
      'Check that both depth and material information are present'
    ];
    
    if (fileType === 'excel') {
      suggestions.unshift(
        'Ensure the spreadsheet has both depth and material columns',
        'Check that data starts from the correct row (not just headers)'
      );
    } else if (fileType === 'pdf') {
      suggestions.unshift(
        'Ensure the PDF contains a complete strata chart with depth scale',
        'Check that the chart is not just a partial view or legend'
      );
    }
    
    return suggestions;
  }

  /**
   * Get suggestions for low confidence issues
   * @returns {Array<string>} Array of suggestion strings
   */
  getLowConfidenceSuggestions() {
    return [
      'Proceed with the extraction and review/edit the results manually',
      'Use manual entry for better accuracy',
      'Check the source file for clarity and completeness',
      'Consider improving the source data quality before re-attempting extraction'
    ];
  }

  /**
   * Format error for display in UI
   * @param {Object} error - Error object from create methods
   * @returns {string} HTML formatted error message
   */
  formatErrorForDisplay(error) {
    let html = `
      <div class="extraction-error">
        <div class="error-header">
          <h4 class="error-title">${error.title}</h4>
          <span class="error-filename">${error.filename}</span>
        </div>
        <div class="error-message">${error.message}</div>
    `;
    
    if (error.details && error.details.length > 0) {
      html += `
        <div class="error-details">
          <h5>Details:</h5>
          <ul>
            ${error.details.map(detail => `<li>${detail}</li>`).join('')}
          </ul>
        </div>
      `;
    }
    
    if (error.suggestions && error.suggestions.length > 0) {
      html += `
        <div class="error-suggestions">
          <h5>Suggestions:</h5>
          <ul>
            ${error.suggestions.map(suggestion => `<li>${suggestion}</li>`).join('')}
          </ul>
        </div>
      `;
    }
    
    html += '</div>';
    return html;
  }

  /**
   * Create a comprehensive error report
   * @param {Array<Object>} errors - Array of error objects
   * @returns {Object} Comprehensive error report
   */
  createErrorReport(errors) {
    const report = {
      totalErrors: errors.length,
      errorTypes: {},
      canRetry: false,
      fallbackAvailable: false,
      hasWarnings: false,
      hasPartialSuccess: false,
      summary: '',
      errors: errors
    };
    
    // Analyze error types
    errors.forEach(error => {
      if (!report.errorTypes[error.type]) {
        report.errorTypes[error.type] = 0;
      }
      report.errorTypes[error.type]++;
      
      if (error.canRetry) report.canRetry = true;
      if (error.fallbackAvailable) report.fallbackAvailable = true;
      if (error.isWarning) report.hasWarnings = true;
      if (error.partialSuccess) report.hasPartialSuccess = true;
    });
    
    // Generate summary
    if (errors.length === 1) {
      report.summary = errors[0].message;
    } else {
      report.summary = `${errors.length} issues found during extraction`;
    }
    
    return report;
  }

  /**
   * Get user-friendly error message for common scenarios
   * @param {string} errorType - Type of error
   * @param {Object} context - Additional context
   * @returns {string} User-friendly message
   */
  getUserFriendlyMessage(errorType, context) {
    context = context || {};
    const messages = {
      [this.errorTypes.DEPTH_DETECTION_FAILED]: 'Could not find depth information in your file. Please check that depth values are clearly labeled.',
      [this.errorTypes.MATERIAL_IDENTIFICATION_FAILED]: 'Could not identify all material types. You can review and edit the results manually.',
      [this.errorTypes.UNSUPPORTED_FORMAT]: 'This file format is not supported. Please use Excel (.xlsx) or PDF files.',
      [this.errorTypes.FILE_CORRUPTED]: 'The file appears to be corrupted or cannot be read. Please try uploading again.',
      [this.errorTypes.INSUFFICIENT_DATA]: 'Not enough data found to create strata layers. Please check your file contains complete strata information.',
      [this.errorTypes.CONFIDENCE_TOO_LOW]: 'Extraction confidence is low. You can proceed but may need to review and edit the results.'
    };
    
    return messages[errorType] || 'An error occurred during extraction. Please try again or use manual entry.';
  }
}

// Export for use in other modules
if (typeof window !== 'undefined') {
  window.ErrorHandler = ErrorHandler;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { 
    ErrorHandler,
    ExtractionErrorHandler: ErrorHandler  // Alias for backward compatibility
  };
}