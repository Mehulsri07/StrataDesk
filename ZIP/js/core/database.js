// Database operations using IndexedDB
class Database {
  constructor() {
    this.db = null;
    this.isInitialized = false;
  }

  // Initialize database
  async init() {
    if (this.isInitialized) return this.db;

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(CONFIG.DB_NAME, CONFIG.DB_VERSION);

      request.onerror = () => {
        console.error('Database initialization failed:', request.error);
        reject(request.error);
      };
      
      request.onsuccess = () => {
        this.db = request.result;
        this.isInitialized = true;
        console.log(`Database initialized successfully (version ${this.db.version})`);
        resolve(this.db);
      };

      request.onblocked = () => {
        console.warn('Database upgrade blocked. Please close other tabs and refresh.');
        reject(new Error('Database upgrade blocked. Please close other tabs and refresh.'));
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        const oldVersion = event.oldVersion;
        const newVersion = event.newVersion;

        console.log(`Database upgrade: ${oldVersion} -> ${newVersion}`);

        // Users store
        if (!db.objectStoreNames.contains(CONFIG.STORES.USERS)) {
          db.createObjectStore(CONFIG.STORES.USERS, { keyPath: 'username' });
        }

        // Projects store
        if (!db.objectStoreNames.contains(CONFIG.STORES.PROJECTS)) {
          db.createObjectStore(CONFIG.STORES.PROJECTS, { keyPath: 'id' });
        }

        // Files store
        if (!db.objectStoreNames.contains(CONFIG.STORES.FILES)) {
          const filesStore = db.createObjectStore(CONFIG.STORES.FILES, { keyPath: 'id' });
          filesStore.createIndex('project', 'project', { unique: false });
          filesStore.createIndex('filename', 'filename', { unique: false });
          filesStore.createIndex('boreId', 'metadata.boreId', { unique: false });
          filesStore.createIndex('date', 'metadata.date', { unique: false });
        }

        // Version 3 additions (if upgrading from older versions)
        if (oldVersion < 3) {
          // Add any new stores or indexes for version 3
          // For now, we'll keep the same schema but mark as version 3
          console.log('Upgraded to database version 3');
        }
      };
    });
  }

  // Generic put operation
  async put(storeName, data) {
    await this.init();
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.put(data);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  // Generic get operation
  async get(storeName, key) {
    await this.init();
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(storeName, 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.get(key);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  // Get all records from store
  async getAll(storeName) {
    await this.init();
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(storeName, 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  // Delete record
  async delete(storeName, key) {
    await this.init();
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.delete(key);

      request.onsuccess = () => resolve(true);
      request.onerror = () => reject(request.error);
    });
  }

  // Delete multiple records
  async deleteMultiple(storeName, keys) {
    await this.init();
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);
      
      let completed = 0;
      const total = keys.length;
      
      if (total === 0) {
        resolve(true);
        return;
      }

      keys.forEach(key => {
        const request = store.delete(key);
        request.onsuccess = () => {
          completed++;
          if (completed === total) resolve(true);
        };
        request.onerror = () => reject(request.error);
      });
    });
  }

  // Query files with filters
  async queryFiles(filters = {}) {
    await this.init();
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(CONFIG.STORES.FILES, 'readonly');
      const store = transaction.objectStore(CONFIG.STORES.FILES);
      const results = [];

      const request = store.openCursor();
      request.onsuccess = (event) => {
        const cursor = event.target.result;
        if (!cursor) {
          resolve(results);
          return;
        }

        const file = cursor.value;
        let matches = true;

        // Apply filters
        if (filters.project && file.project !== filters.project) {
          matches = false;
        }

        if (filters.query && matches) {
          const query = filters.query.toLowerCase();
          
          // Get project name for this file
          const project = window.projectManager?.getProjects()?.find(p => p.id === file.project);
          const projectName = project?.name || '';
          
          const searchableText = [
            file.filename || '',
            file.metadata?.boreId || '',
            file.metadata?.tags?.join(' ') || '',
            file.metadata?.notes || '',
            projectName // Include project name in search
          ].join(' ').toLowerCase();
          
          matches = searchableText.includes(query);
        }

        if (filters.dateFrom && matches) {
          const fileDate = new Date(file.metadata?.date);
          const fromDate = new Date(filters.dateFrom);
          matches = fileDate >= fromDate;
        }

        if (filters.dateTo && matches) {
          const fileDate = new Date(file.metadata?.date);
          const toDate = new Date(filters.dateTo);
          matches = fileDate <= toDate;
        }

        if (matches) {
          results.push(file);
        }

        cursor.continue();
      };

      request.onerror = () => reject(request.error);
    });
  }

  // Get files by project
  async getFilesByProject(projectId) {
    return this.queryFiles({ project: projectId });
  }

  // Search files
  async searchFiles(query) {
    return this.queryFiles({ query });
  }

  // Get database statistics
  async getStats() {
    await this.init();
    const [users, projects, files] = await Promise.all([
      this.getAll(CONFIG.STORES.USERS),
      this.getAll(CONFIG.STORES.PROJECTS),
      this.getAll(CONFIG.STORES.FILES)
    ]);

    const totalSize = files.reduce((sum, file) => {
      return sum + (file.files?.reduce((fileSum, f) => fileSum + f.size, 0) || 0);
    }, 0);

    const locations = new Set();
    files.forEach(file => {
      if (file.metadata?.coordinates) {
        const coord = `${file.metadata.coordinates.lat},${file.metadata.coordinates.lng}`;
        locations.add(coord);
      }
    });

    return {
      users: users.length,
      projects: projects.length,
      files: files.length,
      totalSize,
      locations: locations.size
    };
  }

  // Get all location summaries for map display
  async getLocationSummaries() {
    await this.init();
    const files = await this.getAll(CONFIG.STORES.FILES);
    const locationMap = new Map();

    files.forEach(file => {
      if (file.metadata?.coordinates) {
        const { lat, lng } = file.metadata.coordinates;
        const key = `${lat.toFixed(6)},${lng.toFixed(6)}`;
        
        if (!locationMap.has(key)) {
          locationMap.set(key, {
            key,
            coordinates: { lat, lng },
            records: [],
            recordCount: 0,
            recordTypes: new Set(),
            latestDate: null,
            projects: new Set()
          });
        }
        
        const location = locationMap.get(key);
        location.records.push(file);
        location.recordCount++;
        
        // Track record types (bore IDs or generic)
        if (file.metadata.boreId) {
          location.recordTypes.add(file.metadata.boreId);
        }
        
        // Track projects
        if (file.project) {
          location.projects.add(file.project);
        }
        
        // Track latest date
        const fileDate = file.metadata.date || file.metadata.createdAt;
        if (fileDate) {
          const date = new Date(fileDate);
          if (!location.latestDate || date > location.latestDate) {
            location.latestDate = date;
          }
        }
      }
    });

    // Convert to array with summary data
    return Array.from(locationMap.values()).map(loc => ({
      key: loc.key,
      coordinates: loc.coordinates,
      recordCount: loc.recordCount,
      recordTypes: Array.from(loc.recordTypes),
      projectCount: loc.projects.size,
      latestDate: loc.latestDate ? loc.latestDate.toISOString() : null,
      records: loc.records
    }));
  }

  // Get records at a specific location
  async getRecordsAtLocation(lat, lng, tolerance = 0.0001) {
    await this.init();
    const files = await this.getAll(CONFIG.STORES.FILES);
    
    return files.filter(file => {
      if (!file.metadata?.coordinates) return false;
      const coords = file.metadata.coordinates;
      return Math.abs(coords.lat - lat) < tolerance && 
             Math.abs(coords.lng - lng) < tolerance;
    });
  }

  // Get recent records
  async getRecentRecords(limit = 10) {
    await this.init();
    const files = await this.getAll(CONFIG.STORES.FILES);
    
    return files
      .sort((a, b) => {
        const dateA = new Date(a.metadata?.createdAt || 0);
        const dateB = new Date(b.metadata?.createdAt || 0);
        return dateB - dateA;
      })
      .slice(0, limit);
  }

  // Get record by ID
  async getRecordById(recordId) {
    await this.init();
    return this.get(CONFIG.STORES.FILES, recordId);
  }

  // Export all data
  async exportData() {
    await this.init();
    const [users, projects, files] = await Promise.all([
      this.getAll(CONFIG.STORES.USERS),
      this.getAll(CONFIG.STORES.PROJECTS),
      this.getAll(CONFIG.STORES.FILES)
    ]);

    return {
      version: CONFIG.DB_VERSION,
      exportDate: UTILS.nowISO(),
      data: {
        users: users.map(u => ({ ...u, password: '[REDACTED]' })), // Don't export passwords
        projects,
        files
      }
    };
  }

  // Clear all data (for testing/reset)
  async clearAll() {
    await this.init();
    const storeNames = [CONFIG.STORES.USERS, CONFIG.STORES.PROJECTS, CONFIG.STORES.FILES];
    
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(storeNames, 'readwrite');
      let completed = 0;
      
      storeNames.forEach(storeName => {
        const store = transaction.objectStore(storeName);
        const request = store.clear();
        
        request.onsuccess = () => {
          completed++;
          if (completed === storeNames.length) resolve(true);
        };
        request.onerror = () => reject(request.error);
      });
    });
  }
}

// Create global database instance
window.db = new Database();