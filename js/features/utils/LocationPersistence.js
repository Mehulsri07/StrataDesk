// Location Persistence - Handles saving and restoring location data
class LocationPersistence {
  constructor() {
    this.storageKey = 'strataLastLocation';
    this.historyKey = 'strataLocationHistory';
    this.maxHistoryItems = 10;
  }

  // Save location data
  saveLocation(locationData) {
    try {
      const savedLocation = {
        ...locationData,
        timestamp: Date.now(),
        sessionId: this.getSessionId()
      };

      localStorage.setItem(this.storageKey, JSON.stringify(savedLocation));
      this.addToHistory(savedLocation);
      
      Logger.debug('Location saved', savedLocation);
      return true;
    } catch (error) {
      Logger.error('Failed to save location', { error: error.message });
      return false;
    }
  }

  // Get last saved location
  getLastLocation() {
    try {
      const saved = localStorage.getItem(this.storageKey);
      if (!saved) return null;

      const location = JSON.parse(saved);
      
      // Check if location is recent (within 24 hours)
      const age = Date.now() - location.timestamp;
      const maxAge = 24 * 60 * 60 * 1000; // 24 hours
      
      if (age > maxAge) {
        this.clearLastLocation();
        return null;
      }

      Logger.debug('Last location retrieved', location);
      return location;
    } catch (error) {
      Logger.error('Failed to retrieve last location', { error: error.message });
      return null;
    }
  }

  // Clear last location
  clearLastLocation() {
    try {
      localStorage.removeItem(this.storageKey);
      Logger.debug('Last location cleared');
    } catch (error) {
      Logger.error('Failed to clear last location', { error: error.message });
    }
  }

  // Add location to history
  addToHistory(location) {
    try {
      let history = this.getLocationHistory();
      
      // Remove duplicate locations (same coordinates)
      history = history.filter(item => 
        !(Math.abs(item.lat - location.lat) < 0.000001 && 
          Math.abs(item.lng - location.lng) < 0.000001)
      );
      
      // Add new location to beginning
      history.unshift(location);
      
      // Limit history size
      if (history.length > this.maxHistoryItems) {
        history = history.slice(0, this.maxHistoryItems);
      }
      
      localStorage.setItem(this.historyKey, JSON.stringify(history));
      Logger.debug('Location added to history', { historySize: history.length });
    } catch (error) {
      Logger.error('Failed to add location to history', { error: error.message });
    }
  }

  // Get location history
  getLocationHistory() {
    try {
      const saved = localStorage.getItem(this.historyKey);
      return saved ? JSON.parse(saved) : [];
    } catch (error) {
      Logger.error('Failed to retrieve location history', { error: error.message });
      return [];
    }
  }

  // Clear location history
  clearHistory() {
    try {
      localStorage.removeItem(this.historyKey);
      Logger.debug('Location history cleared');
    } catch (error) {
      Logger.error('Failed to clear location history', { error: error.message });
    }
  }

  // Get or create session ID
  getSessionId() {
    let sessionId = sessionStorage.getItem('strataSessionId');
    if (!sessionId) {
      sessionId = 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
      sessionStorage.setItem('strataSessionId', sessionId);
    }
    return sessionId;
  }

  // Restore location on page load
  async restoreLastLocation(mapManager, uiManager) {
    const lastLocation = this.getLastLocation();
    if (!lastLocation) return false;

    try {
      // Set location on map
      if (mapManager && lastLocation.lat && lastLocation.lng) {
        mapManager.setLocationFromCoordinates(
          lastLocation.lat, 
          lastLocation.lng, 
          lastLocation.name || 'Restored location'
        );

        // Update UI status
        if (uiManager) {
          const locationStatus = document.getElementById('locationStatus');
          if (locationStatus) {
            const timeAgo = this.formatTimeAgo(lastLocation.timestamp);
            locationStatus.textContent = `🔄 Restored: ${lastLocation.name || 'Previous location'} (${timeAgo})`;
            locationStatus.className = 'location-status status-info';
          }

          // Show subtle notification
          UTILS.showToast(`Location restored from ${timeAgo}`, 'info');
        }
      }

      Logger.info('Location restored successfully', {
        name: lastLocation.name,
        age: Date.now() - lastLocation.timestamp
      });

      return true;
    } catch (error) {
      Logger.error('Failed to restore location', { error: error.message });
      return false;
    }
  }

  // Format time ago string
  formatTimeAgo(timestamp) {
    const now = Date.now();
    const diff = now - timestamp;
    
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (minutes < 1) return 'just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  }

  // Get location statistics
  getLocationStats() {
    const history = this.getLocationHistory();
    const lastLocation = this.getLastLocation();
    
    return {
      totalLocations: history.length,
      lastLocationAge: lastLocation ? Date.now() - lastLocation.timestamp : null,
      oldestLocationAge: history.length > 0 ? Date.now() - history[history.length - 1].timestamp : null,
      averageSessionsPerDay: this.calculateAverageSessionsPerDay(history)
    };
  }

  // Calculate average sessions per day
  calculateAverageSessionsPerDay(history) {
    if (history.length === 0) return 0;
    
    const sessions = new Set(history.map(item => item.sessionId));
    const oldestTimestamp = history[history.length - 1].timestamp;
    const daysDiff = (Date.now() - oldestTimestamp) / (1000 * 60 * 60 * 24);
    
    return daysDiff > 0 ? sessions.size / daysDiff : 0;
  }

  // Export location data
  exportLocationData() {
    const data = {
      lastLocation: this.getLastLocation(),
      history: this.getLocationHistory(),
      stats: this.getLocationStats(),
      exportTimestamp: Date.now()
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { 
      type: 'application/json' 
    });
    
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `strata-locations-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  // Import location data
  async importLocationData(file) {
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      
      if (data.lastLocation) {
        localStorage.setItem(this.storageKey, JSON.stringify(data.lastLocation));
      }
      
      if (data.history && Array.isArray(data.history)) {
        localStorage.setItem(this.historyKey, JSON.stringify(data.history));
      }
      
      Logger.info('Location data imported successfully');
      return true;
    } catch (error) {
      Logger.error('Failed to import location data', { error: error.message });
      return false;
    }
  }
}

// Create global instance
window.LocationPersistence = new LocationPersistence();

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = LocationPersistence;
}