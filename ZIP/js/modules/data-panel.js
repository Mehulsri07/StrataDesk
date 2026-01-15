/**
 * Data Panel Manager
 * Shows real stored data overview in the sidebar
 * Replaces instructional text with actual data summaries
 */

class DataPanel {
  constructor() {
    this.isInitialized = false;
    this.refreshInterval = null;
  }

  // Initialize data panel
  async init() {
    if (this.isInitialized) return;
    
    console.log('Initializing data panel...');
    
    // Create the data panel UI
    this.createDataPanelUI();
    
    // Load initial data
    await this.refresh();
    
    this.isInitialized = true;
    
    // Auto-refresh every 30 seconds
    this.refreshInterval = setInterval(() => this.refresh(), 30000);
    
    console.log('✅ Data panel initialized');
  }

  // Create the data panel UI in the sidebar - simplified version
  createDataPanelUI() {
    // Find the sidebar
    const sidebar = document.querySelector('.app-sidebar');
    if (!sidebar) {
      console.warn('Sidebar not found, cannot create data panel');
      return;
    }

    // Check if data panel already exists
    if (document.getElementById('dataPanelSection')) return;

    // Create simplified data panel section - only stats
    const dataPanelHtml = `
      <div id="dataPanelSection" class="sidebar-panel data-panel">
        <div class="panel-header">
          <h3>📊 Stored Data</h3>
          <button class="btn-tool" onclick="dataPanel.refresh()" title="Refresh">🔄</button>
        </div>
        <div class="panel-content">
          <div id="dataOverview" class="data-overview">
            <div class="loading-message">Loading data...</div>
          </div>
        </div>
      </div>
    `;

    // Insert after search panel
    const searchPanel = sidebar.querySelector('.sidebar-panel');
    if (searchPanel) {
      searchPanel.insertAdjacentHTML('afterend', dataPanelHtml);
    } else {
      sidebar.insertAdjacentHTML('afterbegin', dataPanelHtml);
    }
  }

  // Refresh only the data overview - simplified
  async refresh() {
    try {
      await this.updateDataOverview();
    } catch (error) {
      console.error('Failed to refresh data panel:', error);
    }
  }

  // Update the data overview stats
  async updateDataOverview() {
    const container = document.getElementById('dataOverview');
    if (!container) return;

    try {
      const stats = await db.getStats();
      
      let html = `
        <div class="data-stats">
          <div class="stat-item">
            <span class="stat-number">${stats.files}</span>
            <span class="stat-label">Records</span>
          </div>
          <div class="stat-item">
            <span class="stat-number">${stats.locations}</span>
            <span class="stat-label">Locations</span>
          </div>
          <div class="stat-item">
            <span class="stat-number">${stats.projects}</span>
            <span class="stat-label">Projects</span>
          </div>
        </div>
      `;
      
      if (stats.totalSize > 0) {
        html += `<div class="data-size">Total: ${UTILS.formatFileSize(stats.totalSize)}</div>`;
      }
      
      container.innerHTML = html;
      
    } catch (error) {
      container.innerHTML = '<div class="error-message">Failed to load stats</div>';
      console.error('Failed to update data overview:', error);
    }
  }

  // Cleanup
  destroy() {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
      this.refreshInterval = null;
    }
    this.isInitialized = false;
  }
}

// Create global instance
window.dataPanel = new DataPanel();
