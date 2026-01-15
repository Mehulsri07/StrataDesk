/**
 * Main Tab Manager
 * Handles switching between main content tabs (Map, Extraction, Files)
 */

class TabManager {
  constructor() {
    this.currentTab = 'map';
    this.init();
  }
  
  init() {
    this.setupTabListeners();
    console.log('TabManager initialized');
  }
  
  setupTabListeners() {
    // Global function for tab switching
    window.switchMainTab = (tabName) => this.switchTab(tabName);
  }
  
  switchTab(tabName) {
    if (this.currentTab === tabName) return;
    
    console.log(`Switching to tab: ${tabName}`);
    
    // Update tab buttons
    const tabButtons = document.querySelectorAll('.tab-btn');
    tabButtons.forEach(btn => {
      if (btn.dataset.tab === tabName) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });
    
    // Update tab content
    const tabContents = document.querySelectorAll('.tab-content');
    tabContents.forEach(content => {
      if (content.dataset.tab === tabName) {
        content.classList.add('active');
      } else {
        content.classList.remove('active');
      }
    });
    
    this.currentTab = tabName;
    
    // Trigger tab-specific initialization
    this.onTabActivated(tabName);
  }
  
  onTabActivated(tabName) {
    switch (tabName) {
      case 'map':
        // Refresh map if needed
        if (window.mapManager && window.mapManager.map) {
          setTimeout(() => {
            window.mapManager.map.invalidateSize();
          }, 100);
        }
        break;
        
      case 'extraction':
        // Initialize extraction tab if needed
        if (window.extractionTab) {
          console.log('Extraction tab activated');
        }
        break;
        
      case 'files':
        // Refresh file list if needed
        if (window.fileManager) {
          console.log('Files tab activated');
        }
        break;
    }
  }
  
  getActiveTab() {
    return this.currentTab;
  }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  window.tabManager = new TabManager();
});