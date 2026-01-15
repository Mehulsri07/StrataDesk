// Centralized logging utility for StrataDesk
class Logger {
  constructor() {
    this.logLevel = this.getLogLevel();
    this.logs = [];
    this.maxLogs = 1000;
  }

  // Get log level from config or localStorage
  getLogLevel() {
    const saved = localStorage.getItem('strataLogLevel');
    if (saved) return saved;
    
    return CONFIG?.DEBUG?.LOG_LEVEL || 'info';
  }

  // Set log level
  setLogLevel(level) {
    this.logLevel = level;
    localStorage.setItem('strataLogLevel', level);
  }

  // Check if level should be logged
  shouldLog(level) {
    const levels = ['debug', 'info', 'warn', 'error'];
    const currentIndex = levels.indexOf(this.logLevel);
    const messageIndex = levels.indexOf(level);
    return messageIndex >= currentIndex;
  }

  // Create log entry
  createLogEntry(level, message, data = null) {
    const entry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      data,
      url: window.location.href,
      userAgent: navigator.userAgent
    };

    // Add to internal log store
    this.logs.push(entry);
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }

    return entry;
  }

  // Debug level logging
  debug(message, data = null) {
    if (!this.shouldLog('debug')) return;
    
    const entry = this.createLogEntry('debug', message, data);
    console.debug(`[DEBUG] ${message}`, data || '');
  }

  // Info level logging
  info(message, data = null) {
    if (!this.shouldLog('info')) return;
    
    const entry = this.createLogEntry('info', message, data);
    console.info(`[INFO] ${message}`, data || '');
  }

  // Warning level logging
  warn(message, data = null) {
    if (!this.shouldLog('warn')) return;
    
    const entry = this.createLogEntry('warn', message, data);
    console.warn(`[WARN] ${message}`, data || '');
  }

  // Error level logging
  error(message, data = null) {
    if (!this.shouldLog('error')) return;
    
    const entry = this.createLogEntry('error', message, data);
    console.error(`[ERROR] ${message}`, data || '');
    
    // Send error to monitoring service if configured
    this.reportError(entry);
  }

  // Performance logging
  performance(operation, duration, data = null) {
    this.info(`Performance: ${operation} took ${duration}ms`, data);
  }

  // Network request logging
  networkRequest(method, url, status, duration) {
    const message = `${method} ${url} - ${status} (${duration}ms)`;
    if (status >= 400) {
      this.error(message);
    } else {
      this.debug(message);
    }
  }

  // User action logging
  userAction(action, data = null) {
    this.info(`User Action: ${action}`, data);
  }

  // Report error to external service (if configured)
  reportError(entry) {
    // Only report in production and if service is configured
    if (CONFIG?.ERROR_REPORTING?.ENABLED && !this.isDevelopment()) {
      try {
        // Send to error reporting service
        fetch(CONFIG.ERROR_REPORTING.ENDPOINT, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(entry)
        }).catch(() => {
          // Silently fail - don't log errors about error reporting
        });
      } catch (e) {
        // Silently fail
      }
    }
  }

  // Check if in development mode
  isDevelopment() {
    return window.location.hostname === 'localhost' || 
           window.location.hostname === '127.0.0.1' ||
           window.location.protocol === 'file:';
  }

  // Get recent logs
  getRecentLogs(count = 100) {
    return this.logs.slice(-count);
  }

  // Export logs for debugging
  exportLogs() {
    const logsData = {
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href,
      logs: this.logs
    };

    const blob = new Blob([JSON.stringify(logsData, null, 2)], { 
      type: 'application/json' 
    });
    
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `strata-logs-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  // Clear logs
  clearLogs() {
    this.logs = [];
  }

  // Performance timing wrapper
  time(label) {
    const startTime = performance.now();
    
    return {
      end: (data = null) => {
        const duration = performance.now() - startTime;
        this.performance(label, Math.round(duration), data);
        return duration;
      }
    };
  }

  // Async operation wrapper with logging
  async logAsync(operation, asyncFn, data = null) {
    const timer = this.time(operation);
    
    try {
      this.debug(`Starting: ${operation}`, data);
      const result = await asyncFn();
      timer.end({ success: true });
      this.debug(`Completed: ${operation}`, data);
      return result;
    } catch (error) {
      timer.end({ success: false, error: error.message });
      this.error(`Failed: ${operation}`, { ...data, error: error.message });
      throw error;
    }
  }
}

// Create global logger instance
if (typeof window !== 'undefined') {
  window.Logger = new Logger();
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = Logger;
} else {
  // Ensure global Logger is available
  window.Logger = window.Logger || new Logger();
}