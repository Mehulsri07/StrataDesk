// Application configuration and constants
const CONFIG = {
  // Database configuration
  DB_NAME: 'StrataDesk',
  DB_VERSION: 3,
  
  // Store names
  STORES: {
    USERS: 'users',
    PROJECTS: 'projects',
    FILES: 'files'
  },
  
  // File upload limits
  MAX_FILE_SIZE: 50 * 1024 * 1024, // 50MB
  ALLOWED_TYPES: [
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel',
    'image/jpeg',
    'image/png',
    'image/gif'
  ],
  
  // Map configuration
  MAP: {
    DEFAULT_CENTER: [25.0, 82.0], // Default center for India
    DEFAULT_ZOOM: 6,
    CLICK_ZOOM: 15,
    TILE_PROVIDERS: [
      {
        name: 'OpenStreetMap',
        url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
        attribution: '© OpenStreetMap contributors'
      },
      {
        name: 'CartoDB',
        url: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
        attribution: '© OpenStreetMap contributors © CARTO'
      },
      {
        name: 'Esri',
        url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}',
        attribution: 'Tiles © Esri'
      }
    ]
  },
  
  // UI configuration
  UI: {
    SEARCH_DEBOUNCE: 300,
    ADDRESS_SEARCH_DEBOUNCE: 1000,
    ANIMATION_DURATION: 200,
    TOAST_DURATION: 1500
  },

  // Search configuration
  SEARCH: {
    CACHE_DURATION: 5 * 60 * 1000, // 5 minutes
    MAX_RESULTS: 5,
    MIN_QUERY_LENGTH: 3,
    REQUEST_TIMEOUT: 10000,
    RETRY_ATTEMPTS: 2
  },

  // Network configuration
  NETWORK: {
    OFFLINE_CHECK_INTERVAL: 30000, // 30 seconds
    RETRY_DELAY: 1000
  },

  // Debug configuration
  DEBUG: {
    LOG_LEVEL: 'info', // debug, info, warn, error
    PERFORMANCE_MONITORING: true
  },

  // Error reporting (optional)
  ERROR_REPORTING: {
    ENABLED: false,
    ENDPOINT: null
  },
  
  // Default values
  DEFAULTS: {
    DATE_FORMAT: 'YYYY-MM-DD',
    WATER_LEVEL_UNIT: 'ft',
    PROJECT_NAME_MAX_LENGTH: 100,
    BORE_ID_MAX_LENGTH: 50,
    TAGS_MAX_LENGTH: 200,
    NOTES_MAX_LENGTH: 1000
  }
};

// Simple password hashing (fallback if bcryptjs fails to load)
const SimpleHash = {
  // Simple hash function using Web Crypto API
  async hash(password, saltRounds = 10) {
    try {
      // Use Web Crypto API if available
      if (window.crypto && window.crypto.subtle) {
        const encoder = new TextEncoder();
        const data = encoder.encode(password + 'strata_salt_' + saltRounds);
        const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
      } else {
        // Fallback to simple hash
        let hash = 0;
        const str = password + 'strata_salt_' + saltRounds;
        for (let i = 0; i < str.length; i++) {
          const char = str.charCodeAt(i);
          hash = ((hash << 5) - hash) + char;
          hash = hash & hash; // Convert to 32bit integer
        }
        return Math.abs(hash).toString(16);
      }
    } catch (error) {
      console.warn('Crypto API failed, using simple hash:', error);
      // Very simple fallback
      let hash = 0;
      const str = password + 'strata_salt_' + saltRounds;
      for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
      }
      return Math.abs(hash).toString(16);
    }
  },

  // Simple compare function
  async compare(password, hash) {
    try {
      const newHash = await this.hash(password, 10);
      return newHash === hash;
    } catch (error) {
      console.error('Hash comparison failed:', error);
      return false;
    }
  }
};

// Utility functions
const UTILS = {
  // Generate unique ID
  uid: (prefix = 'x') => prefix + '_' + Math.random().toString(36).slice(2, 10),
  
  // Get current ISO timestamp
  nowISO: () => new Date().toISOString(),
  
  // Format date for display
  formatDate: (date) => {
    if (!date) return '';
    return new Date(date).toLocaleDateString();
  },
  
  // Format file size
  formatFileSize: (bytes) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  },
  
  // Debounce function
  debounce: (func, wait) => {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  },
  
  // Validate email
  isValidEmail: (email) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  },
  
  // Validate coordinates
  isValidCoordinates: (lat, lng) => {
    return !isNaN(lat) && !isNaN(lng) && 
           lat >= -90 && lat <= 90 && 
           lng >= -180 && lng <= 180;
  },
  
  // Parse coordinates from string
  parseCoordinates: (coordString) => {
    if (!coordString) return null;
    const parts = coordString.split(',').map(s => s.trim());
    if (parts.length !== 2) return null;
    const lat = parseFloat(parts[0]);
    const lng = parseFloat(parts[1]);
    return UTILS.isValidCoordinates(lat, lng) ? { lat, lng } : null;
  },
  
  // Sanitize filename
  sanitizeFilename: (filename) => {
    return filename.replace(/[^a-z0-9.-]/gi, '_').toLowerCase();
  },
  
  // Get file extension
  getFileExtension: (filename) => {
    return filename.split('.').pop().toLowerCase();
  },
  
  // Check if file type is allowed
  isAllowedFileType: (file) => {
    return CONFIG.ALLOWED_TYPES.includes(file.type);
  },
  
  // Show toast notification
  showToast: (message, type = 'info') => {
    // Simple toast implementation
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    toast.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 12px 20px;
      border-radius: 8px;
      color: white;
      font-weight: 500;
      z-index: 1000;
      animation: slideIn 0.3s ease;
    `;
    
    switch (type) {
      case 'success': toast.style.background = '#10b981'; break;
      case 'error': toast.style.background = '#ef4444'; break;
      case 'warning': toast.style.background = '#f59e0b'; break;
      default: toast.style.background = '#0b5fff';
    }
    
    document.body.appendChild(toast);
    setTimeout(() => {
      toast.remove();
    }, CONFIG.UI.TOAST_DURATION);
  }
};

// Export for use in other modules
window.CONFIG = CONFIG;
window.UTILS = UTILS;
window.SimpleHash = SimpleHash;