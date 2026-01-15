const fs = require('fs');
const path = require('path');

// Log levels
const LOG_LEVELS = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3
};

class Logger {
  constructor() {
    this.level = process.env.LOG_LEVEL || 'info';
    this.logDir = './logs';
    this.ensureLogDirectory();
  }

  ensureLogDirectory() {
    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true });
    }
  }

  shouldLog(level) {
    return LOG_LEVELS[level] <= LOG_LEVELS[this.level];
  }

  formatMessage(level, message, metadata = {}) {
    const timestamp = new Date().toISOString();
    const metaStr = Object.keys(metadata).length > 0 ? 
      ` | ${JSON.stringify(metadata)}` : '';
    
    return `[${timestamp}] ${level.toUpperCase()}: ${message}${metaStr}`;
  }

  writeToFile(level, formattedMessage) {
    if (process.env.NODE_ENV === 'test') return;
    
    const date = new Date().toISOString().split('T')[0];
    const logFile = path.join(this.logDir, `${date}.log`);
    
    fs.appendFileSync(logFile, formattedMessage + '\n');
  }

  log(level, message, metadata = {}) {
    if (!this.shouldLog(level)) return;

    const formattedMessage = this.formatMessage(level, message, metadata);
    
    // Console output with colors
    if (process.env.NODE_ENV !== 'production') {
      const colors = {
        error: '\x1b[31m',   // Red
        warn: '\x1b[33m',    // Yellow
        info: '\x1b[36m',    // Cyan
        debug: '\x1b[90m'    // Gray
      };
      
      const reset = '\x1b[0m';
      console.log(`${colors[level] || ''}${formattedMessage}${reset}`);
    }
    
    // File output
    this.writeToFile(level, formattedMessage);
  }

  error(message, metadata = {}) {
    this.log('error', message, metadata);
  }

  warn(message, metadata = {}) {
    this.log('warn', message, metadata);
  }

  info(message, metadata = {}) {
    this.log('info', message, metadata);
  }

  debug(message, metadata = {}) {
    this.log('debug', message, metadata);
  }

  // Log HTTP requests
  logRequest(req, res, responseTime) {
    const metadata = {
      method: req.method,
      url: req.originalUrl,
      status: res.statusCode,
      responseTime: `${responseTime}ms`,
      userAgent: req.get('User-Agent'),
      ip: req.ip || req.connection.remoteAddress
    };

    const level = res.statusCode >= 400 ? 'warn' : 'info';
    this.log(level, `${req.method} ${req.originalUrl}`, metadata);
  }

  // Log database operations
  logDatabase(operation, table, metadata = {}) {
    this.debug(`Database ${operation} on ${table}`, metadata);
  }

  // Log file operations
  logFile(operation, filename, metadata = {}) {
    this.info(`File ${operation}: ${filename}`, metadata);
  }
}

const logger = new Logger();

module.exports = { logger };