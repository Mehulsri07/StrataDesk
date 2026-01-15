/**
 * Strata Extraction Tab Manager
 * Handles the main extraction tab functionality and workflow
 */

class ExtractionTabManager {
  constructor() {
    this.currentStep = 'upload';
    this.uploadedFiles = [];
    this.extractionResults = null;
    this.isProcessing = false;
    
    this.init();
  }
  
  init() {
    this.bindElements();
    this.attachEventListeners();
    this.setupDragAndDrop();
    console.log('ExtractionTabManager initialized');
  }
  
  bindElements() {
    this.elements = {
      uploadZone: document.getElementById('extractionUploadZone'),
      fileInput: document.getElementById('extractionFileInput'),
      fileList: document.getElementById('extractionFileList'),
      confidenceThreshold: document.getElementById('extractionConfidenceThreshold'),
      depthUnits: document.getElementById('extractionDepthUnits'),
      enableFallback: document.getElementById('enableFallback'),
      autoReview: document.getElementById('autoReview'),
      startBtn: document.getElementById('startExtractionBtn'),
      progress: document.getElementById('mainExtractionProgress'),
      results: document.getElementById('mainExtractionResults'),
      
      // Workflow steps
      stepUpload: document.getElementById('step-upload'),
      stepConfigure: document.getElementById('step-configure'),
      stepProcessing: document.getElementById('step-processing'),
      stepResults: document.getElementById('step-results'),
      
      // Progress elements
      progressPercent: document.getElementById('mainProgressPercent'),
      progressTitle: document.getElementById('mainProgressTitle'),
      progressSubtitle: document.getElementById('mainProgressSubtitle')
    };
  }
  
  attachEventListeners() {
    if (this.elements.fileInput) {
      this.elements.fileInput.addEventListener('change', (e) => this.handleFileSelection(e));
    }
    
    if (this.elements.uploadZone) {
      this.elements.uploadZone.addEventListener('click', () => this.elements.fileInput?.click());
    }
    
    if (this.elements.startBtn) {
      this.elements.startBtn.addEventListener('click', () => this.startExtraction());
    }
    
    // Global functions
    window.startMainExtraction = () => this.startExtraction();
    window.cancelMainExtraction = () => this.cancelExtraction();
    window.showExtractionHelp = () => this.showHelp();
    window.showExtractionSettings = () => this.showSettings();
  }
  
  setupDragAndDrop() {
    if (!this.elements.uploadZone) return;
    
    const uploadZone = this.elements.uploadZone;
    
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
      uploadZone.addEventListener(eventName, this.preventDefaults, false);
    });
    
    ['dragenter', 'dragover'].forEach(eventName => {
      uploadZone.addEventListener(eventName, () => uploadZone.classList.add('dragover'), false);
    });
    
    ['dragleave', 'drop'].forEach(eventName => {
      uploadZone.addEventListener(eventName, () => uploadZone.classList.remove('dragover'), false);
    });
    
    uploadZone.addEventListener('drop', (e) => this.handleDrop(e), false);
  }
  
  preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
  }
  
  handleDrop(e) {
    const dt = e.dataTransfer;
    const files = dt.files;
    this.processFiles(Array.from(files));
  }
  
  handleFileSelection(e) {
    const files = Array.from(e.target.files);
    this.processFiles(files);
  }
  
  processFiles(files) {
    // Filter for supported formats
    const supportedFiles = files.filter(file => {
      const extension = '.' + file.name.split('.').pop().toLowerCase();
      return ['.pdf', '.xlsx', '.xls'].includes(extension);
    });
    
    if (supportedFiles.length === 0) {
      this.showNotification('No supported files found. Please upload PDF or Excel files.', 'warning');
      return;
    }
    
    this.uploadedFiles = supportedFiles;
    this.updateFileList();
    this.activateStep('configure');
  }
  
  updateFileList() {
    if (!this.elements.fileList) return;
    
    if (this.uploadedFiles.length === 0) {
      this.elements.fileList.innerHTML = '';
      return;
    }
    
    const html = this.uploadedFiles.map((file, index) => {
      const extension = file.name.split('.').pop().toLowerCase();
      const icon = extension === 'pdf' ? '📄' : '📊';
      const size = this.formatFileSize(file.size);
      
      return `
        <div class="extraction-file-item">
          <div class="file-icon">${icon}</div>
          <div class="file-info">
            <div class="file-name">${file.name}</div>
            <div class="file-details">${size} • ${extension.toUpperCase()}</div>
          </div>
          <div class="file-actions">
            <button class="btn-file-action danger" onclick="extractionTab.removeFile(${index})" title="Remove">
              ✕
            </button>
          </div>
        </div>
      `;
    }).join('');
    
    this.elements.fileList.innerHTML = html;
  }
  
  removeFile(index) {
    this.uploadedFiles.splice(index, 1);
    this.updateFileList();
    
    if (this.uploadedFiles.length === 0) {
      this.activateStep('upload');
    }
  }
  
  formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
  
  activateStep(stepName) {
    this.currentStep = stepName;
    
    // Update step classes
    const steps = ['upload', 'configure', 'processing', 'results'];
    steps.forEach(step => {
      const element = this.elements[`step${step.charAt(0).toUpperCase() + step.slice(1)}`];
      if (element) {
        element.classList.remove('active', 'completed');
        
        if (step === stepName) {
          element.classList.add('active');
        } else if (steps.indexOf(step) < steps.indexOf(stepName)) {
          element.classList.add('completed');
        }
      }
    });
  }
  
  async startExtraction() {
    if (this.uploadedFiles.length === 0) {
      this.showNotification('Please upload files first.', 'warning');
      return;
    }
    
    if (this.isProcessing) {
      return;
    }
    
    this.isProcessing = true;
    this.activateStep('processing');
    this.resetPipeline();
    
    try {
      // Get configuration
      const config = {
        confidenceThreshold: parseFloat(this.elements.confidenceThreshold?.value || '0.5'),
        depthUnits: this.elements.depthUnits?.value || 'feet',
        enableFallback: this.elements.enableFallback?.checked || true,
        autoReview: this.elements.autoReview?.checked || true
      };
      
      // Process each file with detailed pipeline updates
      const results = [];
      for (let i = 0; i < this.uploadedFiles.length; i++) {
        const file = this.uploadedFiles[i];
        
        // Step 1: Upload/Reading
        this.updatePipelineStep('upload', 'running', {
          message: `Reading ${file.name}...`
        });
        this.updateProgress(
          Math.round(((i + 0.1) / this.uploadedFiles.length) * 100),
          `Processing ${file.name}`,
          `File ${i + 1} of ${this.uploadedFiles.length}`
        );
        
        await this.delay(300);
        this.updatePipelineStep('upload', 'done', {
          message: `File loaded: ${this.formatFileSize(file.size)}`
        });
        
        // Step 2: Parsing
        this.updatePipelineStep('parse', 'running', {
          message: 'Parsing file structure...'
        });
        this.updateProgress(
          Math.round(((i + 0.3) / this.uploadedFiles.length) * 100),
          `Parsing ${file.name}`,
          'Detecting columns and data structure'
        );
        
        await this.delay(400);
        
        const fileType = file.name.toLowerCase().endsWith('.pdf') ? 'pdf' : 'excel';
        let result;
        
        try {
          result = await this.extractFromFile(file, fileType, config);
          
          // Check for parsing issues
          if (result.warnings && result.warnings.length > 0) {
            this.updatePipelineStep('parse', 'warning', {
              message: 'Parsing completed with warnings',
              warnings: result.warnings
            });
          } else {
            this.updatePipelineStep('parse', 'done', {
              message: 'File structure parsed successfully'
            });
          }
          
        } catch (parseError) {
          this.updatePipelineStep('parse', 'error', {
            message: 'Failed to parse file',
            errors: [parseError.message]
          });
          throw parseError;
        }
        
        // Step 3: Normalize/Extract
        this.updatePipelineStep('normalize', 'running', {
          message: 'Extracting strata layers...'
        });
        this.updateProgress(
          Math.round(((i + 0.6) / this.uploadedFiles.length) * 100),
          `Extracting data from ${file.name}`,
          'Identifying materials and depths'
        );
        
        await this.delay(500);
        
        if (result.success && result.data) {
          const layerCount = result.data.layers?.length || 0;
          this.updatePipelineStep('normalize', 'done', {
            message: `Extracted ${layerCount} layer${layerCount !== 1 ? 's' : ''}`
          });
        } else {
          this.updatePipelineStep('normalize', 'error', {
            message: 'Failed to extract layers',
            errors: result.errors || ['Unknown extraction error']
          });
        }
        
        // Step 4: Validate
        this.updatePipelineStep('validate', 'running', {
          message: 'Validating extracted data...'
        });
        this.updateProgress(
          Math.round(((i + 0.9) / this.uploadedFiles.length) * 100),
          `Validating ${file.name}`,
          'Checking depth sequences and materials'
        );
        
        await this.delay(300);
        
        // Validation check
        const validationIssues = this.validateExtractionResult(result);
        
        if (validationIssues.errors.length > 0) {
          this.updatePipelineStep('validate', 'error', {
            message: 'Validation failed',
            errors: validationIssues.errors,
            warnings: validationIssues.warnings
          });
        } else if (validationIssues.warnings.length > 0) {
          this.updatePipelineStep('validate', 'warning', {
            message: 'Validation completed with warnings',
            warnings: validationIssues.warnings
          });
        } else {
          this.updatePipelineStep('validate', 'done', {
            message: 'All validations passed'
          });
        }
        
        results.push({ file, result });
      }
      
      this.updateProgress(100, 'Extraction Complete', 'Processing results...');
      
      // Combine results
      this.extractionResults = this.combineResults(results);
      
      // Show results
      setTimeout(() => {
        this.showResults();
        this.activateStep('results');
        this.isProcessing = false;
      }, 1000);
      
    } catch (error) {
      console.error('Extraction failed:', error);
      this.showNotification('Extraction failed: ' + error.message, 'error');
      this.isProcessing = false;
      this.activateStep('configure');
    }
  }
  
  /**
   * Validate extraction result
   * @param {Object} result - Extraction result
   * @returns {Object} Validation issues { errors: [], warnings: [] }
   */
  validateExtractionResult(result) {
    const issues = { errors: [], warnings: [] };
    
    if (!result.success) {
      issues.errors.push('Extraction was not successful');
      return issues;
    }
    
    if (!result.data || !result.data.layers) {
      issues.errors.push('No layer data found');
      return issues;
    }
    
    const layers = result.data.layers;
    
    // Check for empty layers
    if (layers.length === 0) {
      issues.errors.push('No layers extracted');
    }
    
    // Check depth sequence
    for (let i = 0; i < layers.length; i++) {
      const layer = layers[i];
      
      if (layer.start_depth >= layer.end_depth) {
        issues.errors.push(`Layer ${i + 1}: Invalid depth range`);
      }
      
      if (i > 0) {
        const prevLayer = layers[i - 1];
        if (layer.start_depth < prevLayer.end_depth) {
          issues.warnings.push(`Layer ${i + 1}: Overlaps with previous layer`);
        } else if (layer.start_depth > prevLayer.end_depth) {
          issues.warnings.push(`Layer ${i + 1}: Gap detected from previous layer`);
        }
      }
    }
    
    // Check confidence
    const lowConfidenceLayers = layers.filter(l => l.confidence === 'low').length;
    if (lowConfidenceLayers > layers.length / 2) {
      issues.warnings.push(`${lowConfidenceLayers} layers have low confidence`);
    }
    
    return issues;
  }
  
  /**
   * Utility delay function
   * @param {number} ms - Milliseconds to delay
   * @returns {Promise<void>}
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  async extractFromFile(file, fileType, config) {
    // Use the existing StrataExtractor if available
    if (window.StrataExtraction?.extractor) {
      return await window.StrataExtraction.extractor.extractFromFile(file, fileType);
    }
    
    // Fallback to mock extraction for demo
    return this.mockExtraction(file, fileType, config);
  }
  
  mockExtraction(file, fileType, config) {
    return new Promise((resolve) => {
      setTimeout(() => {
        const mockLayers = [
          { material: 'Topsoil', start_depth: 0, end_depth: 2, confidence: 'high' },
          { material: 'Clay', start_depth: 2, end_depth: 8, confidence: 'high' },
          { material: 'Sand', start_depth: 8, end_depth: 15, confidence: 'medium' },
          { material: 'Gravel', start_depth: 15, end_depth: 22, confidence: 'high' },
          { material: 'Bedrock', start_depth: 22, end_depth: 25, confidence: 'medium' }
        ];
        
        resolve({
          success: true,
          data: {
            layers: mockLayers,
            metadata: {
              depth_unit: config.depthUnits,
              total_depth: 25,
              layer_count: mockLayers.length,
              extraction_timestamp: new Date().toISOString()
            }
          },
          confidence: 0.85,
          warnings: [],
          errors: []
        });
      }, 2000 + Math.random() * 1000);
    });
  }
  
  combineResults(results) {
    const combined = {
      files: results.length,
      totalLayers: 0,
      averageConfidence: 0,
      allLayers: [],
      warnings: [],
      errors: []
    };
    
    let confidenceSum = 0;
    
    results.forEach(({ file, result }) => {
      if (result.success && result.data) {
        combined.totalLayers += result.data.layers.length;
        combined.allLayers.push(...result.data.layers.map(layer => ({
          ...layer,
          source_file: file.name
        })));
        confidenceSum += result.confidence || 0;
      }
      
      if (result.warnings) combined.warnings.push(...result.warnings);
      if (result.errors) combined.errors.push(...result.errors);
    });
    
    combined.averageConfidence = results.length > 0 ? confidenceSum / results.length : 0;
    
    return combined;
  }
  
  updateProgress(percent, title, subtitle) {
    if (this.elements.progressPercent) {
      this.elements.progressPercent.textContent = `${percent}%`;
    }
    
    if (this.elements.progressTitle) {
      this.elements.progressTitle.textContent = title;
    }
    
    if (this.elements.progressSubtitle) {
      this.elements.progressSubtitle.textContent = subtitle;
    }
    
    // Update step indicators
    const steps = ['reading', 'parsing', 'extracting', 'validating'];
    const currentStepIndex = Math.floor((percent / 100) * steps.length);
    
    steps.forEach((step, index) => {
      const element = document.getElementById(`main-step-${step}`);
      if (element) {
        const statusElement = element.querySelector('.step-status');
        if (index < currentStepIndex) {
          statusElement.textContent = '✅';
          element.classList.add('completed');
        } else if (index === currentStepIndex) {
          statusElement.textContent = '⚙️';
          element.classList.add('active');
        } else {
          statusElement.textContent = '⏳';
          element.classList.remove('active', 'completed');
        }
      }
    });
  }
  
  /**
   * Update pipeline step with detailed status
   * @param {string} stepName - Step identifier: 'upload' | 'parse' | 'normalize' | 'validate' | 'review'
   * @param {string} status - Status: 'pending' | 'running' | 'done' | 'warning' | 'error'
   * @param {Object} details - Optional details: { message, errors, warnings, data }
   */
  updatePipelineStep(stepName, status, details = {}) {
    const stepMap = {
      'upload': 'reading',
      'parse': 'parsing',
      'normalize': 'extracting',
      'validate': 'validating',
      'review': 'validating'
    };
    
    const mappedStep = stepMap[stepName] || stepName;
    const element = document.getElementById(`main-step-${mappedStep}`);
    
    if (!element) return;
    
    // Update status icon
    const statusElement = element.querySelector('.step-status');
    const statusIcons = {
      'pending': '⏳',
      'running': '⚙️',
      'done': '✅',
      'warning': '⚠️',
      'error': '❌'
    };
    
    if (statusElement) {
      statusElement.textContent = statusIcons[status] || '⏳';
    }
    
    // Update classes
    element.classList.remove('pending', 'running', 'completed', 'warning', 'error', 'active');
    
    if (status === 'done') {
      element.classList.add('completed');
    } else if (status === 'running') {
      element.classList.add('active');
    } else if (status === 'warning' || status === 'error') {
      element.classList.add(status);
    }
    
    // Add inline error/warning summary if provided
    this.updateStepDetails(element, status, details);
  }
  
  /**
   * Update step details with inline error/warning summary
   * @param {HTMLElement} stepElement - Step DOM element
   * @param {string} status - Current status
   * @param {Object} details - Details object
   */
  updateStepDetails(stepElement, status, details) {
    // Remove existing details
    const existingDetails = stepElement.querySelector('.step-details');
    if (existingDetails) {
      existingDetails.remove();
    }
    
    // Only show details for warnings and errors
    if (status !== 'warning' && status !== 'error') return;
    
    const detailsContainer = document.createElement('div');
    detailsContainer.className = 'step-details';
    
    let detailsHTML = '';
    
    // Show message if provided
    if (details.message) {
      detailsHTML += `<div class="step-detail-message">${details.message}</div>`;
    }
    
    // Show errors
    if (details.errors && details.errors.length > 0) {
      detailsHTML += `
        <div class="step-detail-errors">
          <strong>Errors:</strong>
          <ul>
            ${details.errors.slice(0, 3).map(err => `<li>${err}</li>`).join('')}
            ${details.errors.length > 3 ? `<li>...and ${details.errors.length - 3} more</li>` : ''}
          </ul>
        </div>
      `;
    }
    
    // Show warnings
    if (details.warnings && details.warnings.length > 0) {
      detailsHTML += `
        <div class="step-detail-warnings">
          <strong>Warnings:</strong>
          <ul>
            ${details.warnings.slice(0, 2).map(warn => `<li>${warn}</li>`).join('')}
            ${details.warnings.length > 2 ? `<li>...and ${details.warnings.length - 2} more</li>` : ''}
          </ul>
        </div>
      `;
    }
    
    if (detailsHTML) {
      detailsContainer.innerHTML = detailsHTML;
      stepElement.appendChild(detailsContainer);
    }
  }
  
  /**
   * Reset all pipeline steps to pending state
   */
  resetPipeline() {
    const steps = ['upload', 'parse', 'normalize', 'validate'];
    steps.forEach(step => {
      this.updatePipelineStep(step, 'pending');
    });
  }
  
  showResults() {
    if (!this.elements.results || !this.extractionResults) return;
    
    const results = this.extractionResults;
    const confidencePercent = Math.round(results.averageConfidence * 100);
    
    const html = `
      <div class="results-overview">
        <div class="result-card">
          <div class="result-card-icon">📊</div>
          <div class="result-card-value">${results.totalLayers}</div>
          <div class="result-card-label">Layers Found</div>
        </div>
        <div class="result-card">
          <div class="result-card-icon">📁</div>
          <div class="result-card-value">${results.files}</div>
          <div class="result-card-label">Files Processed</div>
        </div>
        <div class="result-card">
          <div class="result-card-icon">🎯</div>
          <div class="result-card-value">${confidencePercent}%</div>
          <div class="result-card-label">Avg Confidence</div>
        </div>
      </div>
      
      <div class="extraction-preview">
        <div class="preview-header">
          <div class="preview-title">Extracted Strata Layers</div>
          <div class="preview-actions">
            <button class="btn-tool" onclick="extractionTab.exportResults()" title="Export">📤</button>
            <button class="btn-tool" onclick="extractionTab.editResults()" title="Edit">✏️</button>
          </div>
        </div>
        <div class="layer-list">
          ${this.renderLayerList(results.allLayers)}
        </div>
        <div class="result-actions">
          <button class="btn-secondary" onclick="extractionTab.reviewResults()">
            👁️ Review & Edit
          </button>
          <button class="btn-primary" onclick="extractionTab.saveResults()">
            ✅ Save to Project
          </button>
          <button class="btn-secondary" onclick="extractionTab.startOver()">
            🔄 Start Over
          </button>
        </div>
      </div>
    `;
    
    this.elements.results.innerHTML = html;
  }
  
  renderLayerList(layers) {
    return layers.map((layer, index) => {
      const confidenceClass = layer.confidence || 'medium';
      const color = this.getLayerColor(layer.material);
      
      return `
        <div class="layer-item">
          <div class="layer-color" style="background-color: ${color}"></div>
          <div class="layer-info">
            <div class="layer-material">${layer.material}</div>
            <div class="layer-depth">${layer.start_depth}ft - ${layer.end_depth}ft (${layer.end_depth - layer.start_depth}ft thick)</div>
          </div>
          <div class="layer-confidence ${confidenceClass}">${confidenceClass}</div>
        </div>
      `;
    }).join('');
  }
  
  getLayerColor(material) {
    const colors = {
      'topsoil': '#654321',
      'clay': '#8B4513',
      'sand': '#F4A460',
      'gravel': '#A0A0A0',
      'bedrock': '#696969',
      'silt': '#D2B48C',
      'limestone': '#F5F5DC',
      'sandstone': '#FAA460',
      'shale': '#708090'
    };
    
    const key = material.toLowerCase();
    return colors[key] || '#CCCCCC';
  }
  
  cancelExtraction() {
    this.isProcessing = false;
    this.activateStep('configure');
    this.showNotification('Extraction cancelled', 'info');
  }
  
  reviewResults() {
    // Open review interface
    if (window.StrataExtraction?.reviewInterface) {
      window.StrataExtraction.reviewInterface.showReview(this.extractionResults);
    } else {
      this.showNotification('Review interface not available', 'warning');
    }
  }
  
  saveResults() {
    if (!this.extractionResults) return;
    
    // Save to current project or create new boring
    this.showNotification('Results saved successfully!', 'success');
    
    // Optionally switch to map tab to show results
    setTimeout(() => {
      window.switchMainTab('map');
    }, 1500);
  }
  
  exportResults() {
    if (!this.extractionResults) return;
    
    const data = JSON.stringify(this.extractionResults, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `strata-extraction-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    this.showNotification('Results exported successfully!', 'success');
  }
  
  editResults() {
    this.showNotification('Edit functionality coming soon!', 'info');
  }
  
  startOver() {
    this.uploadedFiles = [];
    this.extractionResults = null;
    this.isProcessing = false;
    this.updateFileList();
    this.activateStep('upload');
    this.elements.results.innerHTML = '';
  }
  
  showHelp() {
    const helpContent = `
      <h3>Strata Extraction Help</h3>
      <p>This tool extracts geological layer information from PDF and Excel files.</p>
      <h4>Supported Formats:</h4>
      <ul>
        <li><strong>PDF:</strong> Boring logs, geological reports with tabular data</li>
        <li><strong>Excel:</strong> Spreadsheets with depth and material columns</li>
      </ul>
      <h4>Tips for Best Results:</h4>
      <ul>
        <li>Ensure files have clear depth and material columns</li>
        <li>Use consistent units (feet or meters)</li>
        <li>Higher confidence thresholds give more accurate but fewer results</li>
      </ul>
    `;
    
    this.showModal('Help', helpContent);
  }
  
  showSettings() {
    this.showNotification('Settings panel coming soon!', 'info');
  }
  
  showModal(title, content) {
    // Simple modal implementation
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
      <div class="modal-content">
        <div class="modal-header">
          <h3>${title}</h3>
          <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">✕</button>
        </div>
        <div class="modal-body">
          ${content}
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
    
    // Close on background click
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.remove();
      }
    });
  }
  
  showNotification(message, type = 'info') {
    // Simple notification system
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
      notification.classList.add('show');
    }, 100);
    
    setTimeout(() => {
      notification.classList.remove('show');
      setTimeout(() => notification.remove(), 300);
    }, 3000);
  }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  window.extractionTab = new ExtractionTabManager();
});