// Main application initialization and coordination
class StrataApp {
  constructor() {
    this.isInitialized = false;
    this.version = '2.0.0';
    this.initializationErrors = [];
  }

  // Initialize the application
  async init() {
    if (this.isInitialized) return;

    try {
      console.log(`🗺️ StrataDesk v${this.version} - Initializing...`);
      
      // Check if running in Electron
      if (typeof window.electronAPI !== 'undefined') {
        console.log('✅ Running in Electron desktop app');
        this.setupElectronIntegration();
      }
      
      // Wait for external libraries to load
      await this.waitForLibraries();
      console.log('✅ External libraries loaded');
      
      // Wait for core modules to be available
      await this.waitForCoreModules();
      console.log('✅ Core modules loaded');
      
      // Initialize database first
      await db.init();
      console.log('✅ Database initialized');

      // Initialize authentication
      const isLoggedIn = await auth.init();
      console.log('✅ Authentication initialized');

      // Initialize UI manager
      await uiManager.init();
      console.log('✅ UI manager initialized');

      // Show appropriate interface
      if (isLoggedIn) {
        await uiManager.showApp();
        console.log('✅ App interface loaded');
      } else {
        uiManager.showLogin();
        console.log('✅ Login interface loaded');
      }

      // Add global error handler
      this.setupErrorHandling();

      // Add visibility change handler for cleanup
      this.setupVisibilityHandler();

      // Show initialization complete message
      this.showWelcomeMessage();

      this.isInitialized = true;
      console.log('🎉 StrataDesk initialization complete!');

    } catch (error) {
      console.error('❌ Application initialization failed:', error);
      this.initializationErrors.push(error);
      this.showInitializationError(error);
    }
  }

  // Show system status after initialization
  showSystemStatus() {
    const status = {
      version: this.version,
      offline_mode: offlineManager?.getOfflineStatus()?.offlineMode || true,
      enhanced_database: typeof enhancedDb !== 'undefined',
      state_management: typeof appState !== 'undefined',
      validation_engine: typeof validationEngine !== 'undefined',
      enhanced_features: window.enhancedFeaturesAvailable || false
    };
    
    console.log('📊 System Status:', status);
    
    // Show offline indicator
    if (status.offline_mode) {
      setTimeout(() => {
        if (typeof UTILS !== 'undefined') {
          UTILS.showToast('🔌 Running in offline-first mode - all data stored locally', 'info');
        }
      }, 2000);
    }
  }

  // Initialize Logger with fallback (removed - no longer needed here)
  // Logger initialization is now handled by the dynamic loading system

  // Setup global error handling
  setupErrorHandling() {
    // Handle uncaught errors
    window.addEventListener('error', (event) => {
      console.error('Uncaught error:', event.error);
      UTILS.showToast('An unexpected error occurred. Please refresh the page.', 'error');
    });

    // Handle unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      console.error('Unhandled promise rejection:', event.reason);
      UTILS.showToast('An unexpected error occurred. Please try again.', 'error');
      event.preventDefault(); // Prevent default browser behavior
    });

    // Handle IndexedDB errors
    window.addEventListener('storage', (event) => {
      if (event.key === 'strataUser' && event.newValue === null) {
        // User was logged out in another tab
        if (auth.isAuthenticated()) {
          auth.logout();
          uiManager.showLogin();
          UTILS.showToast('You have been logged out', 'info');
        }
      }
    });
  }

  // Wait for external libraries to load
  async waitForLibraries() {
    const maxWait = 5000; // 5 seconds (reduced from 10)
    const checkInterval = 100; // 100ms
    let waited = 0;

    return new Promise((resolve, reject) => {
      const checkLibraries = () => {
        // Check if required libraries are loaded
        const bcryptLoaded = typeof window.bcryptjs !== 'undefined';
        const jszipLoaded = typeof window.JSZip !== 'undefined';
        const leafletLoaded = typeof window.L !== 'undefined';

        // JSZip and Leaflet are required, bcrypt is optional (we have fallback)
        const requiredLoaded = jszipLoaded && leafletLoaded;

        if (requiredLoaded) {
          if (!bcryptLoaded) {
            console.warn('bcryptjs failed to load, using SimpleHash fallback');
          }
          resolve();
          return;
        }

        waited += checkInterval;
        if (waited >= maxWait) {
          const missing = [];
          if (!jszipLoaded) missing.push('JSZip');
          if (!leafletLoaded) missing.push('Leaflet');
          
          reject(new Error(`Critical libraries failed to load: ${missing.join(', ')}`));
          return;
        }

        setTimeout(checkLibraries, checkInterval);
      };

      checkLibraries();
    });
  }

  // Wait for core modules to be available
  async waitForCoreModules() {
    const maxWait = 3000; // 3 seconds
    const checkInterval = 50; // 50ms
    let waited = 0;

    return new Promise((resolve, reject) => {
      const checkModules = () => {
        // Check if required modules are loaded
        const dbLoaded = typeof window.db !== 'undefined';
        const authLoaded = typeof window.auth !== 'undefined';
        const uiManagerLoaded = typeof window.uiManager !== 'undefined';
        const utilsLoaded = typeof window.UTILS !== 'undefined';
        const configLoaded = typeof window.CONFIG !== 'undefined';

        // Optional managers (create fallbacks if missing)
        if (typeof window.projectManager === 'undefined') {
          console.warn('ProjectManager not loaded, creating fallback');
          window.projectManager = { init: async () => {}, loadProjects: async () => [], getProjects: () => [] };
        }
        if (typeof window.fileManager === 'undefined') {
          console.warn('FileManager not loaded, creating fallback');
          window.fileManager = { init: async () => {}, loadProjectFiles: async () => [], clearSelectedFiles: () => {} };
        }
        if (typeof window.searchManager === 'undefined') {
          console.warn('SearchManager not loaded, creating fallback');
          window.searchManager = { init: async () => {} };
        }
        if (typeof window.mapManager === 'undefined') {
          console.warn('MapManager not loaded, creating fallback');
          window.mapManager = { init: async () => {}, enterClickMode: () => {}, setLocationFromCoordinates: () => {} };
        }

        const allLoaded = dbLoaded && authLoaded && uiManagerLoaded && utilsLoaded && configLoaded;

        if (allLoaded) {
          resolve();
          return;
        }

        waited += checkInterval;
        if (waited >= maxWait) {
          const missing = [];
          if (!dbLoaded) missing.push('Database');
          if (!authLoaded) missing.push('Auth');
          if (!uiManagerLoaded) missing.push('UI Manager');
          if (!utilsLoaded) missing.push('UTILS');
          if (!configLoaded) missing.push('CONFIG');
          
          reject(new Error(`Core modules failed to load: ${missing.join(', ')}`));
          return;
        }

        setTimeout(checkModules, checkInterval);
      };

      checkModules();
    });
  }

  // Setup visibility change handler
  setupVisibilityHandler() {
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        // Page is hidden - save any pending data
        this.onPageHidden();
      } else {
        // Page is visible - refresh data if needed
        this.onPageVisible();
      }
    });

    // Handle page unload
    window.addEventListener('beforeunload', (event) => {
      this.onPageUnload(event);
    });
  }

  // Handle page hidden
  onPageHidden() {
    // Save UI settings
    if (uiManager) {
      uiManager.saveSettings();
    }

    // Save current project
    if (projectManager && projectManager.getCurrentProject()) {
      localStorage.setItem('strataCurrentProject', projectManager.getCurrentProject().id);
    }
  }

  // Handle page visible
  onPageVisible() {
    // Refresh data if needed
    if (this.isInitialized && auth.isAuthenticated()) {
      // Check if we need to refresh anything
      this.refreshDataIfNeeded();
    }
  }

  // Handle page unload
  onPageUnload(event) {
    // Save any pending data
    this.onPageHidden();

    // Show confirmation if there are unsaved changes
    const hasUnsavedChanges = this.checkForUnsavedChanges();
    if (hasUnsavedChanges) {
      event.preventDefault();
      event.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
      return event.returnValue;
    }
  }

  // Check for unsaved changes
  checkForUnsavedChanges() {
    // Check if there are selected files that haven't been saved
    if (fileManager && fileManager.getSelectedFiles().length > 0) {
      return true;
    }

    // Check if form has data
    const formFields = ['boreId', 'waterLevel', 'tags', 'notes'];
    for (const fieldId of formFields) {
      const field = document.getElementById(fieldId);
      if (field && field.value.trim()) {
        return true;
      }
    }

    return false;
  }

  // Refresh data if needed
  async refreshDataIfNeeded() {
    try {
      // Refresh projects if needed
      if (projectManager) {
        await projectManager.loadProjects();
      }

      // Refresh map markers if needed
      if (mapManager && mapManager.getMap()) {
        await mapManager.refreshMarkers();
      }
    } catch (error) {
      console.warn('Failed to refresh data:', error);
    }
  }

  // Show welcome message
  showWelcomeMessage() {
    // Only show on first visit
    const hasSeenWelcome = localStorage.getItem('strataWelcomeSeen');
    if (!hasSeenWelcome) {
      setTimeout(() => {
        UTILS.showToast('Welcome to StrataDesk! Click the 💡 Show Tips button for help.', 'info');
        localStorage.setItem('strataWelcomeSeen', 'true');
      }, 1000);
    }
  }

  // Show initialization error
  showInitializationError(error) {
    const errorDiv = document.createElement('div');
    errorDiv.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: #fee2e2;
      border: 1px solid #fecaca;
      border-radius: 8px;
      padding: 20px;
      max-width: 400px;
      text-align: center;
      z-index: 9999;
      font-family: system-ui, sans-serif;
    `;
    
    errorDiv.innerHTML = `
      <h3 style="margin: 0 0 12px 0; color: #dc2626;">Initialization Failed</h3>
      <p style="margin: 0 0 16px 0; color: #7f1d1d;">
        StrataDesk failed to initialize properly. This might be due to:
      </p>
      <ul style="text-align: left; color: #7f1d1d; margin: 0 0 16px 0;">
        <li>Browser compatibility issues</li>
        <li>Insufficient storage space</li>
        <li>Network connectivity problems</li>
      </ul>
      <button onclick="location.reload()" style="
        background: #dc2626;
        color: white;
        border: none;
        padding: 8px 16px;
        border-radius: 4px;
        cursor: pointer;
        margin-right: 8px;
      ">Reload Page</button>
      <button onclick="this.parentElement.remove()" style="
        background: #6b7280;
        color: white;
        border: none;
        padding: 8px 16px;
        border-radius: 4px;
        cursor: pointer;
      ">Dismiss</button>
      <details style="margin-top: 12px; text-align: left;">
        <summary style="cursor: pointer; color: #7f1d1d;">Technical Details</summary>
        <pre style="font-size: 12px; color: #7f1d1d; margin: 8px 0 0 0; white-space: pre-wrap;">${error.message}</pre>
      </details>
    `;
    
    document.body.appendChild(errorDiv);
  }

  // Get application info
  getInfo() {
    return {
      version: this.version,
      initialized: this.isInitialized,
      user: auth.getCurrentUser(),
      theme: uiManager.currentTheme,
      database: db.isInitialized,
      components: {
        auth: !!window.auth,
        projectManager: !!window.projectManager,
        fileManager: !!window.fileManager,
        mapManager: !!window.mapManager,
        searchManager: !!window.searchManager,
        uiManager: !!window.uiManager
      }
    };
  }

  // Reset application (for testing/debugging)
  async reset() {
    const confirmed = confirm('This will delete all data and reset the application. Are you sure?');
    if (!confirmed) return;

    try {
      // Clear database
      await db.clearAll();
      
      // Clear localStorage
      localStorage.clear();
      
      // Reload page
      location.reload();
    } catch (error) {
      console.error('Reset failed:', error);
      UTILS.showToast('Reset failed. Please refresh the page manually.', 'error');
    }
  }

  // Export debug info
  async getDebugInfo() {
    const info = this.getInfo();
    const stats = await db.getStats();
    
    return {
      ...info,
      stats,
      userAgent: navigator.userAgent,
      timestamp: new Date().toISOString(),
      localStorage: {
        keys: Object.keys(localStorage),
        size: JSON.stringify(localStorage).length
      },
      errors: this.getRecentErrors()
    };
  }

  // Get recent errors (if we were tracking them)
  getRecentErrors() {
    // This would return recent errors if we were storing them
    return [];
  }

  // Setup Electron integration
  setupElectronIntegration() {
    // Listen for menu actions
    window.electronAPI.onMenuAction((action, data) => {
      this.handleMenuAction(action, data);
    });

    // Update window title with current project
    this.updateWindowTitle();
  }

  // Handle menu actions from Electron
  async handleMenuAction(action, data) {
    try {
      switch (action) {
        case 'new-project':
          document.getElementById('newProjectName')?.focus();
          break;
          
        case 'export-project':
          const currentProject = projectManager.getCurrentProject();
          if (currentProject && fileManager.exportProjectAsZip) {
            await fileManager.exportProjectAsZip(currentProject.id);
          } else {
            UTILS.showToast('Please select a project to export', 'warning');
          }
          break;
          
        case 'export-backup':
          if (fileManager.exportAllData) {
            await fileManager.exportAllData();
          }
          break;
          
        case 'search':
          document.getElementById('searchQ')?.focus();
          break;
          
        case 'toggle-theme':
          if (uiManager) {
            uiManager.toggleTheme();
          }
          break;
          
        case 'add-boring':
          document.getElementById('boreId')?.focus();
          break;
      }
    } catch (error) {
      console.error('Menu action failed:', error);
      UTILS.showToast('Action failed: ' + error.message, 'error');
    }
  }

  // Update window title
  updateWindowTitle(projectName) {
    if (typeof window.electronAPI === 'undefined') return;
    
    let title = 'StrataDesk';
    if (projectName) {
      title += ` - ${projectName}`;
    }
    
    document.title = title;
  }
}

// Create and initialize the application
const app = new StrataApp();

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => app.init());
} else {
  app.init();
}

// Make app available globally for debugging
window.strataApp = app;

// Add some helpful global functions for debugging
window.debugStrataDesk = {
  getInfo: () => app.getInfo(),
  getDebugInfo: () => app.getDebugInfo(),
  reset: () => app.reset(),
  exportData: () => db.exportData(),
  clearSearch: () => searchManager.clearSearch(),
  refreshMap: () => mapManager.refreshMarkers(),
  version: app.version
};

// Electron window controls
if (typeof window.electronAPI !== 'undefined') {
  console.log('Setting up Electron window controls...');
  
  // Setup window controls
  const setupWindowControls = () => {
    const minimizeBtn = document.getElementById('titlebarMinimize');
    const maximizeBtn = document.getElementById('titlebarMaximize');
    const closeBtn = document.getElementById('titlebarClose');

    if (minimizeBtn) {
      minimizeBtn.addEventListener('click', () => {
        console.log('Minimize clicked');
        window.electronAPI.windowMinimize();
      });
    }

    if (maximizeBtn) {
      maximizeBtn.addEventListener('click', () => {
        console.log('Maximize clicked');
        window.electronAPI.windowMaximize();
      });
    }

    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        console.log('Close clicked');
        window.electronAPI.windowClose();
      });
    }

    // Listen for window state changes to update maximize button icon
    window.electronAPI.onWindowStateChange((state) => {
      if (maximizeBtn) {
        const svg = maximizeBtn.querySelector('svg');
        if (svg) {
          if (state.maximized) {
            // Show restore icon (two overlapping rectangles)
            svg.innerHTML = `
              <rect x="4" y="4" width="6" height="6" stroke="currentColor" stroke-width="1.5" fill="none"/>
              <path d="M4 2 L10 2 L10 8" stroke="currentColor" stroke-width="1.5" fill="none"/>
            `;
            maximizeBtn.title = 'Restore';
          } else {
            // Show maximize icon (single rectangle)
            svg.innerHTML = `
              <rect x="2" y="2" width="8" height="8" stroke="currentColor" stroke-width="1.5" fill="none"/>
            `;
            maximizeBtn.title = 'Maximize';
          }
        }
      }
    });

    console.log('✅ Window controls initialized');
  };

  // Setup project name in titlebar
  const updateTitlebarProject = (projectName) => {
    const titlebarProject = document.getElementById('titlebarProject');
    if (titlebarProject) {
      titlebarProject.textContent = projectName ? ` - ${projectName}` : '';
    }
  };

  // Initialize window controls when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setupWindowControls);
  } else {
    // Small delay to ensure elements exist
    setTimeout(setupWindowControls, 100);
  }

  // Export function for updating project name
  window.updateTitlebarProject = updateTitlebarProject;
} else {
  console.log('Not running in Electron, skipping window controls setup');
  
  // For browser mode, hide the titlebar or make buttons work differently
  const titlebar = document.querySelector('.electron-titlebar');
  if (titlebar) {
    titlebar.style.display = 'none';
  }
}