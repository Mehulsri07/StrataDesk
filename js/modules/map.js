// Map management module
class MapManager {
  constructor() {
    this.map = null;
    this.markerLayer = null;
    this.clickMarker = null;
    this.isClickMode = false;
    this.currentTileLayer = null;
    this.tileProviderIndex = 0;
  }

  // Initialize map
  async init(containerId = 'map') {
    try {
      console.log('🗺️ Initializing map...');
      
      // Check if Leaflet is available
      if (typeof L === 'undefined') {
        console.error('Leaflet library not loaded');
        throw new Error('Leaflet library not loaded');
      }
      
      // Check if container exists
      const container = document.getElementById(containerId);
      if (!container) {
        console.error(`Map container '${containerId}' not found`);
        throw new Error(`Map container '${containerId}' not found`);
      }
      
      console.log('✅ Leaflet available, container found');
      console.log('Container dimensions:', container.offsetWidth, 'x', container.offsetHeight);
      
      // Ensure container has dimensions
      if (container.offsetWidth === 0 || container.offsetHeight === 0) {
        console.warn('Map container has zero dimensions, setting minimum size');
        container.style.minHeight = '400px';
        container.style.width = '100%';
      }
      
      // Create map with error handling
      try {
        this.map = L.map(containerId).setView(
          CONFIG.MAP.DEFAULT_CENTER, 
          CONFIG.MAP.DEFAULT_ZOOM
        );
        console.log('✅ Map instance created');
      } catch (mapError) {
        console.error('Failed to create map instance:', mapError);
        throw new Error(`Failed to create map: ${mapError.message}`);
      }

      // Add tile layer with fallback
      await this.addTileLayer();

      // Create marker layer
      this.markerLayer = L.layerGroup().addTo(this.map);

      // Set up click handler
      this.setupClickHandler();

      // Load existing markers
      await this.loadMarkers();

      console.log('✅ Map initialization complete');
      
      // Force map to resize after a short delay
      setTimeout(() => {
        if (this.map) {
          this.map.invalidateSize();
          console.log('✅ Map size invalidated');
        }
      }, 100);
      
      UTILS.showToast('Map initialized successfully', 'success');
      return this.map;
    } catch (error) {
      console.error('❌ Map initialization failed:', error);
      
      // Show error in map container
      const container = document.getElementById(containerId);
      if (container) {
        container.innerHTML = `
          <div style="display: flex; align-items: center; justify-content: center; height: 100%; color: var(--text-light); text-align: center; padding: 20px; background: var(--surface); border-radius: 8px;">
            <div>
              <div style="font-size: 24px; margin-bottom: 10px;">🗺️</div>
              <div style="font-size: 16px; margin-bottom: 8px;">Map failed to load</div>
              <div style="font-size: 12px; margin-bottom: 12px; color: var(--text-secondary);">${error.message}</div>
              <button onclick="mapManager.init('${containerId}')" style="margin-top: 10px; padding: 8px 16px; background: var(--primary); color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 14px;">Retry</button>
            </div>
          </div>
        `;
      }
      
      UTILS.showToast('Map initialization failed. Some features may not work.', 'error');
      throw error;
    }
  }

  // Add tile layer with fallback
  async addTileLayer() {
    const providers = CONFIG.MAP.TILE_PROVIDERS;
    console.log(`Attempting to load tiles from ${providers.length} providers...`);
    
    for (let i = this.tileProviderIndex; i < providers.length; i++) {
      try {
        const provider = providers[i];
        console.log(`Trying provider ${i + 1}: ${provider.name}`);
        
        // Remove existing tile layer
        if (this.currentTileLayer) {
          this.map.removeLayer(this.currentTileLayer);
        }

        // Add new tile layer with error handling
        this.currentTileLayer = L.tileLayer(provider.url, {
          attribution: provider.attribution,
          maxZoom: 19,
          timeout: 10000,
          errorTileUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=='
        });

        // Listen for tile load events
        this.currentTileLayer.on('loading', () => {
          console.log(`Loading tiles from ${provider.name}...`);
        });

        this.currentTileLayer.on('load', () => {
          console.log(`✅ Tiles loaded successfully from ${provider.name}`);
        });

        this.currentTileLayer.on('tileerror', (e) => {
          console.warn(`Tile error from ${provider.name}:`, e);
        });

        this.currentTileLayer.addTo(this.map);
        this.tileProviderIndex = i;
        
        console.log(`✅ Using tile provider: ${provider.name}`);
        
        // Wait a moment to see if tiles start loading
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        return;
      } catch (error) {
        console.warn(`Failed to load tile provider ${providers[i].name}:`, error);
        continue;
      }
    }

    // If all providers fail, show error
    console.error('All tile providers failed to load');
    UTILS.showToast('Unable to load map tiles. Check your internet connection.', 'warning');
    
    // Try to add a basic fallback tile layer
    try {
      this.currentTileLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 19
      });
      this.currentTileLayer.addTo(this.map);
      console.log('✅ Fallback tile layer added');
    } catch (fallbackError) {
      console.error('Even fallback tile layer failed:', fallbackError);
    }
  }

  // Setup click handler for location selection
  setupClickHandler() {
    this.map.on('click', (e) => {
      if (this.isClickMode) {
        this.setClickLocation(e.latlng.lat, e.latlng.lng);
        this.exitClickMode();
      }
    });
  }

  // Enter click mode for location selection
  enterClickMode() {
    this.isClickMode = true;
    this.map.getContainer().style.cursor = 'crosshair';
    UTILS.showToast('Click on the map to set location', 'info');
  }

  // Exit click mode
  exitClickMode() {
    this.isClickMode = false;
    this.map.getContainer().style.cursor = '';
  }

  // Set location from map click
  setClickLocation(lat, lng) {
    // Remove existing click marker
    if (this.clickMarker) {
      this.map.removeLayer(this.clickMarker);
    }

    // Add new click marker
    this.clickMarker = L.marker([lat, lng], {
      icon: L.icon({
        iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41]
      })
    }).addTo(this.map);

    // Update coordinates input
    const latlngInput = document.getElementById('latlng');
    if (latlngInput) {
      latlngInput.value = `${lat.toFixed(6)},${lng.toFixed(6)}`;
    }

    // Update location status
    const locationStatus = document.getElementById('locationStatus');
    if (locationStatus) {
      locationStatus.innerHTML = `✅ Location set: ${lat.toFixed(6)}, ${lng.toFixed(6)}`;
      locationStatus.className = 'location-status status-success';
    }

    // Zoom to location
    this.map.setView([lat, lng], CONFIG.MAP.CLICK_ZOOM);

    UTILS.showToast('Location set successfully', 'success');
  }

  // Set location from coordinates
  setLocationFromCoordinates(lat, lng, label = '') {
    if (!UTILS.isValidCoordinates(lat, lng)) {
      throw new Error('Invalid coordinates');
    }

    this.setClickLocation(lat, lng);
    
    if (label) {
      this.clickMarker.bindPopup(`📍 ${label}`).openPopup();
    }
  }

  // Search address using Nominatim with multiple results
  async searchAddressWithOptions(address) {
    if (!address || address.length < 3) {
      return [];
    }

    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=5&addressdetails=1`
      );
      
      if (!response.ok) {
        throw new Error('Search service unavailable');
      }

      const data = await response.json();
      
      if (data && data.length > 0) {
        return data.map(result => ({
          lat: parseFloat(result.lat),
          lng: parseFloat(result.lon),
          name: result.display_name,
          address: result.display_name,
          type: result.type || 'location',
          importance: result.importance || 0
        }));
      }
      
      return [];
    } catch (error) {
      console.error('Address search failed:', error);
      throw new Error('Address search failed. Please try again or click on the map.');
    }
  }

  // Original single result search (kept for backward compatibility)
  async searchAddress(address) {
    const results = await this.searchAddressWithOptions(address);
    if (results.length > 0) {
      const result = results[0];
      this.setLocationFromCoordinates(result.lat, result.lng, result.name);
      return result;
    }
    return null;
  }

  // Load markers for all files
  async loadMarkers() {
    try {
      const files = await db.getAll(CONFIG.STORES.FILES);
      this.markerLayer.clearLayers();

      const markerGroups = new Map();

      files.forEach(file => {
        if (file.metadata?.coordinates) {
          const { lat, lng } = file.metadata.coordinates;
          const key = `${lat.toFixed(6)},${lng.toFixed(6)}`;
          
          if (!markerGroups.has(key)) {
            markerGroups.set(key, []);
          }
          markerGroups.get(key).push(file);
        }
      });

      // Create markers for each location
      markerGroups.forEach((locationFiles, coordKey) => {
        const [lat, lng] = coordKey.split(',').map(Number);
        const count = locationFiles.length;
        
        // Create marker with count badge if multiple files
        const marker = L.marker([lat, lng], {
          icon: this.createMarkerIcon(count)
        });

        // Create popup content
        const popupContent = this.createMarkerPopup(locationFiles);
        marker.bindPopup(popupContent);

        this.markerLayer.addLayer(marker);
      });

    } catch (error) {
      console.error('Failed to load markers:', error);
    }
  }

  // Create marker icon with count
  createMarkerIcon(count) {
    const color = count > 1 ? 'red' : 'blue';
    const iconUrl = `https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-${color}.png`;
    
    return L.icon({
      iconUrl,
      shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34],
      shadowSize: [41, 41]
    });
  }

  // Create popup content for marker - shows meaningful location summary
  createMarkerPopup(files) {
    if (!files || files.length === 0) return '<div class="marker-popup">No data at this location</div>';
    
    const location = files[0].metadata.coordinates;
    const recordCount = files.length;
    
    // Get unique bore IDs
    const boreIds = [...new Set(files.map(f => f.metadata?.boreId).filter(Boolean))];
    
    // Get date range
    const dates = files.map(f => f.metadata?.date || f.metadata?.createdAt).filter(Boolean).map(d => new Date(d));
    const latestDate = dates.length > 0 ? new Date(Math.max(...dates)) : null;
    const oldestDate = dates.length > 0 ? new Date(Math.min(...dates)) : null;
    
    // Get water level range
    const waterLevels = files.map(f => f.metadata?.waterLevel).filter(Boolean);
    const minWater = waterLevels.length > 0 ? Math.min(...waterLevels) : null;
    const maxWater = waterLevels.length > 0 ? Math.max(...waterLevels) : null;
    
    // Get unique projects
    const projectIds = [...new Set(files.map(f => f.project).filter(Boolean))];
    const projectNames = projectIds.map(pid => {
      const project = projectManager?.getProjects()?.find(p => p.id === pid);
      return project?.name || 'Unknown';
    });
    
    let content = `<div class="marker-popup">`;
    
    // Location header with coordinates
    content += `<h4>📍 Location Summary</h4>`;
    content += `<p class="popup-coords">${location.lat.toFixed(6)}, ${location.lng.toFixed(6)}</p>`;
    
    // Quick stats
    content += `<div class="popup-stats">`;
    content += `<div class="popup-stat"><strong>${recordCount}</strong> record(s)</div>`;
    if (boreIds.length > 0) {
      content += `<div class="popup-stat"><strong>${boreIds.length}</strong> bore(s)</div>`;
    }
    if (projectNames.length > 0) {
      content += `<div class="popup-stat"><strong>${projectNames.length}</strong> project(s)</div>`;
    }
    content += `</div>`;
    
    // Bore IDs list
    if (boreIds.length > 0) {
      content += `<div class="popup-section">`;
      content += `<strong>🔧 Bore IDs:</strong> ${boreIds.slice(0, 5).join(', ')}`;
      if (boreIds.length > 5) content += ` (+${boreIds.length - 5} more)`;
      content += `</div>`;
    }
    
    // Date range
    if (latestDate) {
      content += `<div class="popup-section">`;
      content += `<strong>📅 Date Range:</strong> `;
      if (oldestDate && oldestDate.getTime() !== latestDate.getTime()) {
        content += `${UTILS.formatDate(oldestDate)} - ${UTILS.formatDate(latestDate)}`;
      } else {
        content += UTILS.formatDate(latestDate);
      }
      content += `</div>`;
    }
    
    // Water level range
    if (minWater !== null) {
      content += `<div class="popup-section">`;
      content += `<strong>💧 Water Level:</strong> `;
      if (maxWater !== minWater) {
        content += `${minWater}ft - ${maxWater}ft`;
      } else {
        content += `${minWater}ft`;
      }
      content += `</div>`;
    }
    
    // Projects
    if (projectNames.length > 0) {
      content += `<div class="popup-section">`;
      content += `<strong>📁 Projects:</strong> ${projectNames.join(', ')}`;
      content += `</div>`;
    }
    
    // View all records button
    content += `<div class="popup-actions">`;
    content += `<button class="btn-primary popup-btn" onclick="mapManager.showLocationRecords(${location.lat}, ${location.lng})">View All Records</button>`;
    content += `</div>`;
    
    content += `</div>`;
    return content;
  }

  // Show all records at a location in a modal
  async showLocationRecords(lat, lng) {
    try {
      const records = await db.getRecordsAtLocation(lat, lng);
      
      if (records.length === 0) {
        UTILS.showToast('No records found at this location', 'warning');
        return;
      }
      
      // Remove existing modal
      const existingModal = document.getElementById('locationRecordsModal');
      if (existingModal) existingModal.remove();
      
      let modalHtml = `
        <div id="locationRecordsModal" class="modal-overlay show">
          <div class="modal location-records-modal">
            <div class="modal-header">
              <h3 class="modal-title">📍 Records at Location</h3>
              <button class="modal-close" onclick="document.getElementById('locationRecordsModal').remove()">×</button>
            </div>
            <div class="modal-subheader">
              <span>${lat.toFixed(6)}, ${lng.toFixed(6)}</span>
              <span>${records.length} record(s)</span>
            </div>
            <div class="modal-body">
              <div class="records-grid">
      `;
      
      for (const record of records) {
        const projectName = projectManager?.getProjects()?.find(p => p.id === record.project)?.name || 'Unknown';
        const date = record.metadata?.date ? UTILS.formatDate(record.metadata.date) : 'No date';
        
        // Generate file thumbnails preview
        const fileThumbnails = this.generateFileThumbnailsPreview(record.files);
        
        modalHtml += `
          <div class="record-card" onclick="searchManager.showRecordDetails(${JSON.stringify(record).replace(/"/g, '&quot;')})">
            <div class="record-card-header">
              <strong>🔧 ${record.metadata?.boreId || 'No ID'}</strong>
              <span class="record-date">${date}</span>
            </div>
            <div class="record-card-body">
              <div class="record-project">📁 ${projectName}</div>
              ${record.metadata?.waterLevel ? `<div class="record-water">💧 ${record.metadata.waterLevel}ft</div>` : ''}
              ${record.metadata?.strataLayers?.length ? `<div class="record-strata">🗂️ ${record.metadata.strataLayers.length} strata layers</div>` : ''}
              ${fileThumbnails}
            </div>
          </div>
        `;
      }
      
      modalHtml += `
              </div>
            </div>
            <div class="modal-footer">
              <button class="btn-secondary" onclick="document.getElementById('locationRecordsModal').remove()">Close</button>
            </div>
          </div>
        </div>
      `;
      
      document.body.insertAdjacentHTML('beforeend', modalHtml);
      
    } catch (error) {
      console.error('Failed to show location records:', error);
      UTILS.showToast('Failed to load records', 'error');
    }
  }

  // Generate file thumbnails preview for record cards
  generateFileThumbnailsPreview(files) {
    if (!files || files.length === 0) return '';
    
    let html = '<div class="record-files-preview">';
    
    // Show up to 3 file thumbnails
    const maxThumbnails = 3;
    let thumbnailCount = 0;
    
    for (const file of files) {
      if (thumbnailCount >= maxThumbnails) break;
      
      const fileExt = file.name.split('.').pop().toLowerCase();
      const isImage = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp'].includes(fileExt);
      const isPdf = fileExt === 'pdf';
      const isExcel = ['xlsx', 'xls', 'csv'].includes(fileExt);
      
      if (isImage && file.data) {
        html += `<div class="mini-thumbnail"><img src="${file.data}" alt="${file.name}" title="${file.name}"></div>`;
      } else if (isPdf) {
        html += `<div class="mini-thumbnail mini-icon pdf" title="${file.name}">PDF</div>`;
      } else if (isExcel) {
        html += `<div class="mini-thumbnail mini-icon excel" title="${file.name}">XLS</div>`;
      } else {
        html += `<div class="mini-thumbnail mini-icon doc" title="${file.name}">📄</div>`;
      }
      
      thumbnailCount++;
    }
    
    // Show count if more files
    if (files.length > maxThumbnails) {
      html += `<div class="mini-thumbnail more-files">+${files.length - maxThumbnails}</div>`;
    }
    
    html += '</div>';
    return html;
  }
  
  // Get color for strata layer type
  getStrataColor(layerType) {
    const colors = {
      'clay': '#8B4513',
      'sand': '#F4A460',
      'gravel': '#A0A0A0',
      'rock': '#696969',
      'limestone': '#F5F5DC',
      'shale': '#2F4F4F',
      'sandstone': '#DEB887',
      'silt': '#D2B48C',
      'topsoil': '#654321',
      'bedrock': '#2F2F2F'
    };
    return colors[layerType] || '#CCCCCC';
  }

  // Show detailed project view with strata charts
  showProjectDetails(projectName, projectFiles) {
    // Parse the JSON string back to array
    const files = typeof projectFiles === 'string' ? JSON.parse(projectFiles) : projectFiles;
    
    // Create modal for detailed view
    const modal = document.createElement('div');
    modal.className = 'modal-overlay show project-details-modal';
    modal.innerHTML = this.createProjectDetailsModal(projectName, files);
    document.body.appendChild(modal);
    
    // Add event listeners
    this.setupProjectDetailsEvents(modal);
  }

  // Create project details modal content
  createProjectDetailsModal(projectName, files) {
    let content = `
      <div class="modal project-details">
        <div class="modal-header">
          <h3 class="modal-title">📁 ${projectName} - Detailed View</h3>
          <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">×</button>
        </div>
        <div class="modal-body">
          <div class="project-summary">
            <div class="summary-stats">
              <div class="stat-item">
                <span class="stat-label">Total Borings:</span>
                <span class="stat-value">${files.length}</span>
              </div>
              <div class="stat-item">
                <span class="stat-label">Date Range:</span>
                <span class="stat-value">${this.getDateRange(files)}</span>
              </div>
              <div class="stat-item">
                <span class="stat-label">Water Level Range:</span>
                <span class="stat-value">${this.getWaterLevelRange(files)}</span>
              </div>
            </div>
          </div>
          
          <div class="borings-grid">
    `;
    
    // Sort files by date
    files.sort((a, b) => new Date(b.metadata.date || 0) - new Date(a.metadata.date || 0));
    
    files.forEach((file, index) => {
      content += this.createBoringCard(file, index);
    });
    
    content += `
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn-secondary" onclick="this.closest('.modal-overlay').remove()">Close</button>
        </div>
      </div>
    `;
    
    return content;
  }

  // Create individual boring card with strata chart
  createBoringCard(file, index) {
    const date = file.metadata.date ? UTILS.formatDate(file.metadata.date) : 'No date';
    const boreId = file.metadata.boreId || `Boring ${index + 1}`;
    const waterLevel = file.metadata.waterLevel ? `${file.metadata.waterLevel}ft` : 'No data';
    const coordinates = file.metadata.coordinates;
    
    let card = `
      <div class="boring-card">
        <div class="boring-header">
          <h4>🔧 ${boreId}</h4>
          <span class="boring-date">${date}</span>
        </div>
        
        <div class="boring-info">
          <div class="info-row">
            <span class="info-label">📍 Location:</span>
            <span class="info-value">${coordinates ? `${coordinates.lat.toFixed(6)}, ${coordinates.lng.toFixed(6)}` : 'No location'}</span>
          </div>
          <div class="info-row">
            <span class="info-label">💧 Water Level:</span>
            <span class="info-value">${waterLevel}</span>
          </div>
          ${file.files && file.files.length > 0 ? `
          <div class="info-row">
            <span class="info-label">📎 Files:</span>
            <span class="info-value">${file.files.length} attached</span>
          </div>
          ` : ''}
        </div>
    `;
    
    // Add strata chart if available
    if (file.metadata.strataLayers && file.metadata.strataLayers.length > 0) {
      card += `
        <div class="detailed-strata-chart">
          <h5>📊 Strata Profile</h5>
          <div class="strata-visualization">
            <div class="depth-scale">
      `;
      
      let currentDepth = 0;
      const totalDepth = file.metadata.strataLayers.reduce((sum, layer) => sum + (layer.thickness || 1), 0);
      
      file.metadata.strataLayers.forEach((layer, layerIndex) => {
        const thickness = layer.thickness || 1;
        const color = this.getStrataColor(layer.type);
        const endDepth = currentDepth + thickness;
        const heightPercent = (thickness / totalDepth) * 100;
        
        card += `
          <div class="detailed-strata-layer" style="background-color: ${color}; height: ${Math.max(heightPercent, 10)}%;">
            <div class="layer-details">
              <span class="layer-type">${layer.type}</span>
              <span class="layer-depth">${currentDepth}' - ${endDepth}'</span>
              <span class="layer-thickness">(${thickness}ft thick)</span>
            </div>
          </div>
        `;
        
        currentDepth = endDepth;
      });
      
      card += `
            </div>
            <div class="depth-labels">
              <span class="depth-start">0'</span>
              <span class="depth-end">${totalDepth}'</span>
            </div>
          </div>
        </div>
      `;
    } else {
      card += `
        <div class="no-strata">
          <span class="no-data-message">📊 No strata data available</span>
        </div>
      `;
    }
    
    // Add notes if available
    if (file.metadata.notes) {
      card += `
        <div class="boring-notes">
          <h5>📝 Notes</h5>
          <p>${file.metadata.notes}</p>
        </div>
      `;
    }
    
    // Add tags if available
    if (file.metadata.tags && file.metadata.tags.length > 0) {
      card += `
        <div class="boring-tags">
          <h5>🏷️ Tags</h5>
          <div class="tag-list">
            ${file.metadata.tags.map(tag => `<span class="tag">${tag}</span>`).join('')}
          </div>
        </div>
      `;
    }
    
    card += `</div>`;
    return card;
  }

  // Get date range for project
  getDateRange(files) {
    const dates = files.map(f => f.metadata.date).filter(Boolean).map(d => new Date(d));
    if (dates.length === 0) return 'No dates';
    
    const minDate = new Date(Math.min(...dates));
    const maxDate = new Date(Math.max(...dates));
    
    if (minDate.getTime() === maxDate.getTime()) {
      return UTILS.formatDate(minDate);
    }
    
    return `${UTILS.formatDate(minDate)} - ${UTILS.formatDate(maxDate)}`;
  }

  // Get water level range for project
  getWaterLevelRange(files) {
    const waterLevels = files.map(f => f.metadata.waterLevel).filter(Boolean);
    if (waterLevels.length === 0) return 'No data';
    
    const min = Math.min(...waterLevels);
    const max = Math.max(...waterLevels);
    
    if (min === max) {
      return `${min}ft`;
    }
    
    return `${min}ft - ${max}ft`;
  }

  // Setup event listeners for project details modal
  setupProjectDetailsEvents(modal) {
    // Close modal when clicking outside
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.remove();
      }
    });
    
    // Close modal with Escape key
    const escapeHandler = (e) => {
      if (e.key === 'Escape') {
        modal.remove();
        document.removeEventListener('keydown', escapeHandler);
      }
    };
    document.addEventListener('keydown', escapeHandler);
  }

  // Get color for strata layer type
  getStrataColor(layerType) {
    const colors = {
      'clay': '#8B4513',
      'sand': '#F4A460',
      'gravel': '#A0A0A0',
      'rock': '#696969',
      'limestone': '#F5F5DC',
      'shale': '#2F4F4F',
      'sandstone': '#DEB887',
      'silt': '#D2B48C',
      'topsoil': '#654321',
      'bedrock': '#36454F',
      'water': '#4682B4'
    };
    
    const type = layerType?.toLowerCase() || 'unknown';
    return colors[type] || '#CCCCCC';
  }

  // Fit map to show all markers
  fitToMarkers() {
    if (this.markerLayer.getLayers().length > 0) {
      const group = new L.featureGroup(this.markerLayer.getLayers());
      this.map.fitBounds(group.getBounds().pad(0.1));
    }
  }

  // Clear click marker
  clearClickMarker() {
    if (this.clickMarker) {
      this.map.removeLayer(this.clickMarker);
      this.clickMarker = null;
    }

    const latlngInput = document.getElementById('latlng');
    if (latlngInput) {
      latlngInput.value = '';
    }

    const locationStatus = document.getElementById('locationStatus');
    if (locationStatus) {
      locationStatus.innerHTML = '';
      locationStatus.className = 'location-status';
    }
  }

  // Get current click location
  getClickLocation() {
    if (this.clickMarker) {
      const latlng = this.clickMarker.getLatLng();
      return {
        lat: latlng.lat,
        lng: latlng.lng
      };
    }
    return null;
  }

  // Refresh markers (call after adding/deleting files)
  async refreshMarkers() {
    await this.loadMarkers();
  }

  // Switch to next tile provider (fallback)
  async switchTileProvider() {
    this.tileProviderIndex = (this.tileProviderIndex + 1) % CONFIG.MAP.TILE_PROVIDERS.length;
    await this.addTileLayer();
    UTILS.showToast(`Switched to ${CONFIG.MAP.TILE_PROVIDERS[this.tileProviderIndex].name}`, 'info');
  }

  // Get map instance
  getMap() {
    return this.map;
  }
}

// Create global map manager
window.mapManager = new MapManager();