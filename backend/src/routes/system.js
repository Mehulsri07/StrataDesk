const express = require('express');
const fs = require('fs').promises;
const path = require('path');

const { getStats, healthCheck } = require('../database/init');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const { logger } = require('../utils/logger');
const { formatFileSize } = require('../utils/fileUtils');

const router = express.Router();

// System health check
router.get('/health', asyncHandler(async (req, res) => {
  const dbHealth = await healthCheck();
  
  // Check upload directory
  const uploadDir = process.env.UPLOAD_DIR || './uploads';
  let uploadDirHealth = { accessible: false, writable: false };
  
  try {
    await fs.access(uploadDir);
    uploadDirHealth.accessible = true;
    
    // Test write access
    const testFile = path.join(uploadDir, '.write-test');
    await fs.writeFile(testFile, 'test');
    await fs.unlink(testFile);
    uploadDirHealth.writable = true;
  } catch (error) {
    logger.warn('Upload directory health check failed:', error.message);
  }

  // Check disk space
  let diskSpace = null;
  try {
    const stats = await fs.stat(uploadDir);
    // Note: Getting actual disk space requires platform-specific code
    // This is a simplified check
    diskSpace = { available: true };
  } catch (error) {
    diskSpace = { available: false, error: error.message };
  }

  const isHealthy = dbHealth.healthy && uploadDirHealth.accessible && uploadDirHealth.writable;

  res.status(isHealthy ? 200 : 503).json({
    status: isHealthy ? 'healthy' : 'unhealthy',
    timestamp: new Date().toISOString(),
    version: '2.0.0',
    uptime: process.uptime(),
    checks: {
      database: dbHealth,
      uploadDirectory: uploadDirHealth,
      diskSpace
    }
  });
}));

// System statistics (public with optional auth for user-specific data)
router.get('/stats', asyncHandler(async (req, res) => {
  const dbStats = await getStats();
  
  // Get upload directory size
  let uploadDirSize = 0;
  try {
    const uploadDir = process.env.UPLOAD_DIR || './uploads';
    const calculateDirSize = async (dirPath) => {
      let size = 0;
      try {
        const items = await fs.readdir(dirPath);
        for (const item of items) {
          const itemPath = path.join(dirPath, item);
          const stats = await fs.stat(itemPath);
          if (stats.isDirectory()) {
            size += await calculateDirSize(itemPath);
          } else {
            size += stats.size;
          }
        }
      } catch (error) {
        // Directory might not exist or be accessible
      }
      return size;
    };
    
    uploadDirSize = await calculateDirSize(uploadDir);
  } catch (error) {
    logger.warn('Failed to calculate upload directory size:', error.message);
  }

  res.json({
    database: dbStats,
    storage: {
      uploadDirectory: {
        size: uploadDirSize,
        sizeFormatted: formatFileSize(uploadDirSize)
      }
    },
    system: {
      nodeVersion: process.version,
      platform: process.platform,
      uptime: process.uptime(),
      memoryUsage: process.memoryUsage()
    }
  });
}));

// System information (admin only)
router.get('/info', 
  authenticateToken, 
  requireRole('admin'), 
  asyncHandler(async (req, res) => {
    // Get environment info (sanitized)
    const envInfo = {
      nodeEnv: process.env.NODE_ENV,
      port: process.env.PORT,
      dbPath: process.env.DB_PATH,
      uploadDir: process.env.UPLOAD_DIR,
      maxFileSize: process.env.MAX_FILE_SIZE,
      jwtExpiresIn: process.env.JWT_EXPIRES_IN,
      corsOrigin: process.env.CORS_ORIGIN,
      logLevel: process.env.LOG_LEVEL
    };

    // Get recent logs
    let recentLogs = [];
    try {
      const logDir = './logs';
      const today = new Date().toISOString().split('T')[0];
      const logFile = path.join(logDir, `${today}.log`);
      
      const logContent = await fs.readFile(logFile, 'utf8');
      recentLogs = logContent
        .split('\n')
        .filter(line => line.trim())
        .slice(-50) // Last 50 log entries
        .reverse();
    } catch (error) {
      // Log file might not exist
    }

    res.json({
      environment: envInfo,
      system: {
        nodeVersion: process.version,
        platform: process.platform,
        arch: process.arch,
        uptime: process.uptime(),
        memoryUsage: process.memoryUsage(),
        cpuUsage: process.cpuUsage()
      },
      recentLogs
    });
  })
);

// System logs (admin only)
router.get('/logs', 
  authenticateToken, 
  requireRole('admin'), 
  asyncHandler(async (req, res) => {
    const date = req.query.date || new Date().toISOString().split('T')[0];
    const lines = parseInt(req.query.lines) || 100;
    
    try {
      const logDir = './logs';
      const logFile = path.join(logDir, `${date}.log`);
      
      const logContent = await fs.readFile(logFile, 'utf8');
      const logLines = logContent
        .split('\n')
        .filter(line => line.trim())
        .slice(-lines)
        .reverse();

      res.json({
        date,
        lines: logLines.length,
        logs: logLines
      });
    } catch (error) {
      if (error.code === 'ENOENT') {
        res.json({
          date,
          lines: 0,
          logs: [],
          message: 'No log file found for this date'
        });
      } else {
        throw error;
      }
    }
  })
);

// Available log dates (admin only)
router.get('/logs/dates', 
  authenticateToken, 
  requireRole('admin'), 
  asyncHandler(async (req, res) => {
    try {
      const logDir = './logs';
      const files = await fs.readdir(logDir);
      
      const logDates = files
        .filter(file => file.endsWith('.log'))
        .map(file => file.replace('.log', ''))
        .sort()
        .reverse();

      res.json({ dates: logDates });
    } catch (error) {
      res.json({ dates: [] });
    }
  })
);

// Backup database (admin only)
router.post('/backup', 
  authenticateToken, 
  requireRole('admin'), 
  asyncHandler(async (req, res) => {
    const backupDir = process.env.BACKUP_DIR || './backups';
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFile = path.join(backupDir, `stratadesk-backup-${timestamp}.db`);
    
    try {
      // Ensure backup directory exists
      await fs.mkdir(backupDir, { recursive: true });
      
      // Copy database file
      const dbPath = process.env.DB_PATH || './data/stratadesk.db';
      await fs.copyFile(dbPath, backupFile);
      
      // Get backup file stats
      const stats = await fs.stat(backupFile);
      
      logger.info('Database backup created:', {
        backupFile,
        size: stats.size,
        userId: req.user.id
      });

      res.json({
        message: 'Backup created successfully',
        backup: {
          filename: path.basename(backupFile),
          path: backupFile,
          size: stats.size,
          sizeFormatted: formatFileSize(stats.size),
          createdAt: new Date().toISOString()
        }
      });
    } catch (error) {
      logger.error('Backup creation failed:', error);
      throw error;
    }
  })
);

// List backups (admin only)
router.get('/backups', 
  authenticateToken, 
  requireRole('admin'), 
  asyncHandler(async (req, res) => {
    const backupDir = process.env.BACKUP_DIR || './backups';
    
    try {
      const files = await fs.readdir(backupDir);
      const backups = [];
      
      for (const file of files) {
        if (file.endsWith('.db')) {
          const filePath = path.join(backupDir, file);
          const stats = await fs.stat(filePath);
          
          backups.push({
            filename: file,
            size: stats.size,
            sizeFormatted: formatFileSize(stats.size),
            createdAt: stats.birthtime,
            modifiedAt: stats.mtime
          });
        }
      }
      
      // Sort by creation date (newest first)
      backups.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      
      res.json({ backups });
    } catch (error) {
      if (error.code === 'ENOENT') {
        res.json({ backups: [] });
      } else {
        throw error;
      }
    }
  })
);

// Cleanup old files (admin only)
router.post('/cleanup', 
  authenticateToken, 
  requireRole('admin'), 
  asyncHandler(async (req, res) => {
    const maxAgeMs = parseInt(req.body.maxAgeDays || 30) * 24 * 60 * 60 * 1000;
    
    let cleanupResults = {
      logs: { deleted: 0, errors: 0 },
      backups: { deleted: 0, errors: 0 },
      uploads: { deleted: 0, errors: 0 }
    };

    // Cleanup old log files
    try {
      const logDir = './logs';
      const logFiles = await fs.readdir(logDir);
      const now = Date.now();
      
      for (const file of logFiles) {
        if (file.endsWith('.log')) {
          const filePath = path.join(logDir, file);
          const stats = await fs.stat(filePath);
          
          if (now - stats.mtime.getTime() > maxAgeMs) {
            try {
              await fs.unlink(filePath);
              cleanupResults.logs.deleted++;
            } catch (error) {
              cleanupResults.logs.errors++;
              logger.error('Failed to delete log file:', { file, error: error.message });
            }
          }
        }
      }
    } catch (error) {
      logger.warn('Log cleanup failed:', error.message);
    }

    // Cleanup old backup files
    try {
      const backupDir = process.env.BACKUP_DIR || './backups';
      const backupFiles = await fs.readdir(backupDir);
      const now = Date.now();
      
      for (const file of backupFiles) {
        if (file.endsWith('.db')) {
          const filePath = path.join(backupDir, file);
          const stats = await fs.stat(filePath);
          
          if (now - stats.mtime.getTime() > maxAgeMs) {
            try {
              await fs.unlink(filePath);
              cleanupResults.backups.deleted++;
            } catch (error) {
              cleanupResults.backups.errors++;
              logger.error('Failed to delete backup file:', { file, error: error.message });
            }
          }
        }
      }
    } catch (error) {
      logger.warn('Backup cleanup failed:', error.message);
    }

    logger.info('System cleanup completed:', {
      cleanupResults,
      maxAgeDays: req.body.maxAgeDays || 30,
      userId: req.user.id
    });

    res.json({
      message: 'Cleanup completed',
      results: cleanupResults,
      maxAgeDays: req.body.maxAgeDays || 30
    });
  })
);

module.exports = router;