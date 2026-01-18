/**
 * Simplified UI Manager - New Architecture
 * Handles all UI interactions for the simplified interface
 */

class UIManagerNew {
  constructor() {
    this.currentModal = null;
    this.extractionData = null;
    this.currentStep = 1;
    this.isInitialized = false;
  }

  async init() {
    if (this.isInitialized) return;
    
    console.log('🎨 Initializing new UI manager...');
    
    this.bindElements();
    this.attachEventListeners();
    this.initializeMap();
    
    this.isInitialized = true;
    console.log('✅ New UI manager initialized');
  }

  bindElements() {
    // Top bar
    this.elements = {
      addBoringBtn: document.getElementById('addBoringBtn'),
      viewAllBtn: document.getElementById('viewAllBtn'),
      darkModeToggle: document.getElementById('darkModeToggle'),
      settingsBtn: document.getElementById('settingsBtn'),
      logoutBtn: document.getElementById('logoutBtn'),
      
      // Bottom panel
      bottomPanel: document.getElementById('bottomPanel'),
      toggleBottomPanel: document.getElementById('toggleBottomPanel'),
      recentBoringsList: document.getElementById('recentBoringsList'),
      
      // Modals
      addBoringModal: document.getElementById('addBoringModal'),
      extractionWizardModal: document.getElementById('extractionWizardModal'),
      manualEntryModal: document.getElementById('manualEntryModal'),
      filesOnlyModal: document.getElementById('filesOnlyModal'),
      viewAllModal: document.getElementById('viewAllModal'),
      
      // Map
      mapContainer: document.getElementById('map')
    };
  }

  attachEventListeners() {
    // Top bar actions
    this.elements.addBoringBtn?.addEventListener('click', () => this.showAddBoringModal());
    this.elements.viewAllBtn?.addEventListener('click', () => this.showViewAllModal());
    this.elements.darkModeToggle?.addEventListener('click', () => this.toggleDarkMode());
    this.elements.settingsBtn?.addEventListener('click', () => this.showSettings());
    this.elements.logoutBtn?.addEventListener('click', () => this.handleLogout());
    
    // Bottom panel toggle
    this.elements.toggleBottomPanel?.addEventListener('click', () => this.toggleBottomPanel());
    
    // Add Boring Modal
    document.getElementById('closeAddBoringModal')?.addEventListener('click', () => this.closeModal('addBoringModal'));
    document.getElementById('choiceUpload')?.addEventListener('click', () => this.startExtractionWizard());
    document.getElementById('choiceManual')?.addEventListener('click', () => this.startManualEntry());
    document.getElementById('choiceFiles')?.addEventListener('click', () => this.startFilesOnly());
    
    // Extraction Wizard
    document.getElementById('closeExtractionWizard')?.addEventListener('click', () => this.closeModal('extractionWizardModal'));
    document.getElementById('wizardUploadZone')?.addEventListener('click', () => document.getElementById('wizardFileInput').click());
    document.getElementById('wizardFileInput')?.addEventListener('change', (e) => this.handleWizardFileUpload(e));
    document.getElementById('wizardBackToUpload')?.addEventListener('click', () => this.wizardGoToStep(1));
    document.getElementById('wizardNextToDetails')?.addEventListener('click', () => this.wizardGoToStep(3));
    document.getElementById('wizardBackToReview')?.addEventListener('click', () => this.wizardGoToStep(2));
    document.getElementById('wizardSave')?.addEventListener('click', () => this.saveWizardBoring());
    
    // Manual Entry
    document.getElementById('closeManualEntry')?.addEventListener('click', () => this.closeModal('manualEntryModal'));
    document.getElementById('addManualLayer')?.addEventListener('click', () => this.addManualLayerRow());
    document.getElementById('cancelManualEntry')?.addEventListener('click', () => this.closeModal('manualEntryModal'));
    document.getElementById('saveManualEntry')?.addEventListener('click', () => this.saveManualBoring());
    
    // Files Only
    document.getElementById('closeFilesOnly')?.addEventListener('click', () => this.closeModal('filesOnlyModal'));
    document.getElementById('cancelFilesOnly')?.addEventListener('click', () => this.closeModal('filesOnlyModal'));
    document.getElementById('saveFilesOnly')?.addEventListener('click', () => this.saveFilesOnlyBoring());
    
    // View All
    document.getElementById('closeViewAll')?.addEventListener('click', () => this.closeModal('viewAllModal'));
    document.getElementById('searchBorings')?.addEventListener('input', (e) => this.filterBorings(e.target.value));
    document.getElementById('exportAllData')?.addEventListener('click', () => this.exportAllData());
    
    // Drag and drop for wizard
    this.setupDragAndDrop();
  }

  initializeMap() {
    if (!this.elements.mapContainer) return;
    
    // Initialize Leaflet map
    if (typeof L !== 'undefined') {
      this.map = L.map('map').setView([25.0, 82.0], 6);
      
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
      }).addTo(this.map);
      
      this.markers = L.layerGroup().addTo(this.map);
      
      console.log('✅ Map initialized');
    }
  }

  // Modal Management
  showAddBoringModal() {
    this.showModal('addBoringModal');
  }

  showModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.classList.remove('hidden');
      this.currentModal = modalId;
    }
  }

  closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.classList.add('hidden');
      this.currentModal = null;
    }
  }

  closeAllModals() {
    ['addBoringModal', 'extractionWizardModal', 'manualEntryModal', 'filesOnlyModal', 'viewAllModal'].forEach(id => {
      this.closeModal(id);
    });
  }

  // Bottom Panel
  toggleBottomPanel() {
    this.elements.bottomPanel?.classList.toggle('collapsed');
  }

  // Extraction Wizard
  startExtractionWizard() {
    this.closeModal('addBoringModal');
    this.showModal('extractionWizardModal');
    this.wizardGoToStep(1);
  }

  wizardGoToStep(step) {
    this.currentStep = step;
    
    // Update step indicators
    document.querySelectorAll('.wizard-step').forEach((el, index) => {
      if (index + 1 === step) {
        el.classList.add('active');
      } else {
        el.classList.remove('active');
      }
    });
    
    // Show/hide content
    for (let i = 1; i <= 3; i++) {
      const content = document.getElementById(`wizardStep${i}`);
      if (content) {
        if (i === step) {
          content.classList.remove('hidden');
        } else {
          content.classList.add('hidden');
        }
      }
    }
  }

  setupDragAndDrop() {
    const uploadZone = document.getElementById('wizardUploadZone');
    if (!uploadZone) return;
    
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
      uploadZone.addEventListener(eventName, (e) => {
        e.preventDefault();
        e.stopPropagation();
      });
    });
    
    ['dragenter', 'dragover'].forEach(eventName => {
      uploadZone.addEventListener(eventName, () => {
        uploadZone.classList.add('dragover');
      });
    });
    
    ['dragleave', 'drop'].forEach(eventName => {
      uploadZone.addEventListener(eventName, () => {
        uploadZone.classList.remove('dragover');
      });
    });
    
    uploadZone.addEventListener('drop', (e) => {
      const files = e.dataTransfer.files;
      if (files.length > 0) {
        this.processWizardFile(files[0]);
      }
    });
  }

  async handleWizardFileUpload(event) {
    const file = event.target.files[0];
    if (file) {
      await this.processWizardFile(file);
    }
  }

  async processWizardFile(file) {
    console.log('Processing file:', file.name);
    
    // Show file info
    const fileInfo = document.getElementById('wizardFileInfo');
    if (fileInfo) {
      fileInfo.innerHTML = `
        <div class="file-info-card">
          <div class="file-icon">📄</div>
          <div class="file-details">
            <div class="file-name">${file.name}</div>
            <div class="file-size">${this.formatFileSize(file.size)}</div>
          </div>
        </div>
      `;
      fileInfo.classList.remove('hidden');
    }
    
    // Show progress
    const progress = document.getElementById('wizardProgress');
    if (progress) {
      progress.classList.remove('hidden');
      progress.innerHTML = '<div class="progress-text">Extracting layers...</div>';
    }
    
    // Extract using existing engine
    try {
      const fileType = file.name.toLowerCase().endsWith('.pdf') ? 'pdf' : 'excel';
      
      if (window.StrataExtraction && window.StrataExtraction.extractor) {
        const result = await window.StrataExtraction.extractor.extractFromFile(file, fileType);
        
        if (result.success && result.data) {
          this.extractionData = result.data;
          this.populateReviewTable(result.data.layers || []);
          this.wizardGoToStep(2);
        } else {
          throw new Error(result.errors?.[0] || 'Extraction failed');
        }
      } else {
        // Fallback: mock data for demo
        this.extractionData = this.createMockExtractionData();
        this.populateReviewTable(this.extractionData.layers);
        this.wizardGoToStep(2);
      }
    } catch (error) {
      console.error('Extraction error:', error);
      alert('Failed to extract layers: ' + error.message);
      if (progress) progress.classList.add('hidden');
    }
  }

  createMockExtractionData() {
    return {
      layers: [
        { material: 'Topsoil', start_depth: 0, end_depth: 2, confidence: 'high' },
        { material: 'Clay', start_depth: 2, end_depth: 8, confidence: 'high' },
        { material: 'Sand', start_depth: 8, end_depth: 15, confidence: 'medium' },
        { material: 'Gravel', start_depth: 15, end_depth: 22, confidence: 'high' }
      ],
      metadata: {
        depth_unit: 'feet',
        total_depth: 22
      }
    };
  }

  populateReviewTable(layers) {
    const tbody = document.getElementById('wizardReviewTableBody');
    if (!tbody) return;
    
    tbody.innerHTML = layers.map((layer, index) => {
      const thickness = (layer.end_depth - layer.start_depth).toFixed(1);
      return `
        <tr>
          <td>${index + 1}</td>
          <td contenteditable="true" data-field="material" data-index="${index}">${layer.material}</td>
          <td contenteditable="true" data-field="start_depth" data-index="${index}">${layer.start_depth}</td>
          <td contenteditable="true" data-field="end_depth" data-index="${index}">${layer.end_depth}</td>
          <td>${thickness} ft</td>
          <td><span class="confidence-badge ${layer.confidence}">${layer.confidence}</span></td>
          <td>
            <button class="btn-icon-sm btn-danger" onclick="uiManagerNew.deleteReviewRow(${index})">✕</button>
          </td>
        </tr>
      `;
    }).join('');
    
    // Add contenteditable listeners
    tbody.querySelectorAll('[contenteditable]').forEach(cell => {
      cell.addEventListener('blur', (e) => this.updateReviewCell(e.target));
    });
  }

  updateReviewCell(cell) {
    const index = parseInt(cell.dataset.index);
    const field = cell.dataset.field;
    const value = cell.textContent.trim();
    
    if (this.extractionData && this.extractionData.layers[index]) {
      if (field === 'start_depth' || field === 'end_depth') {
        this.extractionData.layers[index][field] = parseFloat(value);
      } else {
        this.extractionData.layers[index][field] = value;
      }
    }
  }

  deleteReviewRow(index) {
    if (this.extractionData && this.extractionData.layers) {
      this.extractionData.layers.splice(index, 1);
      this.populateReviewTable(this.extractionData.layers);
    }
  }

  async saveWizardBoring() {
    const boreId = document.getElementById('wizardBoreId')?.value;
    const location = document.getElementById('wizardLocation')?.value;
    
    if (!boreId || !location) {
      alert('Please fill in Bore ID and Location');
      return;
    }
    
    const boringData = {
      id: this.generateId(),
      boreId: boreId,
      location: location,
      date: document.getElementById('wizardDate')?.value || new Date().toISOString().split('T')[0],
      waterLevel: document.getElementById('wizardWaterLevel')?.value,
      project: document.getElementById('wizardProject')?.value,
      notes: document.getElementById('wizardNotes')?.value,
      layers: this.extractionData?.layers || [],
      createdAt: new Date().toISOString()
    };
    
    await this.saveBoring(boringData);
    this.closeModal('extractionWizardModal');
    this.refreshRecentBorings();
  }

  // Manual Entry
  startManualEntry() {
    this.closeModal('addBoringModal');
    this.showModal('manualEntryModal');
    
    // Set today's date
    const dateInput = document.getElementById('manualDate');
    if (dateInput) {
      dateInput.value = new Date().toISOString().split('T')[0];
    }
  }

  addManualLayerRow() {
    const container = document.getElementById('manualLayersContainer');
    if (!container) return;
    
    const row = document.createElement('div');
    row.className = 'manual-layer-row';
    row.innerHTML = `
      <input type="text" class="form-input" placeholder="Material" data-field="material">
      <input type="number" class="form-input" placeholder="Start (ft)" step="0.1" data-field="start">
      <input type="number" class="form-input" placeholder="End (ft)" step="0.1" data-field="end">
      <button class="btn-icon-sm btn-danger" onclick="this.parentElement.remove()">✕</button>
    `;
    container.appendChild(row);
  }

  async saveManualBoring() {
    const boreId = document.getElementById('manualBoreId')?.value;
    const location = document.getElementById('manualLocation')?.value;
    
    if (!boreId || !location) {
      alert('Please fill in Bore ID and Location');
      return;
    }
    
    // Collect layers
    const layers = [];
    document.querySelectorAll('#manualLayersContainer .manual-layer-row').forEach(row => {
      const material = row.querySelector('[data-field="material"]')?.value;
      const start = parseFloat(row.querySelector('[data-field="start"]')?.value);
      const end = parseFloat(row.querySelector('[data-field="end"]')?.value);
      
      if (material && !isNaN(start) && !isNaN(end)) {
        layers.push({
          material,
          start_depth: start,
          end_depth: end,
          confidence: 'high'
        });
      }
    });
    
    const boringData = {
      id: this.generateId(),
      boreId: boreId,
      location: location,
      date: document.getElementById('manualDate')?.value || new Date().toISOString().split('T')[0],
      waterLevel: document.getElementById('manualWaterLevel')?.value,
      project: document.getElementById('manualProject')?.value,
      notes: document.getElementById('manualNotes')?.value,
      layers: layers,
      createdAt: new Date().toISOString()
    };
    
    await this.saveBoring(boringData);
    this.closeModal('manualEntryModal');
    this.refreshRecentBorings();
  }

  // Files Only
  startFilesOnly() {
    this.closeModal('addBoringModal');
    this.showModal('filesOnlyModal');
  }

  async saveFilesOnlyBoring() {
    const boreId = document.getElementById('filesOnlyBoreId')?.value;
    const location = document.getElementById('filesOnlyLocation')?.value;
    
    if (!boreId || !location) {
      alert('Please fill in Bore ID and Location');
      return;
    }
    
    const boringData = {
      id: this.generateId(),
      boreId: boreId,
      location: location,
      date: new Date().toISOString().split('T')[0],
      layers: [],
      createdAt: new Date().toISOString()
    };
    
    await this.saveBoring(boringData);
    this.closeModal('filesOnlyModal');
    this.refreshRecentBorings();
  }

  // Save Boring
  async saveBoring(boringData) {
    try {
      if (window.db) {
        await window.db.add('files', boringData);
        console.log('✅ Boring saved:', boringData.boreId);
        
        // Add marker to map
        if (this.map && boringData.location) {
          const coords = this.parseCoordinates(boringData.location);
          if (coords) {
            L.marker([coords.lat, coords.lng])
              .addTo(this.markers)
              .bindPopup(`<b>${boringData.boreId}</b><br>${boringData.date}`);
          }
        }
        
        if (window.UTILS) {
          window.UTILS.showToast('Boring saved successfully!', 'success');
        }
      }
    } catch (error) {
      console.error('Failed to save boring:', error);
      alert('Failed to save boring: ' + error.message);
    }
  }

  // View All
  showViewAllModal() {
    this.showModal('viewAllModal');
    this.loadAllBorings();
  }

  async loadAllBorings() {
    try {
      if (window.db) {
        const borings = await window.db.getAll('files');
        this.populateAllBoringsTable(borings);
      }
    } catch (error) {
      console.error('Failed to load borings:', error);
    }
  }

  populateAllBoringsTable(borings) {
    const tbody = document.getElementById('allBoringsTableBody');
    if (!tbody) return;
    
    if (borings.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 2rem;">No borings found</td></tr>';
      return;
    }
    
    tbody.innerHTML = borings.map(boring => `
      <tr onclick="uiManagerNew.viewBoringDetails('${boring.id}')">
        <td>${boring.boreId || boring.id}</td>
        <td>${boring.location || 'N/A'}</td>
        <td>${boring.date || 'N/A'}</td>
        <td>${boring.layers?.length || 0}</td>
        <td>${boring.project || 'None'}</td>
        <td>
          <button class="btn-icon-sm" onclick="event.stopPropagation(); uiManagerNew.deleteBoring('${boring.id}')">🗑️</button>
        </td>
      </tr>
    `).join('');
  }

  filterBorings(query) {
    // Simple filter implementation
    const rows = document.querySelectorAll('#allBoringsTableBody tr');
    rows.forEach(row => {
      const text = row.textContent.toLowerCase();
      if (text.includes(query.toLowerCase())) {
        row.style.display = '';
      } else {
        row.style.display = 'none';
      }
    });
  }

  async deleteBoring(id) {
    if (!confirm('Delete this boring?')) return;
    
    try {
      if (window.db) {
        await window.db.delete('files', id);
        this.loadAllBorings();
        this.refreshRecentBorings();
        if (window.UTILS) {
          window.UTILS.showToast('Boring deleted', 'info');
        }
      }
    } catch (error) {
      console.error('Failed to delete boring:', error);
    }
  }

  viewBoringDetails(id) {
    console.log('View boring:', id);
    // TODO: Implement detail view
  }

  // Recent Borings
  async refreshRecentBorings() {
    try {
      if (window.db) {
        const borings = await window.db.getAll('files');
        const recent = borings.slice(-5).reverse();
        this.populateRecentBorings(recent);
      }
    } catch (error) {
      console.error('Failed to load recent borings:', error);
    }
  }

  populateRecentBorings(borings) {
    const container = this.elements.recentBoringsList;
    if (!container) return;
    
    if (borings.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">📍</div>
          <p class="empty-text">No borings yet</p>
          <button class="btn-primary" onclick="document.getElementById('addBoringBtn').click()">Add Your First Boring</button>
        </div>
      `;
      return;
    }
    
    container.innerHTML = borings.map(boring => `
      <div class="boring-item" onclick="uiManagerNew.viewBoringDetails('${boring.id}')">
        <div class="boring-icon">📍</div>
        <div class="boring-info">
          <div class="boring-id">${boring.boreId || boring.id}</div>
          <div class="boring-meta">${boring.location || 'No location'} • ${boring.date || 'No date'}</div>
        </div>
        <div class="boring-actions">
          <button class="btn-icon-sm" onclick="event.stopPropagation()">👁️</button>
        </div>
      </div>
    `).join('');
  }

  // Utilities
  generateId() {
    return 'boring_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  parseCoordinates(coordString) {
    if (!coordString) return null;
    const parts = coordString.split(',').map(s => s.trim());
    if (parts.length !== 2) return null;
    const lat = parseFloat(parts[0]);
    const lng = parseFloat(parts[1]);
    return (!isNaN(lat) && !isNaN(lng)) ? { lat, lng } : null;
  }

  toggleDarkMode() {
    document.body.classList.toggle('dark-mode');
    const icon = this.elements.darkModeToggle?.querySelector('.theme-icon');
    if (icon) {
      icon.textContent = document.body.classList.contains('dark-mode') ? '☀️' : '🌙';
    }
  }

  showSettings() {
    alert('Settings panel coming soon!');
  }

  handleLogout() {
    if (confirm('Sign out?')) {
      if (window.auth) {
        window.auth.logout();
      }
      location.reload();
    }
  }

  exportAllData() {
    alert('Export functionality coming soon!');
  }
}

// Create global instance
window.uiManagerNew = new UIManagerNew();
