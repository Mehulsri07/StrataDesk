/**
 * Simplified UI Manager
 * Handles the new streamlined interface with modal-based workflows
 */

class SimplifiedUI {
  constructor() {
    this.currentModal = null;
    this.searchVisible = false;
    this.recentBorings = [];
    
    this.init();
  }
  
  init() {
    this.bindElements();
    this.attachEventListeners();
    this.loadRecentBorings();
    console.log('SimplifiedUI initialized');
  }
  
  bindElements() {
    this.elements = {
      // Main buttons
      addBoringBtn: document.getElementById('addBoringBtn'),
      viewAllBtn: document.getElementById('viewAllBtn'),
      searchToggle: document.getElementById('searchToggle'),
      refreshBtn: document.getElementById('refreshBtn'),
      
      // Search
      searchBar: document.getElementById('searchBar'),
      searchInput: document.getElementById('searchInput'),
      clearSearchBtn: document.getElementById('clearSearchBtn'),
      
      // Recent borings
      recentBorings: document.getElementById('recentBorings'),
      
      // Modals
      addBoringModal: document.getElementById('addBoringModal'),
      viewAllModal: document.getElementById('viewAllModal'),
      allBoringsTable: document.getElementById('allBoringsTable')
    };
  }
  
  attachEventListeners() {
    // Main buttons
    if (this.elements.addBoringBtn) {
      this.elements.addBoringBtn.addEventListener('click', () => this.openAddBoringModal());
    }
    
    if (this.elements.viewAllBtn) {
      this.elements.viewAllBtn.addEventListener('click', () => this.openViewAllModal());
    }
    
    if (this.elements.searchToggle) {
      this.elements.searchToggle.addEventListener('click', () => this.toggleSearch());
    }
    
    if (this.elements.refreshBtn) {
      this.elements.refreshBtn.addEventListener('click', () => this.refreshData());
    }
    
    // Search
    if (this.elements.searchInput) {
      this.elements.searchInput.addEventListener('input', (e) => this.handleSearch(e.target.value));
    }
    
    if (this.elements.clearSearchBtn) {
      this.elements.clearSearchBtn.addEventListener('click', () => this.clearSearch());
    }
    
    // Modal backdrop clicks
    document.addEventListener('click', (e) => {
      if (e.target.classList.contains('modal-backdrop')) {
        this.closeCurrentModal();
      }
    });
    
    // Escape key to close modals
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.currentModal) {
        this.closeCurrentModal();
      }
    });
    
    // Global functions for HTML onclick handlers
    window.closeAddBoringModal = () => this.closeAddBoringModal();
    window.closeViewAllModal = () => this.closeViewAllModal();
    window.selectAddOption = (option) => this.selectAddOption(option);
  }
  
  // Modal Management
  openAddBoringModal() {
    this.currentModal = this.elements.addBoringModal;
    this.elements.addBoringModal.classList.remove('hidden');
    document.body.classList.add('modal-open');
  }
  
  closeAddBoringModal() {
    this.elements.addBoringModal.classList.add('hidden');
    document.body.classList.remove('modal-open');
    this.currentModal = null;
  }
  
  openViewAllModal() {
    this.currentModal = this.elements.viewAllModal;
    this.elements.viewAllModal.classList.remove('hidden');
    document.body.classList.add('modal-open');
    this.loadAllBorings();
  }
  
  closeViewAllModal() {
    this.elements.viewAllModal.classList.add('hidden');
    document.body.classList.remove('modal-open');
    this.currentModal = null;
  }
  
  closeCurrentModal() {
    if (this.currentModal) {
      this.currentModal.classList.add('hidden');
      document.body.classList.remove('modal-open');
      this.currentModal = null;
    }
  }
  
  // Add Boring Options
  selectAddOption(option) {
    this.closeAddBoringModal();
    
    switch (option) {
      case 'upload':
        this.startExtractionWizard();
        break;
      case 'manual':
        this.startManualEntry();
        break;
      case 'files':
        this.startFileAttachment();
        break;
    }
  }
  
  startExtractionWizard() {
    // Create extraction wizard modal
    this.showExtractionWizard();
  }
  
  startManualEntry() {
    // Create manual entry form
    this.showManualEntryForm();
  }
  
  startFileAttachment() {
    // Create file attachment interface
    this.showFileAttachmentForm();
  }
  
  // Search Functionality
  toggleSearch() {
    this.searchVisible = !this.searchVisible;
    
    if (this.searchVisible) {
      this.elements.searchBar.classList.remove('hidden');
      this.elements.searchInput.focus();
    } else {
      this.elements.searchBar.classList.add('hidden');
      this.clearSearch();
    }
  }
  
  handleSearch(query) {
    if (query.length < 2) {
      this.showAllRecentBorings();
      return;
    }
    
    const filtered = this.recentBorings.filter(boring => 
      boring.id.toLowerCase().includes(query.toLowerCase()) ||
      boring.location.toLowerCase().includes(query.toLowerCase()) ||
      (boring.tags && boring.tags.some(tag => tag.toLowerCase().includes(query.toLowerCase())))
    );
    
    this.renderRecentBorings(filtered);
  }
  
  clearSearch() {
    this.elements.searchInput.value = '';
    this.showAllRecentBorings();
  }
  
  showAllRecentBorings() {
    this.renderRecentBorings(this.recentBorings);
  }
  
  // Data Management
  async loadRecentBorings() {
    try {
      // Load from database (mock data for now)
      this.recentBorings = [
        {
          id: 'TW-21',
          location: '25.12, 82.54',
          date: 'Jan 18, 2026',
          layers: 5,
          project: 'Site Survey 2026'
        },
        {
          id: 'TW-22',
          location: '25.15, 82.60',
          date: 'Jan 17, 2026',
          layers: 3,
          project: 'Site Survey 2026'
        },
        {
          id: 'TW-23',
          location: '25.10, 82.50',
          date: 'Jan 16, 2026',
          layers: 4,
          project: 'Site Survey 2026'
        }
      ];
      
      this.renderRecentBorings(this.recentBorings);
    } catch (error) {
      console.error('Failed to load recent borings:', error);
    }
  }
  
  renderRecentBorings(borings) {
    if (!this.elements.recentBorings) return;
    
    if (borings.length === 0) {
      this.elements.recentBorings.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">📍</div>
          <div class="empty-title">No borings found</div>
          <div class="empty-description">Add your first boring to get started</div>
        </div>
      `;
      return;
    }
    
    const html = borings.map(boring => `
      <div class="boring-item" onclick="viewBoring('${boring.id}')">
        <div class="boring-info">
          <div class="boring-id">${boring.id}</div>
          <div class="boring-location">${boring.location}</div>
          <div class="boring-date">${boring.date}</div>
        </div>
        <div class="boring-layers">${boring.layers} layers</div>
        <div class="boring-actions">
          <button class="btn-icon" onclick="event.stopPropagation(); viewOnMap('${boring.id}')" title="View on map">📍</button>
          <button class="btn-icon" onclick="event.stopPropagation(); editBoring('${boring.id}')" title="Edit">✏️</button>
        </div>
      </div>
    `).join('');
    
    this.elements.recentBorings.innerHTML = html;
  }
  
  async loadAllBorings() {
    try {
      // Load all borings for the table view
      const allBorings = [
        ...this.recentBorings,
        {
          id: 'TW-20',
          location: '25.08, 82.45',
          date: 'Jan 15, 2026',
          layers: 6,
          project: 'Site Survey 2026'
        },
        {
          id: 'TW-19',
          location: '25.05, 82.40',
          date: 'Jan 14, 2026',
          layers: 4,
          project: 'Site Survey 2026'
        }
      ];
      
      this.renderAllBoringsTable(allBorings);
    } catch (error) {
      console.error('Failed to load all borings:', error);
    }
  }
  
  renderAllBoringsTable(borings) {
    if (!this.elements.allBoringsTable) return;
    
    const html = borings.map(boring => `
      <tr onclick="viewBoring('${boring.id}')">
        <td>${boring.id}</td>
        <td>${boring.location}</td>
        <td>${boring.date}</td>
        <td>${boring.layers}</td>
        <td>${boring.project}</td>
        <td>
          <button class="btn-icon" onclick="event.stopPropagation(); editBoring('${boring.id}')" title="Edit">✏️</button>
          <button class="btn-icon" onclick="event.stopPropagation(); deleteBoring('${boring.id}')" title="Delete">🗑️</button>
        </td>
      </tr>
    `).join('');
    
    this.elements.allBoringsTable.innerHTML = html;
  }
  
  refreshData() {
    this.loadRecentBorings();
    this.showNotification('Data refreshed', 'success');
  }
  
  // Wizard Creation Methods
  showExtractionWizard() {
    const wizardModal = this.createModal('Extract Strata Layers', this.getExtractionWizardContent());
    document.body.appendChild(wizardModal);
    this.currentModal = wizardModal;
  }
  
  showManualEntryForm() {
    const formModal = this.createModal('Manual Entry', this.getManualEntryContent());
    document.body.appendChild(formModal);
    this.currentModal = formModal;
  }
  
  showFileAttachmentForm() {
    const fileModal = this.createModal('Attach Files', this.getFileAttachmentContent());
    document.body.appendChild(fileModal);
    this.currentModal = fileModal;
  }
  
  createModal(title, content) {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
      <div class="modal-backdrop"></div>
      <div class="modal-content">
        <div class="modal-header">
          <h2>${title}</h2>
          <button class="modal-close" onclick="this.closest('.modal').remove(); document.body.classList.remove('modal-open');">✕</button>
        </div>
        <div class="modal-body">
          ${content}
        </div>
      </div>
    `;
    
    document.body.classList.add('modal-open');
    return modal;
  }
  
  getExtractionWizardContent() {
    return `
      <div class="extraction-wizard">
        <div class="wizard-step active" data-step="1">
          <h3>Step 1: Upload File</h3>
          <div class="upload-zone">
            <input type="file" accept=".pdf,.xlsx,.xls" class="file-input" onchange="handleWizardUpload(this)">
            <div class="upload-content">
              <div class="upload-icon">📄</div>
              <div class="upload-text">Drop PDF or Excel file here</div>
            </div>
          </div>
        </div>
        
        <div class="wizard-step" data-step="2">
          <h3>Step 2: Review Layers</h3>
          <div id="wizardLayers" class="wizard-layers">
            <!-- Will be populated after upload -->
          </div>
        </div>
        
        <div class="wizard-step" data-step="3">
          <h3>Step 3: Add Location & Save</h3>
          <div class="wizard-form">
            <input type="text" placeholder="Bore ID (e.g., TW-24)" class="form-input">
            <input type="text" placeholder="Location (click map or enter coordinates)" class="form-input">
            <input type="date" class="form-input">
            <button class="btn-primary" onclick="saveExtractedBoring()">Save Boring</button>
          </div>
        </div>
      </div>
    `;
  }
  
  getManualEntryContent() {
    return `
      <div class="manual-entry-form">
        <div class="form-grid">
          <div class="form-group">
            <label>Bore ID</label>
            <input type="text" placeholder="TW-24" class="form-input">
          </div>
          <div class="form-group">
            <label>Date</label>
            <input type="date" class="form-input">
          </div>
          <div class="form-group">
            <label>Location</label>
            <input type="text" placeholder="Click map or enter coordinates" class="form-input">
          </div>
          <div class="form-group">
            <label>Water Level (ft)</label>
            <input type="number" step="0.1" placeholder="41.0" class="form-input">
          </div>
        </div>
        
        <div class="strata-entry">
          <h4>Strata Layers</h4>
          <div class="layer-inputs">
            <div class="layer-input">
              <select class="form-select">
                <option>Topsoil</option>
                <option>Clay</option>
                <option>Sand</option>
                <option>Gravel</option>
              </select>
              <input type="number" placeholder="Start depth" class="form-input">
              <input type="number" placeholder="End depth" class="form-input">
              <button class="btn-icon">+</button>
            </div>
          </div>
        </div>
        
        <div class="form-actions">
          <button class="btn-secondary" onclick="this.closest('.modal').remove(); document.body.classList.remove('modal-open');">Cancel</button>
          <button class="btn-primary" onclick="saveManualBoring()">Save Boring</button>
        </div>
      </div>
    `;
  }
  
  getFileAttachmentContent() {
    return `
      <div class="file-attachment-form">
        <div class="form-grid">
          <div class="form-group">
            <label>Bore ID</label>
            <input type="text" placeholder="TW-24" class="form-input">
          </div>
          <div class="form-group">
            <label>Date</label>
            <input type="date" class="form-input">
          </div>
          <div class="form-group">
            <label>Location</label>
            <input type="text" placeholder="Click map or enter coordinates" class="form-input">
          </div>
        </div>
        
        <div class="file-upload-section">
          <h4>Attach Files</h4>
          <div class="upload-zone">
            <input type="file" multiple accept=".pdf,.xlsx,.xls,.jpg,.jpeg,.png" class="file-input">
            <div class="upload-content">
              <div class="upload-icon">📁</div>
              <div class="upload-text">Drop files here or click to browse</div>
              <div class="upload-formats">PDF, Excel, Images</div>
            </div>
          </div>
        </div>
        
        <div class="form-actions">
          <button class="btn-secondary" onclick="this.closest('.modal').remove(); document.body.classList.remove('modal-open');">Cancel</button>
          <button class="btn-primary" onclick="saveFileAttachment()">Save Boring</button>
        </div>
      </div>
    `;
  }
  
  // Utility Methods
  showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 12px 20px;
      border-radius: 8px;
      color: white;
      font-weight: 500;
      z-index: 1001;
      animation: slideIn 0.3s ease;
    `;
    
    switch (type) {
      case 'success': notification.style.background = '#10b981'; break;
      case 'error': notification.style.background = '#ef4444'; break;
      case 'warning': notification.style.background = '#f59e0b'; break;
      default: notification.style.background = '#0b5fff';
    }
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
      notification.remove();
    }, 3000);
  }
}

// Global functions for HTML onclick handlers
window.viewBoring = (id) => {
  console.log('View boring:', id);
  // Implement boring detail view
};

window.editBoring = (id) => {
  console.log('Edit boring:', id);
  // Implement boring edit
};

window.deleteBoring = (id) => {
  console.log('Delete boring:', id);
  // Implement boring deletion
};

window.viewOnMap = (id) => {
  console.log('View on map:', id);
  // Focus map on boring location
};

window.handleWizardUpload = (input) => {
  console.log('Wizard upload:', input.files);
  // Handle file upload in wizard
};

window.saveExtractedBoring = () => {
  console.log('Save extracted boring');
  // Save extracted boring data
};

window.saveManualBoring = () => {
  console.log('Save manual boring');
  // Save manual boring data
};

window.saveFileAttachment = () => {
  console.log('Save file attachment');
  // Save file attachment boring
};

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  window.simplifiedUI = new SimplifiedUI();
});