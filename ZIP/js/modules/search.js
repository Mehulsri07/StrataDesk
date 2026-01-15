// Search functionality module
class SearchManager {
  constructor() {
    this.searchResults = [];
    this.currentQuery = '';
    this.searchTimeout = null;
  }

  // Initialize search
  async init() {
    this.setupSearchInput();
  }

  // Setup search input with debouncing
  setupSearchInput() {
    const searchInput = document.getElementById('searchQ');
    const searchBtn = document.getElementById('searchBtn');
    const clearBtn = document.getElementById('clearSearch');

    if (searchInput) {
      // Debounced search on input
      searchInput.addEventListener('input', UTILS.debounce((e) => {
        this.performSearch(e.target.value);
      }, CONFIG.UI.SEARCH_DEBOUNCE || 300));

      // Immediate search on Enter
      searchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          this.performSearch(searchInput.value);
        }
      });
    }

    if (searchBtn) {
      searchBtn.addEventListener('click', () => {
        this.performSearch(searchInput?.value || '');
      });
    }

    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        this.clearSearch();
      });
    }
  }

  // Perform search on actual stored records
  async performSearch(query) {
    const trimmedQuery = query?.trim() || '';
    this.currentQuery = trimmedQuery;

    if (trimmedQuery.length === 0) {
      this.clearResults();
      return;
    }

    if (trimmedQuery.length < 2) {
      this.showMessage('Enter at least 2 characters to search');
      return;
    }

    try {
      this.showLoading();
      
      console.log('Searching stored records for:', trimmedQuery);
      
      // Get all stored records from database
      const allRecords = await db.getAll(CONFIG.STORES.FILES);
      console.log('Total records in database:', allRecords.length);
      
      // Search through actual record data
      const results = [];
      const queryLower = trimmedQuery.toLowerCase();
      
      for (const record of allRecords) {
        const searchableText = this.getSearchableText(record).toLowerCase();
        
        if (searchableText.includes(queryLower)) {
          // Get project name
          let projectName = 'Unknown Project';
          if (window.projectManager && record.project) {
            const project = projectManager.getProjects().find(p => p.id === record.project);
            projectName = project?.name || 'Unknown Project';
          }
          
          results.push({
            id: record.id,
            record: record,
            projectName: projectName,
            boreId: record.metadata?.boreId || 'No ID',
            date: record.metadata?.date || record.metadata?.createdAt,
            coordinates: record.metadata?.coordinates,
            waterLevel: record.metadata?.waterLevel,
            preview: this.getRecordPreview(record),
            score: this.calculateRelevance(searchableText, queryLower)
          });
        }
      }
      
      // Sort by relevance score
      results.sort((a, b) => b.score - a.score);
      
      this.searchResults = results;
      console.log('Search found', results.length, 'results');
      this.displayResults();
      
    } catch (error) {
      console.error('Search failed:', error);
      this.showMessage('Search failed: ' + error.message);
    }
  }

  // Get searchable text from a record
  getSearchableText(record) {
    const parts = [];
    
    // Basic metadata
    parts.push(record.filename || '');
    parts.push(record.metadata?.boreId || '');
    parts.push(record.metadata?.notes || '');
    parts.push((record.metadata?.tags || []).join(' '));
    parts.push(record.metadata?.strataSummary || '');
    
    // Strata layers
    if (record.metadata?.strataLayers) {
      record.metadata.strataLayers.forEach(layer => {
        parts.push(layer.type || '');
      });
    }
    
    // Coordinates as text
    if (record.metadata?.coordinates) {
      parts.push(`${record.metadata.coordinates.lat},${record.metadata.coordinates.lng}`);
    }
    
    return parts.join(' ');
  }

  // Get preview text for a record
  getRecordPreview(record) {
    const parts = [];
    
    if (record.metadata?.waterLevel) {
      parts.push(`💧 ${record.metadata.waterLevel}ft`);
    }
    
    if (record.metadata?.strataLayers && record.metadata.strataLayers.length > 0) {
      parts.push(`🗂️ ${record.metadata.strataLayers.length} layers`);
    }
    
    if (record.files && record.files.length > 0) {
      parts.push(`📎 ${record.files.length} file(s)`);
    }
    
    if (record.metadata?.notes) {
      const notesPreview = record.metadata.notes.substring(0, 50);
      parts.push(notesPreview + (record.metadata.notes.length > 50 ? '...' : ''));
    }
    
    return parts.length > 0 ? parts.join(' • ') : 'No additional details';
  }

  // Calculate search relevance score
  calculateRelevance(text, query) {
    let score = 0;
    
    // Exact match gets highest score
    if (text === query) score += 100;
    
    // Starts with query
    if (text.startsWith(query)) score += 50;
    
    // Contains query
    if (text.includes(query)) score += 25;
    
    // Count occurrences
    const matches = (text.match(new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length;
    score += matches * 10;
    
    return score;
  }

  // Search projects by name and return their files
  async searchProjects(query) {
    const queryLower = query.toLowerCase();
    const results = [];
    
    if (!window.projectManager) {
      console.warn('ProjectManager not available for project search');
      return results;
    }
    
    const projects = window.projectManager.getProjects();
    console.log('Available projects:', projects);
    
    for (const project of projects) {
      if (project.name.toLowerCase().includes(queryLower)) {
        console.log('Found matching project:', project.name);
        
        // Get all files from this project
        try {
          const projectFiles = await db.getFilesByProject(project.id);
          console.log('Files in project', project.name, ':', projectFiles);
          results.push(...projectFiles);
        } catch (error) {
          console.error('Error getting files for project', project.name, ':', error);
        }
      }
    }
    
    return results;
  }

  // Sort search results by relevance
  sortResults(results, query) {
    const queryLower = query.toLowerCase();
    
    return results.sort((a, b) => {
      // Calculate relevance scores
      const scoreA = this.calculateRelevanceScore(a, queryLower);
      const scoreB = this.calculateRelevanceScore(b, queryLower);
      
      if (scoreA !== scoreB) {
        return scoreB - scoreA; // Higher score first
      }
      
      // If same relevance, sort by date (newer first)
      const dateA = new Date(a.metadata?.createdAt || 0);
      const dateB = new Date(b.metadata?.createdAt || 0);
      return dateB - dateA;
    });
  }

  // Calculate relevance score for search result
  calculateRelevanceScore(file, query) {
    let score = 0;
    
    // Get project name for this file
    const project = projectManager.getProjects().find(p => p.id === file.project);
    const projectName = project?.name?.toLowerCase() || '';
    
    // Exact matches in important fields get higher scores
    if (file.metadata?.boreId?.toLowerCase() === query) {
      score += 100;
    } else if (file.metadata?.boreId?.toLowerCase().includes(query)) {
      score += 50;
    }
    
    // Project name matches (high priority)
    if (projectName === query) {
      score += 90;
    } else if (projectName.includes(query)) {
      score += 45;
    }
    
    if (file.filename?.toLowerCase() === query) {
      score += 80;
    } else if (file.filename?.toLowerCase().includes(query)) {
      score += 40;
    }
    
    // Tag matches
    if (file.metadata?.tags) {
      file.metadata.tags.forEach(tag => {
        if (tag.toLowerCase() === query) {
          score += 60;
        } else if (tag.toLowerCase().includes(query)) {
          score += 30;
        }
      });
    }
    
    // Notes matches (lower priority)
    if (file.metadata?.notes?.toLowerCase().includes(query)) {
      score += 20;
    }
    
    // Partial matches in other fields
    const searchableFields = [
      file.metadata?.owner,
      file.metadata?.strataSummary
    ].filter(Boolean);
    
    searchableFields.forEach(field => {
      if (field.toLowerCase().includes(query)) {
        score += 10;
      }
    });
    
    return score;
  }

  // Display search results with real data
  displayResults() {
    const resultsContainer = document.getElementById('searchResults');
    if (!resultsContainer) return;

    if (this.searchResults.length === 0) {
      this.showMessage(`No results found for "${this.currentQuery}"`);
      return;
    }

    let html = `<div class="search-results-header">`;
    html += `<strong>${this.searchResults.length} result(s) found</strong>`;
    html += `</div>`;

    this.searchResults.forEach(result => {
      const date = result.date ? UTILS.formatDate(result.date) : 'No date';
      const coords = result.coordinates ? 
        `📍 ${result.coordinates.lat.toFixed(4)}, ${result.coordinates.lng.toFixed(4)}` : '';
      
      html += `
        <div class="search-result-item" data-record-id="${result.id}" onclick="searchManager.openRecord('${result.id}')">
          <div class="result-main">
            <div class="result-title">🔧 ${result.boreId}</div>
            <div class="result-project">📁 ${result.projectName}</div>
          </div>
          <div class="result-meta">
            <span class="result-tag">📅 ${date}</span>
            ${result.waterLevel ? `<span class="result-tag">💧 ${result.waterLevel}ft</span>` : ''}
            ${coords ? `<span class="result-tag">${coords}</span>` : ''}
          </div>
          <div class="result-preview">${result.preview}</div>
        </div>
      `;
    });

    resultsContainer.innerHTML = html;
    resultsContainer.style.display = 'block';
  }

  // Open a record from search results
  openRecord(recordId) {
    const result = this.searchResults.find(r => r.id === recordId);
    if (!result) {
      console.error('Record not found:', recordId);
      return;
    }
    
    this.showRecordDetails(result.record);
  }

  // Show record details in a modal with file previews
  showRecordDetails(record) {
    // Remove existing modal if any
    const existingModal = document.getElementById('recordDetailModal');
    if (existingModal) existingModal.remove();
    
    // Get project name
    let projectName = 'Unknown Project';
    if (window.projectManager && record.project) {
      const project = projectManager.getProjects().find(p => p.id === record.project);
      projectName = project?.name || 'Unknown Project';
    }
    
    const date = record.metadata?.date ? UTILS.formatDate(record.metadata.date) : 'No date';
    const createdAt = record.metadata?.createdAt ? UTILS.formatDate(record.metadata.createdAt) : 'Unknown';
    
    // Generate file previews HTML
    let filesHtml = '';
    if (record.files && record.files.length > 0) {
      filesHtml = `
        <div class="record-detail-section">
          <h4>📎 Attached Files (${record.files.length})</h4>
          <div class="files-preview-grid">
            ${record.files.map(file => this.generateFilePreviewHtml(file)).join('')}
          </div>
        </div>
      `;
    }
    
    let modalHtml = `
      <div id="recordDetailModal" class="modal-overlay show">
        <div class="modal record-detail-modal">
          <div class="modal-header">
            <h3 class="modal-title">📄 Record Details</h3>
            <button class="modal-close" onclick="document.getElementById('recordDetailModal').remove()">×</button>
          </div>
          <div class="modal-body">
            <div class="record-detail-section">
              <h4>Basic Information</h4>
              <div class="detail-row"><label>Bore ID:</label><span>${record.metadata?.boreId || 'Not specified'}</span></div>
              <div class="detail-row"><label>Project:</label><span>${projectName}</span></div>
              <div class="detail-row"><label>Date:</label><span>${date}</span></div>
              <div class="detail-row"><label>Created:</label><span>${createdAt}</span></div>
              ${record.metadata?.waterLevel ? `<div class="detail-row"><label>Water Level:</label><span>${record.metadata.waterLevel} ft</span></div>` : ''}
            </div>
            
            ${record.metadata?.coordinates ? `
            <div class="record-detail-section">
              <h4>📍 Location</h4>
              <div class="detail-row"><label>Coordinates:</label><span>${record.metadata.coordinates.lat.toFixed(6)}, ${record.metadata.coordinates.lng.toFixed(6)}</span></div>
              <button class="btn-secondary" onclick="searchManager.showOnMap(${record.metadata.coordinates.lat}, ${record.metadata.coordinates.lng})">Show on Map</button>
            </div>
            ` : ''}
            
            ${record.metadata?.strataLayers && record.metadata.strataLayers.length > 0 ? `
            <div class="record-detail-section">
              <h4>🗂️ Strata Layers</h4>
              <div class="strata-list">
                ${record.metadata.strataLayers.map((layer, i) => `
                  <div class="strata-item">
                    <span class="strata-type">${layer.type || 'Unknown'}</span>
                    <span class="strata-thickness">${layer.thickness || 0} ft</span>
                  </div>
                `).join('')}
              </div>
              ${record.metadata.strataSummary ? `<p class="strata-summary">${record.metadata.strataSummary}</p>` : ''}
            </div>
            ` : ''}
            
            ${record.metadata?.tags && record.metadata.tags.length > 0 ? `
            <div class="record-detail-section">
              <h4>🏷️ Tags</h4>
              <div class="tag-list">
                ${record.metadata.tags.map(tag => `<span class="tag">${tag}</span>`).join('')}
              </div>
            </div>
            ` : ''}
            
            ${record.metadata?.notes ? `
            <div class="record-detail-section">
              <h4>📝 Notes</h4>
              <p>${record.metadata.notes}</p>
            </div>
            ` : ''}
            
            ${filesHtml}
          </div>
          <div class="modal-footer">
            <button class="btn-secondary" onclick="document.getElementById('recordDetailModal').remove()">Close</button>
          </div>
        </div>
      </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHtml);
  }

  // Generate HTML for file preview with thumbnail
  generateFilePreviewHtml(file) {
    const fileExt = file.name.split('.').pop().toLowerCase();
    const isImage = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp'].includes(fileExt);
    const isPdf = fileExt === 'pdf';
    const isExcel = ['xlsx', 'xls', 'csv'].includes(fileExt);
    const isWord = ['doc', 'docx'].includes(fileExt);
    
    let thumbnailHtml = '';
    let fileTypeIcon = '📄';
    let fileTypeLabel = 'Document';
    
    if (isImage && file.data) {
      // Show actual image thumbnail
      thumbnailHtml = `<img src="${file.data}" alt="${file.name}" class="file-thumbnail-img" onclick="searchManager.openFilePreview('${file.data}', '${file.name}', 'image')">`;
      fileTypeIcon = '🖼️';
      fileTypeLabel = 'Image';
    } else if (isPdf) {
      // Show PDF icon with preview capability
      thumbnailHtml = `
        <div class="file-thumbnail-icon pdf-icon" onclick="searchManager.openFilePreview('${file.data}', '${file.name}', 'pdf')">
          <svg viewBox="0 0 48 48" width="48" height="48">
            <rect x="8" y="4" width="32" height="40" rx="2" fill="#e53935"/>
            <rect x="12" y="8" width="24" height="4" fill="white" opacity="0.3"/>
            <rect x="12" y="14" width="24" height="2" fill="white" opacity="0.3"/>
            <rect x="12" y="18" width="20" height="2" fill="white" opacity="0.3"/>
            <rect x="12" y="22" width="22" height="2" fill="white" opacity="0.3"/>
            <text x="24" y="36" text-anchor="middle" fill="white" font-size="8" font-weight="bold">PDF</text>
          </svg>
        </div>
      `;
      fileTypeIcon = '📕';
      fileTypeLabel = 'PDF Document';
    } else if (isExcel) {
      // Show Excel icon
      thumbnailHtml = `
        <div class="file-thumbnail-icon excel-icon" onclick="searchManager.openFilePreview('${file.data}', '${file.name}', 'excel')">
          <svg viewBox="0 0 48 48" width="48" height="48">
            <rect x="8" y="4" width="32" height="40" rx="2" fill="#1d6f42"/>
            <rect x="12" y="10" width="10" height="6" fill="white" opacity="0.3"/>
            <rect x="24" y="10" width="10" height="6" fill="white" opacity="0.2"/>
            <rect x="12" y="18" width="10" height="6" fill="white" opacity="0.2"/>
            <rect x="24" y="18" width="10" height="6" fill="white" opacity="0.3"/>
            <rect x="12" y="26" width="10" height="6" fill="white" opacity="0.3"/>
            <rect x="24" y="26" width="10" height="6" fill="white" opacity="0.2"/>
            <text x="24" y="40" text-anchor="middle" fill="white" font-size="6" font-weight="bold">XLSX</text>
          </svg>
        </div>
      `;
      fileTypeIcon = '📊';
      fileTypeLabel = 'Excel Spreadsheet';
    } else if (isWord) {
      // Show Word icon
      thumbnailHtml = `
        <div class="file-thumbnail-icon word-icon">
          <svg viewBox="0 0 48 48" width="48" height="48">
            <rect x="8" y="4" width="32" height="40" rx="2" fill="#2b579a"/>
            <rect x="12" y="10" width="24" height="2" fill="white" opacity="0.3"/>
            <rect x="12" y="14" width="20" height="2" fill="white" opacity="0.3"/>
            <rect x="12" y="18" width="22" height="2" fill="white" opacity="0.3"/>
            <rect x="12" y="22" width="18" height="2" fill="white" opacity="0.3"/>
            <rect x="12" y="26" width="24" height="2" fill="white" opacity="0.3"/>
            <text x="24" y="38" text-anchor="middle" fill="white" font-size="6" font-weight="bold">DOC</text>
          </svg>
        </div>
      `;
      fileTypeIcon = '📝';
      fileTypeLabel = 'Word Document';
    } else {
      // Generic file icon
      thumbnailHtml = `
        <div class="file-thumbnail-icon generic-icon">
          <svg viewBox="0 0 48 48" width="48" height="48">
            <path d="M8 4 L28 4 L40 16 L40 44 L8 44 Z" fill="#90a4ae"/>
            <path d="M28 4 L28 16 L40 16" fill="#607d8b"/>
            <rect x="12" y="22" width="24" height="2" fill="white" opacity="0.3"/>
            <rect x="12" y="28" width="20" height="2" fill="white" opacity="0.3"/>
            <rect x="12" y="34" width="16" height="2" fill="white" opacity="0.3"/>
          </svg>
        </div>
      `;
      fileTypeLabel = fileExt.toUpperCase() + ' File';
    }
    
    return `
      <div class="file-preview-card">
        <div class="file-thumbnail">
          ${thumbnailHtml}
        </div>
        <div class="file-preview-info">
          <div class="file-preview-name" title="${file.name}">${fileTypeIcon} ${this.truncateFilename(file.name, 20)}</div>
          <div class="file-preview-meta">
            <span class="file-type-label">${fileTypeLabel}</span>
            <span class="file-size-label">${UTILS.formatFileSize(file.size)}</span>
          </div>
        </div>
        <div class="file-preview-actions">
          <button class="btn-tool" onclick="searchManager.downloadFile('${file.data}', '${file.name}')" title="Download">⬇️</button>
          ${isImage ? `<button class="btn-tool" onclick="searchManager.openFilePreview('${file.data}', '${file.name}', 'image')" title="View">👁️</button>` : ''}
        </div>
      </div>
    `;
  }

  // Truncate filename for display
  truncateFilename(filename, maxLength) {
    if (filename.length <= maxLength) return filename;
    const ext = filename.split('.').pop();
    const name = filename.substring(0, filename.length - ext.length - 1);
    const truncatedName = name.substring(0, maxLength - ext.length - 4) + '...';
    return truncatedName + '.' + ext;
  }

  // Open file preview in a lightbox
  openFilePreview(dataUrl, filename, type) {
    // Remove existing preview if any
    const existingPreview = document.getElementById('filePreviewLightbox');
    if (existingPreview) existingPreview.remove();
    
    let contentHtml = '';
    
    if (type === 'image') {
      contentHtml = `<img src="${dataUrl}" alt="${filename}" class="lightbox-image">`;
    } else if (type === 'pdf') {
      // For PDF, try to show in iframe or offer download
      contentHtml = `
        <div class="pdf-preview-container">
          <iframe src="${dataUrl}" class="pdf-iframe"></iframe>
          <div class="pdf-fallback">
            <p>If the PDF doesn't display, click below to download:</p>
            <button class="btn-primary" onclick="searchManager.downloadFile('${dataUrl}', '${filename}')">Download PDF</button>
          </div>
        </div>
      `;
    } else {
      contentHtml = `
        <div class="file-preview-message">
          <p>Preview not available for this file type.</p>
          <button class="btn-primary" onclick="searchManager.downloadFile('${dataUrl}', '${filename}')">Download File</button>
        </div>
      `;
    }
    
    const lightboxHtml = `
      <div id="filePreviewLightbox" class="lightbox-overlay" onclick="if(event.target === this) this.remove()">
        <div class="lightbox-content">
          <div class="lightbox-header">
            <span class="lightbox-title">${filename}</span>
            <button class="lightbox-close" onclick="document.getElementById('filePreviewLightbox').remove()">×</button>
          </div>
          <div class="lightbox-body">
            ${contentHtml}
          </div>
          <div class="lightbox-footer">
            <button class="btn-secondary" onclick="searchManager.downloadFile('${dataUrl}', '${filename}')">⬇️ Download</button>
            <button class="btn-secondary" onclick="document.getElementById('filePreviewLightbox').remove()">Close</button>
          </div>
        </div>
      </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', lightboxHtml);
  }

  // Download a file
  downloadFile(dataUrl, filename) {
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    UTILS.showToast(`Downloading ${filename}`, 'info');
  }

  // Show location on map
  showOnMap(lat, lng) {
    if (window.mapManager && mapManager.map) {
      mapManager.map.setView([lat, lng], 16);
      document.getElementById('recordDetailModal')?.remove();
      UTILS.showToast('Location shown on map', 'info');
    }
  }

  // Show loading state
  showLoading() {
    const resultsContainer = document.getElementById('searchResults');
    if (resultsContainer) {
      resultsContainer.innerHTML = '<div class="search-loading">🔍 Searching...</div>';
      resultsContainer.style.display = 'block';
    }
  }

  // Show message
  showMessage(message) {
    const resultsContainer = document.getElementById('searchResults');
    if (resultsContainer) {
      resultsContainer.innerHTML = `<div class="search-message">${message}</div>`;
      resultsContainer.style.display = 'block';
    }
  }

  // Clear search results
  clearResults() {
    const resultsContainer = document.getElementById('searchResults');
    if (resultsContainer) {
      resultsContainer.innerHTML = '';
      resultsContainer.style.display = 'none';
    }
  }

  // Clear search
  clearSearch() {
    const searchInput = document.getElementById('searchQ');
    if (searchInput) {
      searchInput.value = '';
    }
    
    this.currentQuery = '';
    this.searchResults = [];
    this.clearResults();
  }

  // Get current search results
  getResults() {
    return this.searchResults;
  }

  // Get current query
  getCurrentQuery() {
    return this.currentQuery;
  }
}

// Create global search manager
window.searchManager = new SearchManager();