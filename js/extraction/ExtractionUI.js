/**
 * Extraction UI Manager - Handles the enhanced file upload interface for strata chart extraction
 * Manages progress indicators, extraction options, and result display
 */

class ExtractionUI {
  constructor(dependencies = {}) {
    this.strataExtractor = dependencies.strataExtractor || null;
    this.reviewInterface = dependencies.reviewInterface || null;
    this.utils = dependencies.utils || window.UTILS;
    
    // UI Elements
    this.elements = {
      fileInput: null,
      extractionOptions: null,
      enableExtraction: null,
      confidenceThreshold: null,
      selectedFiles: null,
      extractionProgress: null,
      extractionResults: null,
      extractionDetails: null
    };
    
    // State
    this.currentExtraction = null;
    this.extractionCancelled = false;
    this.supportedExtractionFormats = ['.xlsx', '.xls', '.pdf'];
    
    this.init();
  }
  
  /**
   * Initialize the extraction UI
   */
  init() {
    this.bindElements();
    this.attachEventListeners();
    console.log('ExtractionUI initialized');
  }
  
  /**
   * Bind DOM elements
   */
  bindElements() {
    this.elements.fileInput = document.getElementById('fileInput');
    this.elements.extractionOptions = document.getElementById('extractionOptions');
    this.elements.enableExtraction = document.getElementById('enableExtraction');
    this.elements.confidenceThreshold = document.getElementById('confidenceThreshold');
    this.elements.selectedFiles = document.getElementById('selectedFiles');
    this.elements.extractionProgress = document.getElementById('extractionProgress');
    this.elements.extractionResults = document.getElementById('extractionResults');
    this.elements.extractionDetails = document.getElementById('extractionDetails');
  }
  
  /**
   * Attach event listeners
   */
  attachEventListeners() {
    if (this.elements.fileInput) {
      this.elements.fileInput.addEventListener('change', (e) => this.handleFileSelection(e));
    }
    
    if (this.elements.enableExtraction) {
      this.elements.enableExtraction.addEventListener('change', (e) => this.handleExtractionToggle(e));
    }
    
    if (this.elements.confidenceThreshold) {
      this.elements.confidenceThreshold.addEventListener('change', (e) => this.handleConfidenceChange(e));
    }
    
    // Global functions for button clicks
    window.cancelExtraction = () => this.cancelExtraction();
    window.reviewExtraction = () => this.reviewExtraction();
    window.acceptExtraction = () => this.acceptExtraction();
    window.rejectExtraction = () => this.rejectExtraction();
    window.toggleExtractionDetails = () => this.toggleExtractionDetails();
  }
  
  /**
   * Handle file selection
   * @param {Event} event - File input change event
   */
  handleFileSelection(event) {
    const files = Array.from(event.target.files);
    this.updateSelectedFilesDisplay(files);
    
    // Check if any files support extraction
    const extractableFiles = files.filter(file => this.isExtractionSupported(file));
    
    if (extractableFiles.length > 0) {
      this.showExtractionOptions(extractableFiles);
      
      // Auto-start extraction if enabled and only extractable files
      if (this.elements.enableExtraction?.checked && 
          extractableFiles.length === files.length && 
          files.length === 1) {
        // Small delay to allow UI to update
        setTimeout(() => {
          this.startExtraction(files);
        }, 500);
      }
    } else {
      this.hideExtractionOptions();
    }
  }
  
  /**
   * Check if a file supports extraction
   * @param {File} file - File to check
   * @returns {boolean} Whether extraction is supported
   */
  isExtractionSupported(file) {
    const extension = '.' + file.name.split('.').pop().toLowerCase();
    return this.supportedExtractionFormats.includes(extension);
  }
  
  /**
   * Update the selected files display
   * @param {Array<File>} files - Selected files
   */
  updateSelectedFilesDisplay(files) {
    if (!this.elements.selectedFiles) return;
    
    if (files.length === 0) {
      this.elements.selectedFiles.textContent = 'No files selected';
      this.elements.selectedFiles.className = 'selected-files';
      return;
    }
    
    const extractableCount = files.filter(file => this.isExtractionSupported(file)).length;
    
    let displayText = `${files.length} file${files.length > 1 ? 's' : ''} selected`;
    if (extractableCount > 0) {
      displayText += ` (${extractableCount} support${extractableCount === 1 ? 's' : ''} extraction)`;
    }
    
    this.elements.selectedFiles.textContent = displayText;
    this.elements.selectedFiles.className = 'selected-files files-selected';
  }
  
  /**
   * Show extraction options
   * @param {Array<File>} extractableFiles - Files that support extraction
   */
  showExtractionOptions(extractableFiles) {
    if (!this.elements.extractionOptions) return;
    
    this.elements.extractionOptions.classList.remove('hidden');
    this.elements.extractionOptions.classList.add('fade-in');
    
    // Update extraction options based on file types
    this.updateExtractionOptionsForFiles(extractableFiles);
  }
  
  /**
   * Hide extraction options
   */
  hideExtractionOptions() {
    if (!this.elements.extractionOptions) return;
    
    this.elements.extractionOptions.classList.add('hidden');
    this.elements.extractionOptions.classList.remove('fade-in');
  }
  
  /**
   * Update extraction options based on selected files
   * @param {Array<File>} files - Extractable files
   */
  updateExtractionOptionsForFiles(files) {
    // Could customize options based on file types
    // For now, keep default options
  }
  
  /**
   * Handle extraction toggle
   * @param {Event} event - Checkbox change event
   */
  handleExtractionToggle(event) {
    const enabled = event.target.checked;
    
    // Enable/disable confidence threshold
    if (this.elements.confidenceThreshold) {
      this.elements.confidenceThreshold.disabled = !enabled;
    }
    
    console.log('Extraction', enabled ? 'enabled' : 'disabled');
  }
  
  /**
   * Handle confidence threshold change
   * @param {Event} event - Select change event
   */
  handleConfidenceChange(event) {
    const threshold = parseFloat(event.target.value);
    console.log('Confidence threshold changed to:', threshold);
  }
  
  /**
   * Start extraction process for files
   * @param {Array<File>} files - Files to process
   * @returns {Promise<void>}
   */
  async startExtraction(files) {
    if (!this.elements.enableExtraction?.checked) {
      console.log('Extraction disabled, skipping');
      return;
    }
    
    const extractableFiles = files.filter(file => this.isExtractionSupported(file));
    if (extractableFiles.length === 0) {
      console.log('No extractable files found');
      return;
    }
    
    this.extractionCancelled = false;
    this.showExtractionProgress();
    
    try {
      for (let i = 0; i < extractableFiles.length; i++) {
        if (this.extractionCancelled) break;
        
        const file = extractableFiles[i];
        await this.extractFromFile(file, i + 1, extractableFiles.length);
      }
      
      if (!this.extractionCancelled) {
        this.showExtractionComplete();
      }
    } catch (error) {
      this.showExtractionError(error);
    }
  }
  
  /**
   * Extract data from a single file
   * @param {File} file - File to extract from
   * @param {number} fileIndex - Current file index (1-based)
   * @param {number} totalFiles - Total number of files
   * @returns {Promise<void>}
   */
  async extractFromFile(file, fileIndex, totalFiles) {
    const fileType = this.getFileType(file);
    const confidenceThreshold = parseFloat(this.elements.confidenceThreshold?.value || '0.5');
    
    this.updateProgressText(`Processing ${file.name} (${fileIndex}/${totalFiles})`);
    this.updateProgressPercentage(0);
    
    // Step 1: Reading file
    this.updateProgressStep('step-reading', 'active');
    this.updateProgressPercentage(10);
    await this.delay(200); // Visual feedback
    
    if (this.extractionCancelled) return;
    
    // Step 2: Extracting data
    this.updateProgressStep('step-reading', 'completed');
    this.updateProgressStep('step-extracting', 'active');
    this.updateProgressText(`Extracting strata data from ${file.name}`);
    this.updateProgressPercentage(30);
    
    try {
      // Perform actual extraction
      const extractionResult = await this.strataExtractor.extractFromFile(file, fileType);
      
      if (this.extractionCancelled) return;
      
      // Step 3: Validating
      this.updateProgressStep('step-extracting', 'completed');
      this.updateProgressStep('step-validating', 'active');
      this.updateProgressText('Validating extracted data');
      this.updateProgressPercentage(70);
      await this.delay(300);
      
      if (this.extractionCancelled) return;
      
      // Step 4: Complete
      this.updateProgressStep('step-validating', 'completed');
      this.updateProgressStep('step-complete', 'completed');
      this.updateProgressText('Extraction complete');
      this.updateProgressPercentage(100);
      
      // Store result for review
      this.currentExtraction = {
        file: file,
        result: extractionResult,
        confidenceThreshold: confidenceThreshold
      };
      
      // Show results
      this.showExtractionResults(extractionResult);
      
    } catch (error) {
      this.updateProgressStep('step-extracting', 'error');
      throw error;
    }
  }
  
  /**
   * Get file type for extraction
   * @param {File} file - File to check
   * @returns {string} File type ('excel' or 'pdf')
   */
  getFileType(file) {
    const extension = file.name.split('.').pop().toLowerCase();
    if (['xlsx', 'xls'].includes(extension)) {
      return 'excel';
    } else if (extension === 'pdf') {
      return 'pdf';
    }
    return 'unknown';
  }
  
  /**
   * Show extraction progress UI
   */
  showExtractionProgress() {
    if (!this.elements.extractionProgress) return;
    
    this.elements.extractionProgress.classList.remove('hidden');
    this.elements.extractionProgress.classList.add('fade-in');
    
    // Reset progress state
    this.updateProgressPercentage(0);
    this.updateProgressText('Initializing extraction...');
    this.resetProgressSteps();
  }
  
  /**
   * Hide extraction progress UI
   */
  hideExtractionProgress() {
    if (!this.elements.extractionProgress) return;
    
    this.elements.extractionProgress.classList.add('hidden');
    this.elements.extractionProgress.classList.remove('fade-in');
  }
  
  /**
   * Show extraction results UI
   * @param {Object} extractionResult - Extraction result
   */
  showExtractionResults(extractionResult) {
    if (!this.elements.extractionResults) return;
    
    this.elements.extractionResults.classList.remove('hidden');
    this.elements.extractionResults.classList.add('fade-in');
    
    // Update results summary
    this.updateResultsSummary(extractionResult);
    
    // Update results details
    this.updateResultsDetails(extractionResult);
    
    // Hide progress after showing results
    setTimeout(() => this.hideExtractionProgress(), 1000);
  }
  
  /**
   * Update results summary
   * @param {Object} extractionResult - Extraction result
   */
  updateResultsSummary(extractionResult) {
    const layersFound = document.getElementById('layersFound');
    const overallConfidence = document.getElementById('overallConfidence');
    const extractionStatus = document.getElementById('extractionStatus');
    
    if (layersFound) {
      layersFound.textContent = extractionResult.data?.length || 0;
    }
    
    if (overallConfidence) {
      const confidence = Math.round((extractionResult.confidence || 0) * 100);
      overallConfidence.textContent = `${confidence}%`;
      overallConfidence.className = `summary-value confidence-${this.getConfidenceClass(confidence)}`;
    }
    
    if (extractionStatus) {
      const status = extractionResult.success ? 'Success' : 'Needs Review';
      extractionStatus.textContent = status;
      extractionStatus.className = `summary-value status-${extractionResult.success ? 'success' : 'warning'}`;
    }
  }
  
  /**
   * Update results details
   * @param {Object} extractionResult - Extraction result
   */
  updateResultsDetails(extractionResult) {
    const warningsList = document.getElementById('extractionWarnings');
    const errorsList = document.getElementById('extractionErrors');
    const processingTime = document.getElementById('processingTime');
    
    if (warningsList) {
      warningsList.innerHTML = '';
      (extractionResult.warnings || []).forEach(warning => {
        const li = document.createElement('li');
        li.textContent = warning;
        warningsList.appendChild(li);
      });
    }
    
    if (errorsList) {
      errorsList.innerHTML = '';
      (extractionResult.errors || []).forEach(error => {
        const li = document.createElement('li');
        li.textContent = error;
        errorsList.appendChild(li);
      });
    }
    
    if (processingTime) {
      const time = extractionResult.metadata?.processing_time_ms || 0;
      processingTime.textContent = `${time}ms`;
    }
  }
  
  /**
   * Get confidence CSS class
   * @param {number} confidence - Confidence percentage
   * @returns {string} CSS class name
   */
  getConfidenceClass(confidence) {
    if (confidence >= 70) return 'high';
    if (confidence >= 50) return 'medium';
    return 'low';
  }
  
  /**
   * Get confidence display data with tooltip
   * @param {string|number} confidence - Confidence level ('high'/'medium'/'low') or percentage
   * @param {Object} layer - Layer data for context
   * @returns {Object} { class, label, tooltip }
   */
  getConfidenceDisplay(confidence, layer = {}) {
    let confidenceClass, confidenceLabel, confidencePercent;
    
    // Handle string confidence levels
    if (typeof confidence === 'string') {
      confidenceClass = confidence;
      confidenceLabel = confidence.charAt(0).toUpperCase() + confidence.slice(1);
      
      // Estimate percentage from level
      const percentMap = { 'high': 85, 'medium': 65, 'low': 35 };
      confidencePercent = percentMap[confidence] || 50;
    } else {
      // Handle numeric confidence (0-1 or 0-100)
      confidencePercent = confidence > 1 ? confidence : confidence * 100;
      confidenceClass = this.getConfidenceClass(confidencePercent);
      confidenceLabel = confidenceClass.charAt(0).toUpperCase() + confidenceClass.slice(1);
    }
    
    // Build tooltip explanation
    const tooltip = this.buildConfidenceTooltip(confidenceClass, confidencePercent, layer);
    
    return {
      class: confidenceClass,
      label: confidenceLabel,
      percent: Math.round(confidencePercent),
      tooltip: tooltip
    };
  }
  
  /**
   * Build confidence tooltip explanation
   * @param {string} level - Confidence level
   * @param {number} percent - Confidence percentage
   * @param {Object} layer - Layer data
   * @returns {string} Tooltip HTML
   */
  buildConfidenceTooltip(level, percent, layer) {
    const reasons = [];
    
    // Base explanation
    if (level === 'high') {
      reasons.push('✓ Clear material identification');
      reasons.push('✓ Precise depth boundaries');
      reasons.push('✓ Consistent with expected patterns');
    } else if (level === 'medium') {
      reasons.push('⚠ Material partially identified');
      reasons.push('⚠ Depth boundaries estimated');
      reasons.push('→ Manual review recommended');
    } else {
      reasons.push('⚠ Material unclear or ambiguous');
      reasons.push('⚠ Depth boundaries uncertain');
      reasons.push('→ Manual verification required');
    }
    
    // Add layer-specific context if available
    if (layer.user_edited) {
      reasons.push('✓ User verified');
    }
    
    if (layer.source === 'fallback') {
      reasons.push('⚠ Extracted using fallback method');
    }
    
    return `
      <div class="confidence-tooltip">
        <div class="tooltip-header">
          <strong>Confidence: ${percent}%</strong>
        </div>
        <div class="tooltip-body">
          ${reasons.map(r => `<div class="tooltip-reason">${r}</div>`).join('')}
        </div>
      </div>
    `;
  }
  
  /**
   * Show extraction complete state
   */
  showExtractionComplete() {
    this.updateProgressText('All extractions complete');
    this.updateProgressPercentage(100);
  }
  
  /**
   * Show extraction error
   * @param {Error} error - Error that occurred
   */
  showExtractionError(error) {
    this.updateProgressText(`Extraction failed: ${error.message}`);
    this.updateProgressStep('step-extracting', 'error');
    
    // Show error in results
    setTimeout(() => {
      this.showExtractionResults({
        success: false,
        errors: [error.message],
        warnings: [],
        confidence: 0,
        data: []
      });
    }, 1000);
  }
  
  /**
   * Cancel extraction
   */
  cancelExtraction() {
    this.extractionCancelled = true;
    this.hideExtractionProgress();
    this.hideExtractionResults();
    console.log('Extraction cancelled');
  }
  
  /**
   * Review extraction results
   */
  reviewExtraction() {
    if (!this.currentExtraction || !this.reviewInterface) {
      console.warn('No extraction to review or review interface not available');
      return;
    }
    
    console.log('Opening review interface for extraction');
    this.reviewInterface.loadDraft(this.currentExtraction.result);
  }
  
  /**
   * Accept extraction results
   */
  acceptExtraction() {
    if (!this.currentExtraction) {
      console.warn('No extraction to accept');
      return;
    }
    
    console.log('Accepting extraction results');
    
    // Trigger the normal file save process with extracted data
    if (window.fileManager && window.fileManager.saveFileWithExtractedData) {
      window.fileManager.saveFileWithExtractedData(this.currentExtraction);
    } else {
      // Fallback: populate form fields with extracted data
      this.populateFormWithExtractionData(this.currentExtraction);
    }
    
    this.hideExtractionResults();
    this.currentExtraction = null;
  }
  
  /**
   * Populate form fields with extraction data (fallback method)
   * @param {Object} extractionData - Extraction data
   */
  populateFormWithExtractionData(extractionData) {
    const { result } = extractionData;
    
    if (!result.data || result.data.length === 0) {
      console.warn('No extraction data to populate');
      return;
    }
    
    try {
      // Generate a bore ID from filename if not present
      const boreIdInput = document.getElementById('boreId');
      if (boreIdInput && !boreIdInput.value) {
        const filename = extractionData.file.name.replace(/\.[^/.]+$/, '');
        boreIdInput.value = `extracted_${filename}`;
      }
      
      // Set date to today if not present
      const dateInput = document.getElementById('fileDate');
      if (dateInput && !dateInput.value) {
        dateInput.value = new Date().toISOString().split('T')[0];
      }
      
      // Populate strata layers
      this.populateStrataLayers(result.data);
      
      // Add extraction metadata to notes
      const notesInput = document.getElementById('notes');
      if (notesInput) {
        const extractionNote = `\n\nExtracted from: ${extractionData.file.name}\nConfidence: ${Math.round((result.confidence || 0) * 100)}%\nLayers found: ${result.data.length}`;
        notesInput.value = (notesInput.value || '') + extractionNote;
      }
      
      // Show success message
      if (window.UTILS && window.UTILS.showToast) {
        window.UTILS.showToast('Extraction data populated in form. Please review and save.', 'success');
      }
      
    } catch (error) {
      console.error('Failed to populate form with extraction data:', error);
      if (window.UTILS && window.UTILS.showToast) {
        window.UTILS.showToast('Failed to populate form: ' + error.message, 'error');
      }
    }
  }
  
  /**
   * Populate strata layers in the form
   * @param {Array} layers - Extracted strata layers
   */
  populateStrataLayers(layers) {
    // Clear existing layers
    const strataLayers = document.getElementById('strataLayers');
    if (!strataLayers) return;
    
    // Remove existing layer inputs except the first template
    const existingLayers = strataLayers.querySelectorAll('.strata-layer-input:not(:first-child)');
    existingLayers.forEach(layer => layer.remove());
    
    // Populate layers
    layers.forEach((layer, index) => {
      let layerInput;
      
      if (index === 0) {
        // Use the first existing input
        layerInput = strataLayers.querySelector('.strata-layer-input');
      } else {
        // Clone the first input for additional layers
        const template = strataLayers.querySelector('.strata-layer-input');
        layerInput = template.cloneNode(true);
        strataLayers.appendChild(layerInput);
      }
      
      if (layerInput) {
        const typeSelect = layerInput.querySelector('.strata-type');
        const thicknessInput = layerInput.querySelector('.strata-thickness');
        
        if (typeSelect) {
          // Try to match material to available options
          const material = layer.material?.toLowerCase() || '';
          const options = Array.from(typeSelect.options);
          const matchedOption = options.find(opt => 
            opt.value.toLowerCase().includes(material) || 
            material.includes(opt.value.toLowerCase())
          );
          
          if (matchedOption) {
            typeSelect.value = matchedOption.value;
          } else {
            // If no match, use the material as custom value
            typeSelect.value = '';
            // Could add custom option here if needed
          }
        }
        
        if (thicknessInput) {
          const thickness = layer.end_depth - layer.start_depth;
          thicknessInput.value = thickness.toFixed(1);
        }
      }
    });
    
    // Update strata summary
    const strataSummary = document.getElementById('strataSummary');
    if (strataSummary) {
      const summary = this.generateStrataSummary(layers);
      strataSummary.value = summary;
    }
  }
  
  /**
   * Generate strata summary from layers
   * @param {Array} layers - Strata layers
   * @returns {string} Summary text
   */
  generateStrataSummary(layers) {
    if (!layers || layers.length === 0) {
      return 'No strata data available';
    }
    
    const totalDepth = Math.max(...layers.map(layer => layer.end_depth || 0));
    const materials = [...new Set(layers.map(layer => layer.material))].filter(Boolean);
    
    let summary = `${layers.length} layers identified to ${totalDepth} ft depth. `;
    summary += `Materials: ${materials.join(', ')}.`;
    
    return summary;
  }
  
  /**
   * Reject extraction and use manual entry
   */
  rejectExtraction() {
    console.log('Rejecting extraction, switching to manual entry');
    
    this.hideExtractionResults();
    this.currentExtraction = null;
    
    // Could trigger manual entry interface here
    if (window.files && window.files.openManualEntry) {
      window.files.openManualEntry();
    }
  }
  
  /**
   * Toggle extraction details visibility
   */
  toggleExtractionDetails() {
    if (!this.elements.extractionDetails) return;
    
    const detailsContent = this.elements.extractionDetails.querySelector('.details-content');
    const toggle = this.elements.extractionDetails.querySelector('.details-toggle');
    
    if (detailsContent.style.display === 'none' || !detailsContent.style.display) {
      detailsContent.style.display = 'block';
      toggle.classList.add('expanded');
      this.elements.extractionDetails.classList.remove('hidden');
    } else {
      detailsContent.style.display = 'none';
      toggle.classList.remove('expanded');
    }
  }
  
  /**
   * Hide extraction results
   */
  hideExtractionResults() {
    if (!this.elements.extractionResults) return;
    
    this.elements.extractionResults.classList.add('hidden');
    this.elements.extractionResults.classList.remove('fade-in');
  }
  
  /**
   * Update progress text
   * @param {string} text - Progress text
   */
  updateProgressText(text) {
    const progressText = document.querySelector('.progress-text');
    if (progressText) {
      progressText.textContent = text;
    }
  }
  
  /**
   * Update progress percentage
   * @param {number} percentage - Progress percentage (0-100)
   */
  updateProgressPercentage(percentage) {
    const progressFill = document.querySelector('.progress-fill');
    const progressPercentage = document.querySelector('.progress-percentage');
    
    if (progressFill) {
      progressFill.style.width = `${percentage}%`;
    }
    
    if (progressPercentage) {
      progressPercentage.textContent = `${percentage}%`;
    }
  }
  
  /**
   * Update progress step status
   * @param {string} stepId - Step element ID
   * @param {string} status - Step status ('active', 'completed', 'error')
   */
  updateProgressStep(stepId, status) {
    const step = document.getElementById(stepId);
    if (!step) return;
    
    // Remove all status classes
    step.classList.remove('active', 'completed', 'error');
    
    // Add new status class
    step.classList.add(status);
    
    // Update status icon
    const statusIcon = step.querySelector('.step-status');
    if (statusIcon) {
      switch (status) {
        case 'active':
          statusIcon.textContent = '⏳';
          break;
        case 'completed':
          statusIcon.textContent = '✅';
          break;
        case 'error':
          statusIcon.textContent = '❌';
          break;
        default:
          statusIcon.textContent = '⏳';
      }
    }
  }
  
  /**
   * Reset all progress steps
   */
  resetProgressSteps() {
    const steps = ['step-reading', 'step-extracting', 'step-validating', 'step-complete'];
    steps.forEach(stepId => {
      const step = document.getElementById(stepId);
      if (step) {
        step.classList.remove('active', 'completed', 'error');
        const statusIcon = step.querySelector('.step-status');
        if (statusIcon) {
          statusIcon.textContent = '⏳';
        }
      }
    });
  }
  
  /**
   * Utility delay function
   * @param {number} ms - Milliseconds to delay
   * @returns {Promise<void>}
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Export for both browser and Node.js environments
if (typeof window !== 'undefined') {
  window.ExtractionUI = ExtractionUI;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { ExtractionUI };
}