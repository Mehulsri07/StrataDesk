const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs').promises;
const { logger } = require('../utils/logger');

let db = null;

// Database schema
const SCHEMA = {
  users: `
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      email TEXT UNIQUE,
      password_hash TEXT NOT NULL,
      role TEXT DEFAULT 'user',
      settings TEXT DEFAULT '{}',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `,
  
  projects: `
    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      user_id TEXT NOT NULL,
      settings TEXT DEFAULT '{}',
      file_count INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
    )
  `,
  
  files: `
    CREATE TABLE IF NOT EXISTS files (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      filename TEXT NOT NULL,
      original_filename TEXT,
      file_path TEXT NOT NULL,
      file_size INTEGER NOT NULL,
      mime_type TEXT NOT NULL,
      
      -- Boring metadata
      bore_id TEXT,
      survey_date DATE,
      water_level REAL,
      water_level_unit TEXT DEFAULT 'feet',
      
      -- Location data
      latitude REAL,
      longitude REAL,
      location_accuracy REAL,
      location_source TEXT,
      elevation REAL,
      
      -- Additional metadata
      tags TEXT DEFAULT '[]',
      notes TEXT,
      surveyor TEXT,
      weather_conditions TEXT,
      measurement_method TEXT,
      
      -- File organization
      file_hash TEXT,
      thumbnail_path TEXT,
      
      -- Timestamps
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      
      FOREIGN KEY (project_id) REFERENCES projects (id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
    )
  `,
  
  file_attachments: `
    CREATE TABLE IF NOT EXISTS file_attachments (
      id TEXT PRIMARY KEY,
      file_id TEXT NOT NULL,
      attachment_name TEXT NOT NULL,
      attachment_path TEXT NOT NULL,
      attachment_size INTEGER NOT NULL,
      mime_type TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (file_id) REFERENCES files (id) ON DELETE CASCADE
    )
  `,
  
  spatial_index: `
    CREATE TABLE IF NOT EXISTS spatial_index (
      id TEXT PRIMARY KEY,
      file_id TEXT NOT NULL,
      lat_grid INTEGER NOT NULL,
      lng_grid INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (file_id) REFERENCES files (id) ON DELETE CASCADE
    )
  `,
  
  system_logs: `
    CREATE TABLE IF NOT EXISTS system_logs (
      id TEXT PRIMARY KEY,
      level TEXT NOT NULL,
      message TEXT NOT NULL,
      metadata TEXT DEFAULT '{}',
      user_id TEXT,
      ip_address TEXT,
      user_agent TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `
};

// Indexes for performance
const INDEXES = [
  'CREATE INDEX IF NOT EXISTS idx_files_project_id ON files (project_id)',
  'CREATE INDEX IF NOT EXISTS idx_files_user_id ON files (user_id)',
  'CREATE INDEX IF NOT EXISTS idx_files_bore_id ON files (bore_id)',
  'CREATE INDEX IF NOT EXISTS idx_files_survey_date ON files (survey_date)',
  'CREATE INDEX IF NOT EXISTS idx_files_location ON files (latitude, longitude)',
  'CREATE INDEX IF NOT EXISTS idx_files_created_at ON files (created_at)',
  'CREATE INDEX IF NOT EXISTS idx_projects_user_id ON projects (user_id)',
  'CREATE INDEX IF NOT EXISTS idx_spatial_grid ON spatial_index (lat_grid, lng_grid)',
  'CREATE INDEX IF NOT EXISTS idx_file_attachments_file_id ON file_attachments (file_id)',
  'CREATE INDEX IF NOT EXISTS idx_system_logs_level ON system_logs (level)',
  'CREATE INDEX IF NOT EXISTS idx_system_logs_created_at ON system_logs (created_at)'
];

// Initialize database connection
async function initializeDatabase() {
  const dbPath = process.env.DB_PATH || './data/stratadesk.db';
  
  try {
    // Ensure data directory exists
    const dataDir = path.dirname(dbPath);
    await fs.mkdir(dataDir, { recursive: true });
    
    // Create database connection
    db = new sqlite3.Database(dbPath, (err) => {
      if (err) {
        logger.error('Failed to connect to database:', err);
        throw err;
      }
      logger.info(`📊 Connected to SQLite database: ${dbPath}`);
    });
    
    // Enable foreign keys
    await runQuery('PRAGMA foreign_keys = ON');
    
    // Enable WAL mode for better concurrency
    await runQuery('PRAGMA journal_mode = WAL');
    
    // Create tables
    for (const [tableName, schema] of Object.entries(SCHEMA)) {
      await runQuery(schema);
      logger.info(`✅ Table created/verified: ${tableName}`);
    }
    
    // Create indexes
    for (const index of INDEXES) {
      await runQuery(index);
    }
    logger.info('✅ Database indexes created/verified');
    
    // Run migrations if needed
    await runMigrations();
    
    logger.info('🎉 Database initialization complete');
    
  } catch (error) {
    logger.error('Database initialization failed:', error);
    throw error;
  }
}

// Run a query and return a promise
function runQuery(sql, params = []) {
  return new Promise((resolve, reject) => {
    if (!db) {
      reject(new Error('Database not initialized'));
      return;
    }
    
    db.run(sql, params, function(err) {
      if (err) {
        logger.error('Query failed:', { sql, params, error: err.message });
        reject(err);
      } else {
        resolve({ lastID: this.lastID, changes: this.changes });
      }
    });
  });
}

// Get a single row
function getRow(sql, params = []) {
  return new Promise((resolve, reject) => {
    if (!db) {
      reject(new Error('Database not initialized'));
      return;
    }
    
    db.get(sql, params, (err, row) => {
      if (err) {
        logger.error('Query failed:', { sql, params, error: err.message });
        reject(err);
      } else {
        resolve(row);
      }
    });
  });
}

// Get all rows
function getAllRows(sql, params = []) {
  return new Promise((resolve, reject) => {
    if (!db) {
      reject(new Error('Database not initialized'));
      return;
    }
    
    db.all(sql, params, (err, rows) => {
      if (err) {
        logger.error('Query failed:', { sql, params, error: err.message });
        reject(err);
      } else {
        resolve(rows || []);
      }
    });
  });
}

// Run migrations
async function runMigrations() {
  try {
    // Check if migrations table exists
    const migrationTable = await getRow(`
      SELECT name FROM sqlite_master 
      WHERE type='table' AND name='migrations'
    `);
    
    if (!migrationTable) {
      await runQuery(`
        CREATE TABLE migrations (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          version TEXT UNIQUE NOT NULL,
          description TEXT,
          executed_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);
      logger.info('✅ Migrations table created');
    }
    
    // Add initial migration record
    const existingMigrations = await getAllRows('SELECT version FROM migrations');
    if (existingMigrations.length === 0) {
      await runQuery(`
        INSERT INTO migrations (version, description) 
        VALUES ('2.0.0', 'Initial schema creation')
      `);
      logger.info('✅ Initial migration recorded');
    }
    
  } catch (error) {
    logger.error('Migration failed:', error);
    throw error;
  }
}

// Close database connection
function closeDatabase() {
  return new Promise((resolve, reject) => {
    if (!db) {
      resolve();
      return;
    }
    
    db.close((err) => {
      if (err) {
        logger.error('Failed to close database:', err);
        reject(err);
      } else {
        logger.info('📊 Database connection closed');
        db = null;
        resolve();
      }
    });
  });
}

// Get database instance
function getDatabase() {
  if (!db) {
    throw new Error('Database not initialized. Call initializeDatabase() first.');
  }
  return db;
}

// Database health check
async function healthCheck() {
  try {
    const result = await getRow('SELECT 1 as test');
    return { healthy: true, test: result.test === 1 };
  } catch (error) {
    logger.error('Database health check failed:', error);
    return { healthy: false, error: error.message };
  }
}

// Get database statistics
async function getStats() {
  try {
    const [users, projects, files, totalSize] = await Promise.all([
      getRow('SELECT COUNT(*) as count FROM users'),
      getRow('SELECT COUNT(*) as count FROM projects'),
      getRow('SELECT COUNT(*) as count FROM files'),
      getRow('SELECT SUM(file_size) as total FROM files')
    ]);
    
    const locations = await getRow(`
      SELECT COUNT(DISTINCT latitude || ',' || longitude) as count 
      FROM files 
      WHERE latitude IS NOT NULL AND longitude IS NOT NULL
    `);
    
    return {
      users: users.count,
      projects: projects.count,
      files: files.count,
      totalSize: totalSize.total || 0,
      locations: locations.count
    };
  } catch (error) {
    logger.error('Failed to get database stats:', error);
    throw error;
  }
}

module.exports = {
  initializeDatabase,
  closeDatabase,
  getDatabase,
  runQuery,
  getRow,
  getAllRows,
  healthCheck,
  getStats
};