// API client for backend integration
class StrataAPI {
  constructor(baseURL = 'http://localhost:3000/api') {
    this.baseURL = baseURL;
    this.token = localStorage.getItem('strataAuthToken');
    this.isAvailable = false;
    this.checkAvailability();
  }

  // Check if backend is available
  async checkAvailability() {
    try {
      const response = await fetch(`${this.baseURL}/system/health`, {
        method: 'GET',
        timeout: 5000
      });
      
      if (response.ok) {
        this.isAvailable = true;
        console.log('✅ Backend API available');
        return true;
      }
    } catch (error) {
      console.log('📱 Backend API unavailable, using local storage');
    }
    
    this.isAvailable = false;
    return false;
  }

  // Set authentication token
  setToken(token) {
    this.token = token;
    if (token) {
      localStorage.setItem('strataAuthToken', token);
    } else {
      localStorage.removeItem('strataAuthToken');
    }
  }

  // Generic request method
  async request(endpoint, options = {}) {
    if (!this.isAvailable) {
      throw new Error('Backend API not available');
    }

    const url = `${this.baseURL}${endpoint}`;
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers
    };

    if (this.token) {
      headers.Authorization = `Bearer ${this.token}`;
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('API request failed:', { endpoint, error: error.message });
      throw error;
    }
  }

  // Authentication methods
  async register(username, password, email = null) {
    const result = await this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ username, password, email })
    });
    
    if (result.token) {
      this.setToken(result.token);
    }
    
    return result;
  }

  async login(username, password) {
    const result = await this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password })
    });
    
    if (result.token) {
      this.setToken(result.token);
    }
    
    return result;
  }

  async logout() {
    this.setToken(null);
  }

  async getProfile() {
    return this.request('/auth/profile');
  }

  async updateProfile(updates) {
    return this.request('/auth/profile', {
      method: 'PATCH',
      body: JSON.stringify(updates)
    });
  }

  // Project methods
  async createProject(name, description = null) {
    return this.request('/projects', {
      method: 'POST',
      body: JSON.stringify({ name, description })
    });
  }

  async getProjects(search = null) {
    const params = new URLSearchParams();
    if (search) params.append('search', search);
    
    return this.request(`/projects?${params}`);
  }

  async getProject(id) {
    return this.request(`/projects/${id}`);
  }

  async updateProject(id, updates) {
    return this.request(`/projects/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(updates)
    });
  }

  async deleteProject(id, force = false) {
    const params = force ? '?force=true' : '';
    return this.request(`/projects/${id}${params}`, {
      method: 'DELETE'
    });
  }

  async getProjectStats(id) {
    return this.request(`/projects/${id}/stats`);
  }

  // File methods
  async uploadFiles(projectId, files, metadata) {
    const formData = new FormData();
    
    // Add files
    Array.from(files).forEach(file => {
      formData.append('files', file);
    });

    // Add metadata
    formData.append('project_id', projectId);
    
    if (metadata.bore_id) formData.append('bore_id', metadata.bore_id);
    if (metadata.survey_date) formData.append('survey_date', metadata.survey_date);
    if (metadata.water_level) formData.append('water_level', metadata.water_level.toString());
    if (metadata.water_level_unit) formData.append('water_level_unit', metadata.water_level_unit);
    if (metadata.latitude) formData.append('latitude', metadata.latitude.toString());
    if (metadata.longitude) formData.append('longitude', metadata.longitude.toString());
    if (metadata.location_accuracy) formData.append('location_accuracy', metadata.location_accuracy.toString());
    if (metadata.location_source) formData.append('location_source', metadata.location_source);
    if (metadata.elevation) formData.append('elevation', metadata.elevation.toString());
    if (metadata.tags && metadata.tags.length > 0) {
      metadata.tags.forEach(tag => formData.append('tags', tag));
    }
    if (metadata.notes) formData.append('notes', metadata.notes);
    if (metadata.surveyor) formData.append('surveyor', metadata.surveyor);
    if (metadata.weather_conditions) formData.append('weather_conditions', metadata.weather_conditions);
    if (metadata.measurement_method) formData.append('measurement_method', metadata.measurement_method);

    const headers = {};
    if (this.token) {
      headers.Authorization = `Bearer ${this.token}`;
    }

    const response = await fetch(`${this.baseURL}/files/upload`, {
      method: 'POST',
      headers,
      body: formData
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `Upload failed: ${response.statusText}`);
    }

    return response.json();
  }

  async getFiles(filters = {}) {
    const params = new URLSearchParams();
    
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== null && value !== undefined && value !== '') {
        params.append(key, value.toString());
      }
    });
    
    return this.request(`/files?${params}`);
  }

  async getFile(id) {
    return this.request(`/files/${id}`);
  }

  async updateFile(id, updates) {
    return this.request(`/files/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(updates)
    });
  }

  async deleteFile(id) {
    return this.request(`/files/${id}`, {
      method: 'DELETE'
    });
  }

  getFileDownloadUrl(id) {
    return `${this.baseURL}/files/${id}/download`;
  }

  getFileThumbnailUrl(id) {
    return `${this.baseURL}/files/${id}/thumbnail`;
  }

  async exportProject(projectId) {
    const headers = {};
    if (this.token) {
      headers.Authorization = `Bearer ${this.token}`;
    }

    const response = await fetch(`${this.baseURL}/files/export/project/${projectId}`, {
      method: 'GET',
      headers
    });

    if (!response.ok) {
      throw new Error(`Export failed: ${response.statusText}`);
    }

    return response.blob();
  }

  // Map methods
  async getMapMarkers(filters = {}) {
    const params = new URLSearchParams();
    
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== null && value !== undefined && value !== '') {
        params.append(key, value.toString());
      }
    });
    
    return this.request(`/map/markers?${params}`);
  }

  async getLocationHistory(latitude, longitude, radius = 50, projectId = null) {
    const params = new URLSearchParams({
      latitude: latitude.toString(),
      longitude: longitude.toString(),
      radius: radius.toString()
    });
    
    if (projectId) {
      params.append('project_id', projectId);
    }
    
    return this.request(`/map/location/history?${params}`);
  }

  async getNearbyLocations(latitude, longitude, radius = 1000, limit = 10) {
    const params = new URLSearchParams({
      latitude: latitude.toString(),
      longitude: longitude.toString(),
      radius: radius.toString(),
      limit: limit.toString()
    });
    
    return this.request(`/map/nearby?${params}`);
  }

  // System methods
  async getSystemHealth() {
    return this.request('/system/health');
  }

  async getSystemStats() {
    return this.request('/system/stats');
  }
}

// Hybrid file manager that can use both local storage and backend
class HybridFileManager extends FileManager {
  constructor() {
    super();
    this.api = new StrataAPI();
    this.useBackend = false;
    this.initializeBackend();
  }

  async initializeBackend() {
    this.useBackend = await this.api.checkAvailability();
    
    if (this.useBackend) {
      // Try to authenticate with existing token
      try {
        await this.api.getProfile();
        console.log('✅ Authenticated with backend');
      } catch (error) {
        console.log('🔑 Backend authentication required');
        this.useBackend = false;
      }
    }
  }

  async saveBoring(metadata) {
    if (this.useBackend && this.api.token) {
      try {
        return await this.saveBoringToBackend(metadata);
      } catch (error) {
        console.error('Backend save failed, falling back to local storage:', error);
        UTILS.showToast('Server unavailable, saving locally', 'warning');
        return super.saveBoring(metadata);
      }
    } else {
      return super.saveBoring(metadata);
    }
  }

  async saveBoringToBackend(metadata) {
    if (!metadata.project) {
      throw new Error('Project is required');
    }

    // Convert coordinates format
    const backendMetadata = {
      bore_id: metadata.boreId,
      survey_date: metadata.date,
      water_level: metadata.waterLevel ? parseFloat(metadata.waterLevel) : null,
      water_level_unit: 'feet',
      latitude: metadata.coordinates?.lat,
      longitude: metadata.coordinates?.lng,
      location_source: 'map_click',
      tags: metadata.tags ? metadata.tags.split(',').map(t => t.trim()).filter(t => t) : [],
      notes: metadata.notes,
      surveyor: auth.getCurrentUser()?.username
    };

    const result = await this.api.uploadFiles(metadata.project, this.selectedFiles, backendMetadata);
    
    // Clear selected files
    this.clearSelectedFiles();
    
    UTILS.showToast('Files uploaded to server successfully', 'success');
    return result;
  }

  async loadProjectFiles(projectId) {
    if (this.useBackend && this.api.token) {
      try {
        const result = await this.api.getFiles({ project_id: projectId });
        this.currentFiles = result.files.map(file => ({
          id: file.id,
          filename: file.original_filename,
          files: [{
            name: file.original_filename,
            size: file.file_size,
            type: file.mime_type,
            data: this.api.getFileDownloadUrl(file.id) // URL instead of base64
          }],
          metadata: {
            boreId: file.bore_id,
            date: file.survey_date,
            waterLevel: file.water_level,
            coordinates: file.latitude && file.longitude ? {
              lat: file.latitude,
              lng: file.longitude
            } : null,
            tags: file.tags || [],
            notes: file.notes,
            createdAt: file.created_at,
            createdBy: file.surveyor
          }
        }));
        
        return this.currentFiles;
      } catch (error) {
        console.error('Backend load failed, falling back to local storage:', error);
        return super.loadProjectFiles(projectId);
      }
    } else {
      return super.loadProjectFiles(projectId);
    }
  }

  async exportProjectAsZip(projectId) {
    if (this.useBackend && this.api.token) {
      try {
        const blob = await this.api.exportProject(projectId);
        const project = await projectManager.getProject(projectId);
        
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${UTILS.sanitizeFilename(project.name)}_${new Date().toISOString().split('T')[0]}.zip`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        UTILS.showToast('Project exported from server successfully', 'success');
        return;
      } catch (error) {
        console.error('Backend export failed, falling back to local export:', error);
        UTILS.showToast('Server export failed, using local export', 'warning');
      }
    }
    
    return super.exportProjectAsZip(projectId);
  }

  // Enable backend mode (after authentication)
  enableBackendMode() {
    this.useBackend = true;
    console.log('✅ Backend mode enabled');
  }

  // Disable backend mode (fallback to local)
  disableBackendMode() {
    this.useBackend = false;
    console.log('📱 Switched to local storage mode');
  }

  // Check if using backend
  isUsingBackend() {
    return this.useBackend && this.api.token;
  }
}

// Create global API instance
window.strataAPI = new StrataAPI();

// Replace file manager with hybrid version if not already replaced
if (!(window.fileManager instanceof HybridFileManager)) {
  window.fileManager = new HybridFileManager();
}

// Export for use in other modules
window.StrataAPI = StrataAPI;
window.HybridFileManager = HybridFileManager;