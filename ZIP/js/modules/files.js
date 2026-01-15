// File management module
class FileManager {
  constructor() {
    this.selectedFiles = [];
    this.currentFiles = [];
  }

  // Initialize file manager
  async init() {
    this.setupFileInput();
  }

  // Setup file input handler
  setupFileInput() {
    const fileInput = document.getElementById('fileInput');
    const selectedFilesDiv = document.getElementById('selectedFiles');
    const fileUploadArea = document.querySelector('.file-upload-area');
    const fileUploadHint = document.querySelector('.file-upload-hint');

    if (fileInput) {
      fileInput.addEventListener('change', (e) => {
        this.handleFileSelection(e.target.files);
      });
    }

    // Setup drag and drop functionality
    if (fileUploadArea && fileUploadHint) {
      // Prevent default drag behaviors
      ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        fileUploadArea.addEventListener(eventName, this.preventDefaults, false);
        document.body.addEventListener(eventName, this.preventDefaults, false);
      });

      // Highlight drop area when item is dragged over it
      ['dragenter', 'dragover'].forEach(eventName => {
        fileUploadArea.addEventListener(eventName, () => {
          fileUploadArea.classList.add('drag-over');
          fileUploadHint.classList.add('dragover');
        }, false);
      });

      ['dragleave', 'drop'].forEach(eventName => {
        fileUploadArea.addEventListener(eventName, () => {
          fileUploadArea.classList.remove('drag-over');
          fileUploadHint.classList.remove('dragover');
        }, false);
      });

      // Handle dropped files
      fileUploadArea.addEventListener('drop', (e) => {
        const dt = e.dataTransfer;
        const files = dt.files;
        this.handleFileSelection(files);
      }, false);

      // Make the hint clickable
      fileUploadHint.addEventListener('click', () => {
        fileInput.click();
      });
    }
  }

  // Prevent default drag behaviors
  preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
  }

  // Handle file selection
  async handleFileSelection(files) {
    const validFiles = [];
    const errors = [];

    Array.from(files).forEach(file => {
      // Check file type
      if (!UTILS.isAllowedFileType(file)) {
        errors.push(`${file.name}: File type not allowed`);
        return;
      }

      // Check file size
      if (file.size > CONFIG.MAX_FILE_SIZE) {
        errors.push(`${file.name}: File too large (max ${UTILS.formatFileSize(CONFIG.MAX_FILE_SIZE)})`);
        return;
      }

      validFiles.push(file);
    });

    this.selectedFiles = validFiles;

    // Show errors if any
    if (errors.length > 0) {
      UTILS.showNotification(errors.join('\n'), 'error');
    }

    // Initialize extraction UI if available
    if (window.StrataExtraction && window.StrataExtraction.extractionUI) {
      // Let ExtractionUI handle the file selection display and extraction options
      // The ExtractionUI will handle showing extraction options for supported files
    } else {
      // Fallback to original file display logic
      this.updateFileDisplay(validFiles);
    }

    // Check if we should start extraction automatically
    const extractableFiles = validFiles.filter(file => this.isExtractableFile(file));
    if (extractableFiles.length > 0 && window.StrataExtraction?.extractionUI) {
      // ExtractionUI will handle this through its own event listeners
      console.log(`${extractableFiles.length} extractable files detected`);
    }
  }
          `;
        }

        selectedFilesDiv.innerHTML = statusHTML;
        selectedFilesDiv.className = 'selected-files has-files';

        // Add extraction button handler
        const extractBtn = document.getElementById('extract-strata-btn');
        if (extractBtn) {
          extractBtn.addEventListener('click', () => {
            this.handleStrataExtraction(extractableFiles);
          });
        }
      }
    }

    // Show errors if any
    if (errors.length > 0) {
      UTILS.showToast(errors.join('\n'), 'error');
    }
  }

  // Save boring with files and automatic folder creation
  async saveBoring(metadata) {
    if (!metadata.project) {
      throw new Error('Project is required');
    }

    if (!metadata.date) {
      throw new Error('Date is required');
    }

    // Validate coordinates if provided
    if (metadata.coordinates) {
      const { lat, lng } = metadata.coordinates;
      if (!UTILS.isValidCoordinates(lat, lng)) {
        throw new Error('Invalid coordinates');
      }
    }

    // Process files
    const processedFiles = [];
    for (const file of this.selectedFiles) {
      try {
        const fileData = await this.processFile(file);
        processedFiles.push(fileData);
      } catch (error) {
        console.error(`Failed to process file ${file.name}:`, error);
        throw new Error(`Failed to process file ${file.name}: ${error.message}`);
      }
    }

    // Create file record
    const fileRecord = {
      id: UTILS.uid('f'),
      project: metadata.project,
      filename: this.generateFilename(metadata),
      files: processedFiles,
      metadata: {
        ...metadata,
        tags: metadata.tags ? metadata.tags.split(',').map(t => t.trim()).filter(t => t) : [],
        createdAt: UTILS.nowISO(),
        createdBy: auth.getCurrentUser()?.username || 'guest'
      }
    };

    // Save to database
    await db.put(CONFIG.STORES.FILES, fileRecord);

    // Automatically save to predefined folder structure
    await this.autoSaveToFolder(fileRecord);

    // Update project file count
    await projectManager.updateProjectFileCount(metadata.project);

    // Refresh map markers
    if (window.mapManager) {
      await mapManager.refreshMarkers();
    }

    // Refresh data panel to show new record
    if (window.dataPanel) {
      await dataPanel.refresh();
    }

    // Clear selected files
    this.clearSelectedFiles();

    UTILS.showToast('Boring saved and files organized automatically', 'success');
    return fileRecord;
  }
  
  // Automatically save files to predefined folder structure
  async autoSaveToFolder(fileRecord) {
    try {
      // Get project name
      const project = await projectManager.getProject(fileRecord.project);
      const projectName = project?.name || 'Unknown_Project';
      const boreId = fileRecord.metadata.boreId || 'Unknown_Bore';
      const date = fileRecord.metadata.date || new Date().toISOString().split('T')[0];
      
      // Create folder structure: ProjectName/BoreID_Date/
      const folderName = `${UTILS.sanitizeFilename(projectName)}/${UTILS.sanitizeFilename(boreId)}_${date}`;
      
      // If running in Electron, save to actual file system
      if (typeof window.electronAPI !== 'undefined' && window.strataDesk) {
        await this.saveToFileSystem(fileRecord, folderName);
      } else {
        // For web version, create downloadable ZIP
        await this.createAutoDownload(fileRecord, folderName);
      }
      
      console.log(`✅ Files automatically saved to: ${folderName}`);
    } catch (error) {
      console.error('Auto-save to folder failed:', error);
      // Don't throw error - the data is still saved to database
      console.log('Data saved to database, but auto-folder creation failed');
    }
  }
  
  // Save to actual file system (Electron)
  async saveToFileSystem(fileRecord, folderPath) {
    try {
      // Create metadata file
      const metadataContent = JSON.stringify({
        boreId: fileRecord.metadata.boreId,
        date: fileRecord.metadata.date,
        waterLevel: fileRecord.metadata.waterLevel,
        coordinates: fileRecord.metadata.coordinates,
        tags: fileRecord.metadata.tags,
        notes: fileRecord.metadata.notes,
        createdAt: fileRecord.metadata.createdAt,
        createdBy: fileRecord.metadata.createdBy,
        project: fileRecord.project,
        strataLayers: fileRecord.metadata.strataLayers || [],
        strataSummary: fileRecord.metadata.strataSummary || ''
      }, null, 2);
      
      // Save metadata
      const metadataPath = `${folderPath}/metadata.json`;
      await window.electronAPI.writeFile(metadataPath, metadataContent);
      
      // Save each attached file
      for (const file of fileRecord.files) {
        try {
          // Convert base64 data URL to buffer
          const response = await fetch(file.data);
          const arrayBuffer = await response.arrayBuffer();
          const buffer = new Uint8Array(arrayBuffer);
          
          const filePath = `${folderPath}/${file.name}`;
          await window.electronAPI.writeFile(filePath, buffer);
          
          console.log(`Saved file: ${filePath}`);
        } catch (error) {
          console.error(`Failed to save file ${file.name}:`, error);
        }
      }
      
      // Show in file explorer
      if (window.electronAPI.showItemInFolder) {
        const fullPath = await window.electronAPI.getAppPath('userData');
        await window.electronAPI.showItemInFolder(`${fullPath}/${folderPath}`);
      }
      
      console.log(`✅ Files saved to file system: ${folderPath}`);
    } catch (error) {
      console.error('File system save failed:', error);
      throw error;
    }
  }
  
  // Create auto-download for web version
  async createAutoDownload(fileRecord, folderPath) {
    try {
      const zip = new JSZip();
      const folder = zip.folder(folderPath);
      
      // Add metadata
      const metadataContent = JSON.stringify({
        boreId: fileRecord.metadata.boreId,
        date: fileRecord.metadata.date,
        waterLevel: fileRecord.metadata.waterLevel,
        coordinates: fileRecord.metadata.coordinates,
        tags: fileRecord.metadata.tags,
        notes: fileRecord.metadata.notes,
        createdAt: fileRecord.metadata.createdAt,
        createdBy: fileRecord.metadata.createdBy,
        project: fileRecord.project,
        strataLayers: fileRecord.metadata.strataLayers || [],
        strataSummary: fileRecord.metadata.strataSummary || ''
      }, null, 2);
      
      folder.file('metadata.json', metadataContent);
      
      // Add files
      for (const file of fileRecord.files) {
        try {
          const response = await fetch(file.data);
          const blob = await response.blob();
          folder.file(file.name, blob);
        } catch (error) {
          console.error(`Failed to add file ${file.name} to ZIP:`, error);
        }
      }
      
      // Generate and auto-download ZIP
      const content = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(content);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = `${folderPath.replace('/', '_')}.zip`;
      a.style.display = 'none';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      
      URL.revokeObjectURL(url);
      
      console.log(`✅ Auto-download created: ${a.download}`);
    } catch (error) {
      console.error('Auto-download creation failed:', error);
      throw error;
    }
  }

  // Process individual file
  async processFile(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        resolve({
          name: file.name,
          type: file.type,
          size: file.size,
          data: e.target.result, // Base64 data
          lastModified: file.lastModified
        });
      };
      
      reader.onerror = () => {
        reject(new Error(`Failed to read file: ${file.name}`));
      };
      
      reader.readAsDataURL(file);
    });
  }

  // Generate filename for boring record
  generateFilename(metadata) {
    const parts = [];
    
    if (metadata.boreId) {
      parts.push(metadata.boreId);
    }
    
    if (metadata.date) {
      const date = new Date(metadata.date);
      parts.push(date.toISOString().split('T')[0]);
    }
    
    if (parts.length === 0) {
      parts.push('boring');
    }
    
    return parts.join('_');
  }

  // Clear selected files
  clearSelectedFiles() {
    this.selectedFiles = [];
    
    const fileInput = document.getElementById('fileInput');
    const selectedFilesDiv = document.getElementById('selectedFiles');
    
    if (fileInput) {
      fileInput.value = '';
    }
    
    if (selectedFilesDiv) {
      selectedFilesDiv.textContent = 'No files selected';
      selectedFilesDiv.className = 'selected-files';
    }
  }

  // Check if file is extractable (Excel or PDF)
  isExtractableFile(file) {
    const extractableTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
      'application/vnd.ms-excel', // .xls
      'application/pdf' // .pdf
    ];
    return extractableTypes.includes(file.type);
  }

  // Handle strata extraction workflow
  async handleStrataExtraction(extractableFiles) {
    const progressDiv = document.getElementById('extractionProgress');
    const progressFill = document.querySelector('.progress-fill');
    const progressText = document.querySelector('.progress-text');
    
    try {
      // Show progress indicator
      if (progressDiv) {
        progressDiv.classList.remove('hidden');
        if (progressFill) {
          progressFill.classList.add('indeterminate');
        }
        if (progressText) {
          progressText.textContent = 'Loading extraction modules...';
        }
      }

      // Show loading state on extraction button
      const extractBtn = document.getElementById('extract-strata-btn');
      if (extractBtn) {
        extractBtn.textContent = 'Extracting...';
        extractBtn.disabled = true;
      }

      // Load extraction modules if not already loaded
      if (!window.StrataExtractor) {
        if (progressText) {
          progressText.textContent = 'Loading extraction libraries...';
        }
        await this.loadExtractionModules();
      }

      // Process each extractable file
      let processedCount = 0;
      for (const file of extractableFiles) {
        try {
          if (progressText) {
            progressText.textContent = `Processing ${file.name}... (${processedCount + 1}/${extractableFiles.length})`;
          }
          
          // Update progress bar for determinate progress
          if (progressFill) {
            progressFill.classList.remove('indeterminate');
            progressFill.style.width = `${(processedCount / extractableFiles.length) * 100}%`;
          }
          
          await this.processStrataFile(file);
          processedCount++;
          
        } catch (error) {
          console.error(`Failed to extract from ${file.name}:`, error);
          UTILS.showToast(`Extraction failed for ${file.name}: ${error.message}`, 'error');
        }
      }

      // Complete progress
      if (progressFill) {
        progressFill.style.width = '100%';
      }
      if (progressText) {
        progressText.textContent = 'Extraction completed!';
      }

      // Hide progress after a short delay
      setTimeout(() => {
        if (progressDiv) {
          progressDiv.classList.add('hidden');
        }
      }, 2000);

    } catch (error) {
      console.error('Strata extraction failed:', error);
      UTILS.showToast('Extraction failed: ' + error.message, 'error');
      
      // Hide progress on error
      if (progressDiv) {
        progressDiv.classList.add('hidden');
      }
    } finally {
      // Restore button state
      const extractBtn = document.getElementById('extract-strata-btn');
      if (extractBtn) {
        extractBtn.textContent = 'Extract Strata Data';
        extractBtn.disabled = false;
      }
    }
  }

  // Load extraction modules dynamically
  async loadExtractionModules() {
    try {
      // Load extraction modules in order
      const modules = [
        'js/extraction/Unit.js',
        'js/extraction/StrataChart.js',
        'js/extraction/StrataExtractor.js',
        'js/extraction/ExcelProcessor.js',
        'js/extraction/PDFProcessor.js',
        'js/extraction/ValidationService.js',
        'js/extraction/ReviewInterface.js'
      ];

      for (const modulePath of modules) {
        if (!document.querySelector(`script[src="${modulePath}"]`)) {
          await this.loadScript(modulePath);
        }
      }

      // Verify modules are loaded
      if (!window.StrataExtractor) {
        throw new Error('StrataExtractor module failed to load');
      }

      console.log('✅ Extraction modules loaded successfully');
    } catch (error) {
      console.error('Failed to load extraction modules:', error);
      throw new Error('Failed to load extraction modules: ' + error.message);
    }
  }

  // Load script dynamically
  loadScript(src) {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = src;
      script.onload = resolve;
      script.onerror = () => reject(new Error(`Failed to load script: ${src}`));
      document.head.appendChild(script);
    });
  }

  // Process individual strata file
  async processStrataFile(file) {
    try {
      // Create extractor instance
      const extractor = new window.StrataExtractor();

      // Determine file type
      const fileType = file.type.includes('pdf') ? 'pdf' : 'excel';

      // Extract data from file
      const extractionResult = await extractor.extractFromFile(file, fileType);

      if (!extractionResult.success) {
        throw new Error(extractionResult.errors?.join(', ') || 'Extraction failed');
      }

      // Show review interface
      const reviewInterface = window.createReviewInterface ? 
        window.createReviewInterface() : 
        new window.ReviewInterface({
          utils: window.UTILS,
          auth: window.auth,
          config: window.CONFIG,
          db: window.db
        });
      
      // Set up callback for successful save
      reviewInterface.onSave((result) => {
        if (result.success) {
          // Remove the processed file from selected files
          const fileIndex = this.selectedFiles.indexOf(file);
          if (fileIndex > -1) {
            this.selectedFiles.splice(fileIndex, 1);
          }

          // Update file selection UI
          this.handleFileSelection(this.selectedFiles);

          // Show success message
          UTILS.showToast(`Strata data extracted and saved from ${file.name}`, 'success');
        }
      });

      // Display the extraction results for review
      reviewInterface.displayDraftLayers(
        extractionResult.layers,
        {
          ...extractionResult.metadata,
          filename: file.name,
          project: this.getCurrentProject() // Get current project if available
        }
      );

      // Show any warnings
      if (extractionResult.warnings && extractionResult.warnings.length > 0) {
        reviewInterface.showExtractionErrors(extractionResult.warnings);
      }

    } catch (error) {
      console.error(`Error processing strata file ${file.name}:`, error);
      throw error;
    }
  }

  // Get current project (helper method)
  getCurrentProject() {
    // Try to get current project from project manager
    if (window.projectManager && window.projectManager.currentProject) {
      return window.projectManager.currentProject.id;
    }

    // Try to get from UI elements
    const projectSelect = document.getElementById('projectSelect');
    if (projectSelect && projectSelect.value) {
      return projectSelect.value;
    }

    // Default to imported-data project
    return 'imported-data';
  }

  // Load files for project
  async loadProjectFiles(projectId) {
    if (!projectId) {
      this.currentFiles = [];
      return [];
    }

    this.currentFiles = await db.getFilesByProject(projectId);
    this.currentFiles.sort((a, b) => new Date(b.metadata.createdAt) - new Date(a.metadata.createdAt));
    
    return this.currentFiles;
  }

  // Delete files
  async deleteFiles(fileIds) {
    if (!fileIds || fileIds.length === 0) {
      throw new Error('No files selected for deletion');
    }

    const confirmed = confirm(`Are you sure you want to delete ${fileIds.length} file(s)? This action cannot be undone.`);
    if (!confirmed) {
      return false;
    }

    // Get project IDs for updating counts
    const projectIds = new Set();
    for (const fileId of fileIds) {
      const file = await db.get(CONFIG.STORES.FILES, fileId);
      if (file) {
        projectIds.add(file.project);
      }
    }

    // Delete files
    await db.deleteMultiple(CONFIG.STORES.FILES, fileIds);

    // Update project file counts
    for (const projectId of projectIds) {
      await projectManager.updateProjectFileCount(projectId);
    }

    // Refresh map markers
    if (window.mapManager) {
      await mapManager.refreshMarkers();
    }

    // Refresh data panel
    if (window.dataPanel) {
      await dataPanel.refresh();
    }

    UTILS.showToast(`${fileIds.length} file(s) deleted successfully`, 'success');
    return true;
  }

  // Export project as ZIP
  async exportProjectAsZip(projectId) {
    const project = await projectManager.getProject(projectId);
    if (!project) {
      throw new Error('Project not found');
    }

    const files = await this.loadProjectFiles(projectId);
    if (files.length === 0) {
      throw new Error('No files to export');
    }

    const zip = new JSZip();
    
    // Add project info
    const projectInfo = {
      project: project,
      exportDate: UTILS.nowISO(),
      fileCount: files.length,
      exportedBy: auth.getCurrentUser()?.username || 'guest'
    };
    
    zip.file('project-info.json', JSON.stringify(projectInfo, null, 2));

    // Add files
    for (const fileRecord of files) {
      const folder = zip.folder(fileRecord.filename);
      
      // Add metadata
      folder.file('metadata.json', JSON.stringify(fileRecord.metadata, null, 2));
      
      // Add actual files
      if (fileRecord.files) {
        for (const file of fileRecord.files) {
          try {
            // Convert base64 data URL to blob
            const response = await fetch(file.data);
            const blob = await response.blob();
            folder.file(file.name, blob);
          } catch (error) {
            console.error(`Failed to add file ${file.name}:`, error);
          }
        }
      }
    }

    // Generate and download ZIP
    const content = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(content);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `${UTILS.sanitizeFilename(project.name)}_${new Date().toISOString().split('T')[0]}.zip`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    
    URL.revokeObjectURL(url);
    
    UTILS.showToast('Project exported successfully', 'success');
  }

  // Get file preview
  getFilePreview(file) {
    if (!file || !file.files || file.files.length === 0) {
      return '<div class="preview-empty">No files to preview</div>';
    }

    let preview = '<div class="file-preview">';
    
    // Show metadata
    preview += '<div class="preview-metadata">';
    preview += `<h4>${file.filename}</h4>`;
    if (file.metadata.boreId) {
      preview += `<p><strong>Bore ID:</strong> ${file.metadata.boreId}</p>`;
    }
    if (file.metadata.date) {
      preview += `<p><strong>Date:</strong> ${UTILS.formatDate(file.metadata.date)}</p>`;
    }
    if (file.metadata.waterLevel) {
      preview += `<p><strong>Water Level:</strong> ${file.metadata.waterLevel} ft</p>`;
    }
    if (file.metadata.coordinates) {
      const { lat, lng } = file.metadata.coordinates;
      preview += `<p><strong>Location:</strong> ${lat.toFixed(6)}, ${lng.toFixed(6)}</p>`;
    }
    if (file.metadata.tags && file.metadata.tags.length > 0) {
      preview += `<p><strong>Tags:</strong> ${file.metadata.tags.join(', ')}</p>`;
    }
    if (file.metadata.notes) {
      preview += `<p><strong>Notes:</strong> ${file.metadata.notes}</p>`;
    }
    preview += '</div>';

    // Show files
    preview += '<div class="preview-files">';
    preview += `<h5>Files (${file.files.length})</h5>`;
    
    file.files.forEach(f => {
      preview += '<div class="preview-file">';
      preview += `<strong>${f.name}</strong> (${UTILS.formatFileSize(f.size)})`;
      
      // Show image preview if it's an image
      if (f.type.startsWith('image/')) {
        preview += `<br><img src="${f.data}" style="max-width: 200px; max-height: 150px; margin-top: 8px;" alt="${f.name}">`;
      }
      
      preview += '</div>';
    });
    
    preview += '</div>';
    preview += '</div>';
    
    return preview;
  }

  // Get current files
  getCurrentFiles() {
    return this.currentFiles;
  }

  // Get selected files
  getSelectedFiles() {
    return this.selectedFiles;
  }
}

// Enhanced file operations for desktop app
class DesktopFileManager extends FileManager {
  constructor() {
    super();
    this.isElectron = typeof window.electronAPI !== 'undefined';
  }

  // Override export project to use native file dialog
  async exportProjectAsZip(projectId) {
    if (!this.isElectron) {
      return super.exportProjectAsZip(projectId);
    }

    const project = await projectManager.getProject(projectId);
    if (!project) {
      throw new Error('Project not found');
    }

    const files = await this.loadProjectFiles(projectId);
    if (files.length === 0) {
      throw new Error('No files to export');
    }

    const zip = new JSZip();
    
    // Add project info
    const projectInfo = {
      project: project,
      exportDate: UTILS.nowISO(),
      fileCount: files.length,
      exportedBy: auth.getCurrentUser()?.username || 'guest'
    };
    
    zip.file('project-info.json', JSON.stringify(projectInfo, null, 2));

    // Add files
    for (const fileRecord of files) {
      const folder = zip.folder(fileRecord.filename);
      folder.file('metadata.json', JSON.stringify(fileRecord.metadata, null, 2));
      
      if (fileRecord.files) {
        for (const file of fileRecord.files) {
          try {
            const response = await fetch(file.data);
            const blob = await response.blob();
            folder.file(file.name, blob);
          } catch (error) {
            console.error(`Failed to add file ${file.name}:`, error);
          }
        }
      }
    }

    // Generate ZIP data
    const content = await zip.generateAsync({ type: 'uint8array' });
    
    // Use native save dialog
    const result = await window.strataDesk.exportProject(content, UTILS.sanitizeFilename(project.name));
    
    if (result.success) {
      UTILS.showToast('Project exported successfully', 'success');
      // Show notification
      if (window.strataDesk.notify) {
        window.strataDesk.notify('Export Complete', `Project "${project.name}" exported successfully`);
      }
    } else if (!result.canceled) {
      throw new Error('Failed to export project');
    }
  }

  // Enhanced backup export
  async exportAllData() {
    if (!this.isElectron) {
      // Fallback to web version
      const data = await db.exportData();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = `strata-backup-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      return;
    }

    try {
      const data = await db.exportData();
      const result = await window.strataDesk.exportBackup(data);
      
      if (result.success) {
        UTILS.showToast('Backup exported successfully', 'success');
        window.strataDesk.notify('Backup Complete', 'All data exported successfully');
      } else if (!result.canceled) {
        throw new Error('Failed to export backup');
      }
    } catch (error) {
      UTILS.showToast('Export failed: ' + error.message, 'error');
    }
  }
  
  // Methods to support ExtractionUI integration
  
  /**
   * Update file display (fallback when ExtractionUI is not available)
   * @param {Array<File>} validFiles - Valid files to display
   */
  updateFileDisplay(validFiles) {
    const selectedFilesDiv = document.getElementById('selectedFiles');
    if (!selectedFilesDiv) return;
    
    if (validFiles.length === 0) {
      selectedFilesDiv.textContent = 'No files selected';
      selectedFilesDiv.className = 'selected-files';
      return;
    }
    
    const totalSize = validFiles.reduce((sum, file) => sum + file.size, 0);
    const extractableFiles = validFiles.filter(file => this.isExtractableFile(file));
    
    let statusHTML = `
      <div class="status-success">
        📁 ${validFiles.length} file(s) selected (${UTILS.formatFileSize(totalSize)})
      </div>
    `;

    // Show file list
    if (validFiles.length <= 5) {
      statusHTML += `
        <div class="file-list-preview">
          ${validFiles.map(file => `
            <div class="file-item">
              <span class="file-name">${file.name}</span>
              <span class="file-size">${UTILS.formatFileSize(file.size)}</span>
            </div>
          `).join('')}
        </div>
      `;
    } else {
      statusHTML += `
        <div class="file-list-preview">
          ${validFiles.slice(0, 3).map(file => `
            <div class="file-item">
              <span class="file-name">${file.name}</span>
              <span class="file-size">${UTILS.formatFileSize(file.size)}</span>
            </div>
          `).join('')}
          <div class="file-item more-files">
            <span class="file-name">... and ${validFiles.length - 3} more files</span>
          </div>
        </div>
      `;
    }

    // Show extraction option if extractable files are present
    if (extractableFiles.length > 0) {
      statusHTML += `
        <div class="extraction-option">
          <div class="extraction-notice">
            📊 ${extractableFiles.length} strata chart file(s) detected
          </div>
          <button id="extract-strata-btn" class="btn btn-secondary btn-sm" onclick="window.fileManager.startLegacyExtraction()">
            Extract Strata Data
          </button>
        </div>
      `;
    }

    selectedFilesDiv.innerHTML = statusHTML;
    selectedFilesDiv.className = 'selected-files files-selected';
  }
  
  /**
   * Save file with extracted data (called by ExtractionUI)
   * @param {Object} extractionData - Extraction data from ExtractionUI
   */
  async saveFileWithExtractedData(extractionData) {
    try {
      const { file, result } = extractionData;
      
      // Convert extraction result to strata layers format
      const strataLayers = this.convertExtractionToStrataLayers(result);
      
      // Create file record with extracted data
      const fileRecord = {
        id: UTILS.uid('f'),
        project: this.getCurrentProject(),
        filename: file.name,
        files: [{
          name: file.name,
          size: file.size,
          type: file.type,
          data: await this.fileToDataURL(file)
        }],
        metadata: {
          boreId: `extracted_${Date.now()}`,
          date: new Date().toISOString().split('T')[0],
          createdAt: UTILS.nowISO(),
          createdBy: auth.getCurrentUser()?.username || 'system',
          extractionSource: 'automatic',
          extractionConfidence: result.confidence || 0,
          strataLayers: strataLayers,
          strataSummary: this.generateStrataSummary(strataLayers)
        }
      };
      
      // Save to database
      await this.saveFileRecord(fileRecord);
      
      UTILS.showToast('Extracted strata data saved successfully', 'success');
      
    } catch (error) {
      console.error('Failed to save extracted data:', error);
      UTILS.showToast('Failed to save extracted data: ' + error.message, 'error');
    }
  }
  
  /**
   * Open manual entry interface (called by ExtractionUI)
   */
  openManualEntry() {
    // This would open a manual data entry interface
    // For now, just show a message
    UTILS.showToast('Manual entry interface would open here', 'info');
    console.log('Manual entry requested');
  }
  
  /**
   * Start legacy extraction (fallback method)
   */
  async startLegacyExtraction() {
    const extractableFiles = this.selectedFiles.filter(file => this.isExtractableFile(file));
    if (extractableFiles.length === 0) {
      UTILS.showToast('No extractable files selected', 'warning');
      return;
    }
    
    try {
      // Use the original extraction method
      await this.extractStrataData(extractableFiles[0]);
    } catch (error) {
      console.error('Legacy extraction failed:', error);
      UTILS.showToast('Extraction failed: ' + error.message, 'error');
    }
  }
  
  /**
   * Convert extraction result to strata layers format
   * @param {Object} extractionResult - Result from StrataExtractor
   * @returns {Array} Strata layers array
   */
  convertExtractionToStrataLayers(extractionResult) {
    if (!extractionResult.data || !Array.isArray(extractionResult.data)) {
      return [];
    }
    
    return extractionResult.data.map((layer, index) => ({
      id: layer.id || `layer_${index}`,
      material: layer.material || 'Unknown',
      startDepth: layer.start_depth || 0,
      endDepth: layer.end_depth || 0,
      thickness: (layer.end_depth || 0) - (layer.start_depth || 0),
      confidence: layer.confidence || 'medium',
      color: layer.original_color || null,
      userEdited: layer.user_edited || false,
      source: layer.source || 'extraction'
    }));
  }
  
  /**
   * Generate strata summary from layers
   * @param {Array} strataLayers - Strata layers array
   * @returns {string} Summary text
   */
  generateStrataSummary(strataLayers) {
    if (!strataLayers || strataLayers.length === 0) {
      return 'No strata data available';
    }
    
    const totalDepth = Math.max(...strataLayers.map(layer => layer.endDepth));
    const materialCount = new Set(strataLayers.map(layer => layer.material)).size;
    
    return `${strataLayers.length} layers identified, ${materialCount} unique materials, total depth: ${totalDepth} ft`;
  }
  
  /**
   * Convert file to data URL
   * @param {File} file - File to convert
   * @returns {Promise<string>} Data URL
   */
  fileToDataURL(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }
}

// Create global file manager
window.fileManager = new FileManager();

// Replace with desktop version if running in Electron
if (typeof window.electronAPI !== 'undefined') {
  window.fileManager = new DesktopFileManager();
}