/**
 * Fallback Manager - Handles extraction failures and provides recovery mechanisms
 * Implements manual entry fallback, partial extraction support, and graceful degradation
 */

class FallbackManager {
  constructor(dependencies = {}) {
    this.errorClassifier = dependencies.errorClassifier || null;
    this.reviewInterface = dependencies.reviewInterface || null;
    this.utils = dependencies.utils || null;
    
    // Fallback strategies
    this.strategies = {
      MANUAL_ENTRY: 'manual_entry',
      PARTIAL_EXTRACTION: 'partial_extraction',
      GUIDED_CORRECTION: 'guided_correction',
      TEMPLATE_BASED: 'template_based'
    };
    
    // Recovery state
    this.recoveryAttempts = new Map();
    this.maxRecoveryAttempts = 3;
    
    // Configuration
    this.config = {
      minConfidenceThreshold: 0.3,
      partialExtractionThreshold: 0.5,
      enableGuidedCorrection: true,
      enableTemplateMatching: true
    };
  }
  
  /**
   * Determines the appropriate fallback strategy based on error classification
   * @param {Object} extractionResult - Failed extraction result
   * @param {Object} errorClassification - Error classification from ErrorClassifier
   * @returns {Object} Fallback strategy recommendation
   */
  determineFallbackStrategy(extractionResult, errorClassification) {
    const strategy = {
      type: null,
      reason: '',
      actions: [],
      userGuidance: '',
      canRecover: false,
      estimatedEffort: 'unknown'
    };
    
    // Handle fatal errors - no recovery possible
    if (errorClassification.shouldAbort) {
      strategy.type = null;
      strategy.reason = 'Fatal error prevents any recovery';
      strategy.userGuidance = 'Please check the file format and try with a different file.';
      strategy.canRecover = false;
      strategy.estimatedEffort = 'none';
      return strategy;
    }
    
    // Analyze extraction confidence and completeness
    const confidence = extractionResult.confidence || 0;
    const hasPartialData = extractionResult.data && extractionResult.data.length > 0;
    const errorCount = errorClassification.classifications.length;
    
    // Strategy 1: Partial extraction with user review
    if (hasPartialData && confidence >= this.config.partialExtractionThreshold) {
      strategy.type = this.strategies.PARTIAL_EXTRACTION;
      strategy.reason = 'Some data was successfully extracted';
      strategy.actions = [
        'Review extracted data',
        'Manually add missing information',
        'Validate and save'
      ];
      strategy.userGuidance = `${extractionResult.data.length} items were extracted with ${(confidence * 100).toFixed(1)}% confidence. Please review and complete the missing data.`;
      strategy.canRecover = true;
      strategy.estimatedEffort = 'low';
      return strategy;
    }
    
    // Strategy 2: Guided correction for low confidence
    if (hasPartialData && confidence >= this.config.minConfidenceThreshold && this.config.enableGuidedCorrection) {
      strategy.type = this.strategies.GUIDED_CORRECTION;
      strategy.reason = 'Low confidence extraction requires user guidance';
      strategy.actions = [
        'Review uncertain extractions',
        'Correct identified issues',
        'Re-validate data'
      ];
      strategy.userGuidance = `Extraction completed with low confidence (${(confidence * 100).toFixed(1)}%). Please review and correct the highlighted issues.`;
      strategy.canRecover = true;
      strategy.estimatedEffort = 'medium';
      return strategy;
    }
    
    // Strategy 3: Template-based recovery
    if (this.config.enableTemplateMatching && this.canUseTemplateMatching(extractionResult)) {
      strategy.type = this.strategies.TEMPLATE_BASED;
      strategy.reason = 'File structure suggests template-based approach';
      strategy.actions = [
        'Apply template matching',
        'Map data to template fields',
        'Review mapped data'
      ];
      strategy.userGuidance = 'The file appears to follow a recognizable pattern. We can try to match it against known templates.';
      strategy.canRecover = true;
      strategy.estimatedEffort = 'medium';
      return strategy;
    }
    
    // Strategy 4: Manual entry fallback
    strategy.type = this.strategies.MANUAL_ENTRY;
    strategy.reason = 'Automatic extraction failed, manual entry required';
    strategy.actions = [
      'Open manual entry interface',
      'Enter data manually',
      'Use file as reference'
    ];
    strategy.userGuidance = 'Automatic extraction was not successful. You can enter the data manually while viewing the original file.';
    strategy.canRecover = true;
    strategy.estimatedEffort = 'high';
    
    return strategy;
  }
  
  /**
   * Executes the recommended fallback strategy
   * @param {Object} strategy - Fallback strategy from determineFallbackStrategy
   * @param {Object} context - Extraction context (file, original data, etc.)
   * @returns {Promise<Object>} Recovery result
   */
  async executeFallbackStrategy(strategy, context) {
    const recoveryId = this.generateRecoveryId();
    
    try {
      this.recordRecoveryAttempt(recoveryId, strategy.type);
      
      switch (strategy.type) {
        case this.strategies.PARTIAL_EXTRACTION:
          return await this.handlePartialExtraction(context, recoveryId);
          
        case this.strategies.GUIDED_CORRECTION:
          return await this.handleGuidedCorrection(context, recoveryId);
          
        case this.strategies.TEMPLATE_BASED:
          return await this.handleTemplateBasedRecovery(context, recoveryId);
          
        case this.strategies.MANUAL_ENTRY:
          return await this.handleManualEntry(context, recoveryId);
          
        default:
          throw new Error(`Unknown fallback strategy: ${strategy.type}`);
      }
    } catch (error) {
      this.recordRecoveryFailure(recoveryId, error);
      throw error;
    }
  }
  
  /**
   * Handles partial extraction recovery
   * @param {Object} context - Extraction context
   * @param {string} recoveryId - Recovery attempt ID
   * @returns {Promise<Object>} Recovery result
   */
  async handlePartialExtraction(context, recoveryId) {
    const result = {
      success: false,
      strategy: this.strategies.PARTIAL_EXTRACTION,
      recoveryId: recoveryId,
      data: null,
      userActions: [],
      nextSteps: []
    };
    
    try {
      // Prepare partial data for review
      const partialData = context.extractionResult.data || [];
      const confidence = context.extractionResult.confidence || 0;
      
      // Create review session with partial data
      const reviewSession = {
        id: recoveryId,
        type: 'partial_extraction',
        originalFile: context.file,
        extractedData: partialData,
        confidence: confidence,
        missingFields: this.identifyMissingFields(partialData),
        suggestedActions: [
          'Review extracted items for accuracy',
          'Add missing required fields',
          'Verify data completeness'
        ]
      };
      
      // If review interface is available, prepare it
      if (this.reviewInterface) {
        await this.reviewInterface.loadPartialData(reviewSession);
        result.userActions.push('Review interface opened with partial data');
      }
      
      result.success = true;
      result.data = reviewSession;
      result.nextSteps = [
        'User reviews partial data',
        'User completes missing information',
        'System validates completed data',
        'Data is saved if validation passes'
      ];
      
      return result;
      
    } catch (error) {
      result.error = error.message;
      return result;
    }
  }
  
  /**
   * Handles guided correction recovery
   * @param {Object} context - Extraction context
   * @param {string} recoveryId - Recovery attempt ID
   * @returns {Promise<Object>} Recovery result
   */
  async handleGuidedCorrection(context, recoveryId) {
    const result = {
      success: false,
      strategy: this.strategies.GUIDED_CORRECTION,
      recoveryId: recoveryId,
      data: null,
      corrections: [],
      nextSteps: []
    };
    
    try {
      const extractedData = context.extractionResult.data || [];
      const errors = context.errorClassification.classifications || [];
      
      // Identify specific corrections needed
      const corrections = this.generateCorrectionGuidance(extractedData, errors);
      
      // Create guided correction session
      const correctionSession = {
        id: recoveryId,
        type: 'guided_correction',
        originalFile: context.file,
        extractedData: extractedData,
        corrections: corrections,
        confidence: context.extractionResult.confidence || 0,
        priority: this.prioritizeCorrections(corrections)
      };
      
      // Prepare review interface with correction guidance
      if (this.reviewInterface) {
        await this.reviewInterface.loadCorrectionSession(correctionSession);
        result.userActions.push('Correction interface opened with guidance');
      }
      
      result.success = true;
      result.data = correctionSession;
      result.corrections = corrections;
      result.nextSteps = [
        'User follows correction guidance',
        'System validates each correction',
        'Confidence score updates in real-time',
        'Data is saved when confidence threshold is met'
      ];
      
      return result;
      
    } catch (error) {
      result.error = error.message;
      return result;
    }
  }
  
  /**
   * Handles template-based recovery
   * @param {Object} context - Extraction context
   * @param {string} recoveryId - Recovery attempt ID
   * @returns {Promise<Object>} Recovery result
   */
  async handleTemplateBasedRecovery(context, recoveryId) {
    const result = {
      success: false,
      strategy: this.strategies.TEMPLATE_BASED,
      recoveryId: recoveryId,
      data: null,
      template: null,
      nextSteps: []
    };
    
    try {
      // Attempt to match against known templates
      const templateMatch = await this.findBestTemplateMatch(context.file);
      
      if (!templateMatch) {
        throw new Error('No suitable template found');
      }
      
      // Apply template-based extraction
      const templateResult = await this.applyTemplate(context.file, templateMatch);
      
      result.success = true;
      result.data = templateResult.data;
      result.template = templateMatch;
      result.nextSteps = [
        'Template applied successfully',
        'User reviews template-mapped data',
        'User confirms or adjusts mappings',
        'Data is validated and saved'
      ];
      
      return result;
      
    } catch (error) {
      result.error = error.message;
      return result;
    }
  }
  
  /**
   * Handles manual entry fallback
   * @param {Object} context - Extraction context
   * @param {string} recoveryId - Recovery attempt ID
   * @returns {Promise<Object>} Recovery result
   */
  async handleManualEntry(context, recoveryId) {
    const result = {
      success: false,
      strategy: this.strategies.MANUAL_ENTRY,
      recoveryId: recoveryId,
      data: null,
      interface: null,
      nextSteps: []
    };
    
    try {
      // Create manual entry session
      const manualSession = {
        id: recoveryId,
        type: 'manual_entry',
        originalFile: context.file,
        fileName: context.file.name,
        fileSize: context.file.size,
        guidance: this.generateManualEntryGuidance(context),
        template: this.createEmptyTemplate()
      };
      
      // Open manual entry interface
      if (this.reviewInterface) {
        await this.reviewInterface.openManualEntry(manualSession);
        result.userActions.push('Manual entry interface opened');
      }
      
      result.success = true;
      result.data = manualSession;
      result.nextSteps = [
        'User enters data manually',
        'System provides real-time validation',
        'User can reference original file',
        'Data is saved when complete and valid'
      ];
      
      return result;
      
    } catch (error) {
      result.error = error.message;
      return result;
    }
  }
  
  /**
   * Checks if template matching is viable for the given extraction result
   * @param {Object} extractionResult - Failed extraction result
   * @returns {boolean} Whether template matching should be attempted
   */
  canUseTemplateMatching(extractionResult) {
    // Check if file has recognizable structure patterns
    if (!extractionResult.metadata) return false;
    
    const metadata = extractionResult.metadata;
    
    // Look for structured data indicators
    const hasHeaders = metadata.hasHeaders || false;
    const hasConsistentColumns = metadata.columnCount > 0;
    const hasRecognizableFormat = metadata.formatHints && metadata.formatHints.length > 0;
    
    return hasHeaders || hasConsistentColumns || hasRecognizableFormat;
  }
  
  /**
   * Identifies missing fields in partial extraction data
   * @param {Array} partialData - Partially extracted data
   * @returns {Array} List of missing required fields
   */
  identifyMissingFields(partialData) {
    const requiredFields = ['unitNumber', 'ownerName', 'ownershipPercentage'];
    const missingFields = [];
    
    partialData.forEach((item, index) => {
      const itemMissing = [];
      requiredFields.forEach(field => {
        if (!item[field] || item[field] === null || item[field] === undefined) {
          itemMissing.push(field);
        }
      });
      
      if (itemMissing.length > 0) {
        missingFields.push({
          itemIndex: index,
          missingFields: itemMissing
        });
      }
    });
    
    return missingFields;
  }
  
  /**
   * Generates correction guidance for guided correction
   * @param {Array} extractedData - Extracted data with issues
   * @param {Array} errors - Classification errors
   * @returns {Array} Correction guidance items
   */
  generateCorrectionGuidance(extractedData, errors) {
    const corrections = [];
    
    errors.forEach(error => {
      const correction = {
        type: error.type,
        message: error.message,
        severity: this.mapErrorToSeverity(error.type),
        suggestedAction: this.generateSuggestedAction(error),
        affectedItems: this.findAffectedItems(extractedData, error)
      };
      
      corrections.push(correction);
    });
    
    return corrections;
  }
  
  /**
   * Prioritizes corrections by severity and impact
   * @param {Array} corrections - List of corrections
   * @returns {Array} Prioritized corrections
   */
  prioritizeCorrections(corrections) {
    const severityOrder = { 'high': 3, 'medium': 2, 'low': 1 };
    
    return corrections.sort((a, b) => {
      const severityDiff = severityOrder[b.severity] - severityOrder[a.severity];
      if (severityDiff !== 0) return severityDiff;
      
      // Secondary sort by number of affected items
      return b.affectedItems.length - a.affectedItems.length;
    });
  }
  
  /**
   * Finds the best template match for a file
   * @param {File} file - File to match against templates
   * @returns {Promise<Object>} Best matching template or null
   */
  async findBestTemplateMatch(file) {
    // This would integrate with a template library
    // For now, return a mock template
    return {
      id: 'standard-strata-chart',
      name: 'Standard Strata Chart',
      confidence: 0.8,
      fieldMappings: {
        'Unit Number': 'unitNumber',
        'Owner Name': 'ownerName',
        'Ownership %': 'ownershipPercentage'
      }
    };
  }
  
  /**
   * Applies a template to extract data
   * @param {File} file - File to extract from
   * @param {Object} template - Template to apply
   * @returns {Promise<Object>} Template extraction result
   */
  async applyTemplate(file, template) {
    // This would implement template-based extraction
    // For now, return a mock result
    return {
      success: true,
      data: [],
      confidence: template.confidence,
      template: template
    };
  }
  
  /**
   * Generates guidance for manual entry
   * @param {Object} context - Extraction context
   * @returns {Object} Manual entry guidance
   */
  generateManualEntryGuidance(context) {
    return {
      title: 'Manual Data Entry',
      instructions: [
        'Use the original file as reference',
        'Enter data in the order it appears in the file',
        'Required fields: Unit Number, Owner Name, Ownership Percentage',
        'The system will validate data as you enter it'
      ],
      tips: [
        'Double-check ownership percentages sum to 100%',
        'Ensure unit numbers are unique',
        'Use consistent naming for owners'
      ]
    };
  }
  
  /**
   * Creates an empty template for manual entry
   * @returns {Object} Empty data template
   */
  createEmptyTemplate() {
    return {
      planNumber: '',
      buildingName: '',
      address: '',
      units: []
    };
  }
  
  /**
   * Utility methods
   */
  generateRecoveryId() {
    return `recovery_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  }
  
  recordRecoveryAttempt(recoveryId, strategy) {
    this.recoveryAttempts.set(recoveryId, {
      strategy: strategy,
      startTime: Date.now(),
      status: 'in_progress'
    });
  }
  
  recordRecoveryFailure(recoveryId, error) {
    const attempt = this.recoveryAttempts.get(recoveryId);
    if (attempt) {
      attempt.status = 'failed';
      attempt.error = error.message;
      attempt.endTime = Date.now();
    }
  }
  
  mapErrorToSeverity(errorType) {
    switch (errorType) {
      case 'fatal': return 'high';
      case 'recoverable': return 'medium';
      case 'warning': return 'low';
      default: return 'medium';
    }
  }
  
  generateSuggestedAction(error) {
    // Generate specific action based on error type
    if (error.message.includes('ownership percentage')) {
      return 'Verify and correct ownership percentages to sum to 100%';
    }
    if (error.message.includes('unit number')) {
      return 'Check for duplicate or missing unit numbers';
    }
    if (error.message.includes('owner name')) {
      return 'Verify owner names are complete and properly formatted';
    }
    return 'Review and correct the highlighted issue';
  }
  
  findAffectedItems(extractedData, error) {
    // Find which data items are affected by this error
    // This would be more sophisticated in a real implementation
    return extractedData.map((item, index) => index).slice(0, 1);
  }
}

// Export for both browser and Node.js environments
if (typeof window !== 'undefined') {
  window.FallbackManager = FallbackManager;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { FallbackManager };
}