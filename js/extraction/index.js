/**
 * Strata Chart Extraction Module
 * Main entry point for loading all extraction components
 */

// This file serves as the main entry point for the extraction module
// In browser environment, individual files are loaded via script tags
// In Node.js environment, this provides CommonJS exports

if (typeof module !== 'undefined' && module.exports) {
  // Node.js environment - export all modules
  const { StrataExtractor } = require('./StrataExtractor');
  const { ExcelProcessor } = require('./ExcelProcessor');
  const { PDFProcessor } = require('./PDFProcessor');
  const { ValidationService } = require('./ValidationService');
  const { ReviewInterface } = require('./ReviewInterface');
  const { ExtractionErrorHandler } = require('./ErrorHandler');
  const { Unit } = require('./Unit');
  const { StrataChart } = require('./StrataChart');
  const { ErrorClassifier } = require('./ErrorClassifier');
  const { DepthNormalizer } = require('./DepthNormalizer');
  const { FallbackManager } = require('./FallbackManager');

  module.exports = {
    StrataExtractor,
    ExcelProcessor,
    PDFProcessor,
    ValidationService,
    ReviewInterface,
    ExtractionErrorHandler,
    Unit,
    StrataChart,
    ErrorClassifier,
    DepthNormalizer,
    FallbackManager
  };
}

// Browser environment initialization
if (typeof window !== 'undefined') {
  // Create global extraction namespace
  window.StrataExtraction = window.StrataExtraction || {};
  
  // Initialize extraction system when DOM is ready
  document.addEventListener('DOMContentLoaded', () => {
    console.log('Strata Extraction module loaded');
    
    // Create singleton instances
    window.StrataExtraction.extractor = new StrataExtractor();
    window.StrataExtraction.errorHandler = new ExtractionErrorHandler();
    
    // Initialize extractor
    window.StrataExtraction.extractor.init().then(() => {
      console.log('StrataExtractor initialized');
      
      // Initialize ExtractionUI after extractor is ready
      initializeExtractionUI();
    }).catch(err => {
      console.error('Failed to initialize StrataExtractor:', err);
    });
  });
  
  /**
   * Initialize the ExtractionUI and integrate it with the main application
   */
  function initializeExtractionUI() {
    // Wait for required dependencies
    if (typeof window.ExtractionUI === 'undefined' || 
        typeof window.ReviewInterface === 'undefined' ||
        !window.StrataExtraction.extractor) {
      console.warn('ExtractionUI dependencies not ready, retrying...');
      setTimeout(initializeExtractionUI, 100);
      return;
    }
    
    try {
      // Create ReviewInterface instance
      const reviewInterface = new ReviewInterface({
        utils: window.UTILS,
        auth: window.auth,
        config: window.CONFIG,
        db: window.db
      });
      
      // Create ExtractionUI instance with dependencies
      const extractionUI = new ExtractionUI({
        strataExtractor: window.StrataExtraction.extractor,
        reviewInterface: reviewInterface,
        utils: window.UTILS
      });
      
      // Store instances globally
      window.StrataExtraction.extractionUI = extractionUI;
      window.StrataExtraction.reviewInterface = reviewInterface;
      
      // Integrate with file manager
      integrateWithFileManager(extractionUI);
      
      // Integrate with main UI
      integrateWithMainUI(extractionUI, reviewInterface);
      
      console.log('✅ ExtractionUI integrated successfully');
      
    } catch (error) {
      console.error('Failed to initialize ExtractionUI:', error);
    }
  }
  
  /**
   * Integrate ExtractionUI with the file manager
   */
  function integrateWithFileManager(extractionUI) {
    if (window.fileManager) {
      // Override the file selection handler to use ExtractionUI
      const originalHandleFileSelection = window.fileManager.handleFileSelection.bind(window.fileManager);
      
      window.fileManager.handleFileSelection = async function(files) {
        // Call original handler first
        await originalHandleFileSelection(files);
        
        // Then let ExtractionUI handle extraction-specific logic
        if (extractionUI && extractionUI.handleFileSelection) {
          extractionUI.handleFileSelection({ target: { files } });
        }
      };
      
      console.log('✅ ExtractionUI integrated with FileManager');
    }
  }
  
  /**
   * Integrate ExtractionUI with the main UI system
   */
  function integrateWithMainUI(extractionUI, reviewInterface) {
    // Add global functions for UI interaction
    window.cancelExtraction = () => extractionUI.cancelExtraction();
    window.reviewExtraction = () => extractionUI.reviewExtraction();
    window.acceptExtraction = () => extractionUI.acceptExtraction();
    window.rejectExtraction = () => extractionUI.rejectExtraction();
    window.toggleExtractionDetails = () => extractionUI.toggleExtractionDetails();
    
    // Add global review interface functions
    window.showStrataReview = (layers, metadata) => {
      reviewInterface.displayDraftLayers(layers, metadata);
      return reviewInterface;
    };
    
    window.hideStrataReview = () => {
      const modal = document.querySelector('.strata-review-modal');
      if (modal) {
        modal.style.display = 'none';
        document.body.classList.remove('modal-open');
      }
    };
    
    // Integrate with form submission
    const attachBtn = document.getElementById('attachBtn');
    if (attachBtn) {
      attachBtn.addEventListener('click', async (e) => {
        // Check if extraction is in progress
        if (extractionUI.currentExtraction) {
          e.preventDefault();
          
          const result = confirm('Extraction is in progress. Do you want to wait for it to complete?');
          if (result) {
            // Wait for extraction to complete
            await waitForExtractionComplete(extractionUI);
          } else {
            extractionUI.cancelExtraction();
          }
        }
      });
    }
    
    // Add keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      // Ctrl/Cmd + E for starting extraction
      if ((e.ctrlKey || e.metaKey) && e.key === 'e') {
        const fileInput = document.getElementById('fileInput');
        if (fileInput && fileInput.files.length > 0) {
          e.preventDefault();
          extractionUI.startExtraction(Array.from(fileInput.files));
        }
      }
      
      // Escape to cancel extraction
      if (e.key === 'Escape' && extractionUI.currentExtraction) {
        extractionUI.cancelExtraction();
      }
    });
    
    console.log('✅ ExtractionUI integrated with main UI');
  }
  
  /**
   * Wait for extraction to complete
   */
  function waitForExtractionComplete(extractionUI) {
    return new Promise((resolve) => {
      const checkInterval = setInterval(() => {
        if (!extractionUI.currentExtraction || extractionUI.extractionCancelled) {
          clearInterval(checkInterval);
          resolve();
        }
      }, 100);
    });
  }
}
