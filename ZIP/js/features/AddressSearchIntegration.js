// Enhanced Address Search Integration - Main orchestrator
class AddressSearchIntegration {
  constructor() {
    this.searchController = null;
    this.dropdownController = null;
    this.keyboardController = null;
    this.ghostMarker = null;
    this.searchTimeout = null;
    this.isInitialized = false;
    this.networkStatus = navigator.onLine;
    
    // Bind methods
    this.handleSearch = this.handleSearch.bind(this);
    this.handleSelect = this.handleSelect.bind(this);
    this.handlePreview = this.handlePreview.bind(this);
    this.handleNetworkChange = this.handleNetworkChange.bind(this);
  }

  // Initialize the address search system
  async init() {
    if (this.isInitialized) return;

    // Ensure Logger is available
    if (typeof Logger === 'undefined' || !Logger) {
      console.warn('Logger not available, using console fallback');
      window.Logger = {
        debug: (msg, data) => console.debug(msg, data),
        info: (msg, data) => console.info(msg, data),
        warn: (msg, data) => console.warn(msg, data),
        error: (msg, data) => console.error(msg, data),
        userAction: (action, data) => console.info(`User: ${action}`, data),
        time: (label) => ({ end: () => console.info(`${label} completed`) })
      };
    }

    try {
      Logger.info('Initializing enhanced address search system');
      
      // Get DOM elements
      const addressInput = document.getElementById('addressSearch');
      const addressDropdown = document.getElementById('addressDropdown');
      
      if (!addressInput || !addressDropdown) {
        throw new Error('Required DOM elements not found');
      }

      // Initialize controllers
      this.searchController = new AddressSearchController();
      this.dropdownController = new DropdownController(addressDropdown, addressInput);
      this.keyboardController = new KeyboardNavigationController(addressInput, this.dropdownController);

      // Set up callbacks
      this.setupCallbacks();
      
      // Set up input event listeners
      this.setupInputListeners(addressInput);
      
      // Set up network monitoring
      this.setupNetworkMonitoring();
      
      // Restore last location if available
      await this.restoreLastLocation();
      
      // Add loading state support to input
      this.setupLoadingState(addressInput);

      this.isInitialized = true;
      Logger.info('Address search system initialized successfully');
      
    } catch (error) {
      Logger.error('Failed to initialize address search system', { error: error.message });
      throw error;
    }
  }

  // Setup controller callbacks
  setupCallbacks() {
    // Dropdown callbacks
    this.dropdownController.onOptionSelect(this.handleSelect);
    this.dropdownController.onOptionPreview(this.handlePreview);

    // Keyboard callbacks
    this.keyboardController.onSearchTrigger(this.handleSearch);
    this.keyboardController.onOptionSelect(this.handleSelect);
    this.keyboardController.onCancelAction(() => {
      this.clearPreview();
      this.dropdownController.hide();
    });
  }

  // Setup input event listeners
  setupInputListeners(input) {
    // Debounced search on input
    input.addEventListener('input', (e) => {
      clearTimeout(this.searchTimeout);
      const query = e.target.value.trim();
      
      if (query.length === 0) {
        this.dropdownController.hide();
        this.clearPreview();
        return;
      }
      
      if (query.length >= CONFIG.SEARCH.MIN_QUERY_LENGTH) {
        this.searchTimeout = setTimeout(() => {
          this.handleSearch(query);
        }, CONFIG.UI.ADDRESS_SEARCH_DEBOUNCE);
      }
    });

    // Handle paste events
    input.addEventListener('paste', (e) => {
      setTimeout(() => {
        const query = e.target.value.trim();
        if (query.length >= CONFIG.SEARCH.MIN_QUERY_LENGTH) {
          this.handleSearch(query);
        }
      }, 100);
    });
  }

  // Setup network monitoring
  setupNetworkMonitoring() {
    window.addEventListener('online', this.handleNetworkChange);
    window.addEventListener('offline', this.handleNetworkChange);
    
    // Create network status indicator
    this.createNetworkStatusIndicator();
    
    // Initial status
    this.updateNetworkStatus();
  }

  // Handle network status changes
  handleNetworkChange() {
    const wasOnline = this.networkStatus;
    this.networkStatus = navigator.onLine;
    
    Logger.info(`Network status changed: ${this.networkStatus ? 'online' : 'offline'}`);
    
    if (!wasOnline && this.networkStatus) {
      UTILS.showToast('Connection restored', 'success');
    } else if (wasOnline && !this.networkStatus) {
      UTILS.showToast('Connection lost - using offline mode', 'warning');
      this.dropdownController.showOffline();
    }
    
    this.updateNetworkStatus();
  }

  // Create network status indicator
  createNetworkStatusIndicator() {
    const indicator = document.createElement('div');
    indicator.id = 'networkStatus';
    indicator.className = 'network-status';
    document.body.appendChild(indicator);
  }

  // Update network status indicator
  updateNetworkStatus() {
    const indicator = document.getElementById('networkStatus');
    if (!indicator) return;
    
    if (this.networkStatus) {
      indicator.className = 'network-status online';
      indicator.textContent = '🌐 Online';
      indicator.classList.remove('show');
    } else {
      indicator.className = 'network-status offline show';
      indicator.textContent = '📡 Offline Mode';
    }
  }

  // Setup loading state for input
  setupLoadingState(input) {
    this.setInputLoading = (loading) => {
      if (loading) {
        input.classList.add('address-search-loading');
      } else {
        input.classList.remove('address-search-loading');
      }
    };
  }

  // Handle search requests
  async handleSearch(query) {
    if (!query || query.length < CONFIG.SEARCH.MIN_QUERY_LENGTH) {
      return;
    }

    // Check network status
    if (!this.networkStatus) {
      this.dropdownController.showOffline();
      return;
    }

    Logger.userAction('Address search', { query });
    
    try {
      // Show loading state
      this.setInputLoading(true);
      this.dropdownController.showLoading();
      this.updateLocationStatus('🔍 Searching...', 'info');

      // Perform search
      const timer = Logger.time('Address search');
      const results = await this.searchController.searchAddress(query);
      timer.end({ resultCount: results.length });

      // Update UI with results
      if (results && results.length > 0) {
        this.dropdownController.show(results);
        this.keyboardController.onResultsUpdate(results);
        this.updateLocationStatus(
          `Found ${results.length} location${results.length === 1 ? '' : 's'} - select one below`,
          'info'
        );
        
        Logger.info('Address search completed', { 
          query, 
          resultCount: results.length 
        });
      } else {
        this.dropdownController.show([]);
        this.updateLocationStatus(
          '❌ No locations found. Try different terms or click on map.',
          'error'
        );
        
        Logger.info('Address search returned no results', { query });
      }

    } catch (error) {
      Logger.error('Address search failed', { query, error: error.message });
      
      this.dropdownController.showError('Search failed. Please try again.');
      this.updateLocationStatus(
        '❌ Search failed. Click on map instead.',
        'error'
      );
      
      UTILS.showToast('Search failed. Please try again.', 'error');
    } finally {
      this.setInputLoading(false);
    }
  }

  // Handle location selection
  handleSelect(result, index) {
    if (!result) return;

    Logger.userAction('Location selected', {
      name: result.name,
      type: result.type,
      confidence: result.confidence,
      lat: result.lat,
      lng: result.lng
    });

    try {
      // Clear preview
      this.clearPreview();
      
      // Set location on map
      if (mapManager) {
        if (result.boundingBox) {
          // Use bounding box for better zoom level
          this.fitMapToBounds(result.boundingBox);
        } else {
          mapManager.setLocationFromCoordinates(result.lat, result.lng, result.name);
        }
      }

      // Update location status
      this.updateLocationStatus(
        `✅ ${this.truncateText(result.name, 50)}`,
        'success'
      );

      // Save location for persistence
      LocationPersistence.saveLocation({
        lat: result.lat,
        lng: result.lng,
        name: result.name,
        type: result.type,
        confidence: result.confidence,
        placeId: result.placeId,
        searchQuery: document.getElementById('addressSearch').value
      });

      // Clear search input and hide dropdown
      const addressSearch = document.getElementById('addressSearch');
      if (addressSearch) {
        addressSearch.value = '';
      }
      this.dropdownController.hide();

      // Show success message
      UTILS.showToast(`Location selected: ${this.truncateText(result.name, 30)}`, 'success');

    } catch (error) {
      Logger.error('Failed to select location', { result, error: error.message });
      UTILS.showToast('Failed to set location', 'error');
    }
  }

  // Handle location preview (hover/keyboard)
  handlePreview(result, index, source) {
    if (!result || !mapManager) {
      this.clearPreview();
      return;
    }

    try {
      // Create or update ghost marker
      if (this.ghostMarker) {
        mapManager.map.removeLayer(this.ghostMarker);
      }

      this.ghostMarker = L.marker([result.lat, result.lng], {
        icon: L.icon({
          iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-grey.png',
          shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
          iconSize: [25, 41],
          iconAnchor: [12, 41],
          popupAnchor: [1, -34],
          shadowSize: [41, 41],
          className: 'ghost-marker'
        })
      }).addTo(mapManager.map);

      // Show preview popup
      this.ghostMarker.bindPopup(`
        <div class="preview-popup">
          <strong>${result.name}</strong><br>
          <small>📍 ${result.lat.toFixed(6)}, ${result.lng.toFixed(6)}</small><br>
          <small>Confidence: ${result.confidence} ${this.getConfidenceIcon(result.confidence)}</small>
        </div>
      `).openPopup();

      Logger.debug('Location preview shown', { 
        name: result.name, 
        source 
      });

    } catch (error) {
      Logger.error('Failed to show location preview', { result, error: error.message });
    }
  }

  // Clear location preview
  clearPreview() {
    if (this.ghostMarker && mapManager) {
      mapManager.map.removeLayer(this.ghostMarker);
      this.ghostMarker = null;
    }
  }

  // Fit map to bounding box
  fitMapToBounds(boundingBox) {
    if (!mapManager || !boundingBox) return;

    const bounds = L.latLngBounds(
      [boundingBox.south, boundingBox.west],
      [boundingBox.north, boundingBox.east]
    );

    mapManager.map.fitBounds(bounds, {
      padding: [20, 20],
      maxZoom: 16
    });
  }

  // Update location status
  updateLocationStatus(message, type) {
    const locationStatus = document.getElementById('locationStatus');
    if (locationStatus) {
      locationStatus.textContent = message;
      locationStatus.className = `location-status status-${type}`;
    }
  }

  // Restore last location on page load
  async restoreLastLocation() {
    try {
      const restored = await LocationPersistence.restoreLastLocation(mapManager, uiManager);
      if (restored) {
        Logger.info('Last location restored successfully');
      }
    } catch (error) {
      Logger.error('Failed to restore last location', { error: error.message });
    }
  }

  // Get confidence icon
  getConfidenceIcon(confidence) {
    const iconMap = {
      'high': '🟢',
      'medium': '🟡',
      'low': '🟠'
    };
    return iconMap[confidence] || '⚪';
  }

  // Truncate text for display
  truncateText(text, maxLength) {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength - 3) + '...';
  }

  // Clear search and reset state
  clearSearch() {
    const addressSearch = document.getElementById('addressSearch');
    if (addressSearch) {
      addressSearch.value = '';
    }
    
    this.dropdownController.hide();
    this.clearPreview();
    this.updateLocationStatus('', '');
    
    Logger.userAction('Search cleared');
  }

  // Get search statistics
  getSearchStats() {
    return {
      cacheSize: this.searchController?.cache?.size || 0,
      networkStatus: this.networkStatus,
      isInitialized: this.isInitialized
    };
  }

  // Cleanup and destroy
  destroy() {
    // Clear timeouts
    if (this.searchTimeout) {
      clearTimeout(this.searchTimeout);
    }

    // Remove event listeners
    window.removeEventListener('online', this.handleNetworkChange);
    window.removeEventListener('offline', this.handleNetworkChange);

    // Clear preview
    this.clearPreview();

    // Cancel any ongoing searches
    if (this.searchController) {
      this.searchController.cancelCurrentSearch();
    }

    // Destroy controllers
    if (this.keyboardController) {
      this.keyboardController.destroy();
    }

    if (this.dropdownController) {
      this.dropdownController.destroy();
    }

    // Remove network status indicator
    const indicator = document.getElementById('networkStatus');
    if (indicator) {
      indicator.remove();
    }

    this.isInitialized = false;
    Logger.info('Address search system destroyed');
  }
}

// Create global instance
window.AddressSearchIntegration = AddressSearchIntegration;

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = AddressSearchIntegration;
}