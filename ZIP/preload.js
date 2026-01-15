// StrataDesk Desktop - Preload Script
// This script runs in the renderer process before the web content loads
// It provides a secure bridge between the main process and renderer

const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // App information
  getVersion: () => ipcRenderer.invoke('app-version'),
  
  // File system operations
  showSaveDialog: (options) => ipcRenderer.invoke('show-save-dialog', options),
  showOpenDialog: (options) => ipcRenderer.invoke('show-open-dialog', options),
  writeFile: (filePath, data) => ipcRenderer.invoke('write-file', filePath, data),
  readFile: (filePath) => ipcRenderer.invoke('read-file', filePath),
  getAppPath: (name) => ipcRenderer.invoke('get-app-path', name),
  showItemInFolder: (fullPath) => ipcRenderer.invoke('show-item-in-folder', fullPath),
  
  // Store operations (for app settings)
  storeGet: (key) => ipcRenderer.invoke('store-get', key),
  storeSet: (key, value) => ipcRenderer.invoke('store-set', key, value),
  storeDelete: (key) => ipcRenderer.invoke('store-delete', key),
  
  // Window operations
  windowMinimize: () => ipcRenderer.invoke('window-minimize'),
  windowMaximize: () => ipcRenderer.invoke('window-maximize'),
  windowRestore: () => ipcRenderer.invoke('window-restore'),
  windowClose: () => ipcRenderer.invoke('window-close'),
  getWindowState: () => ipcRenderer.invoke('get-window-state'),
  
  // Window state change listeners
  onMaximized: (callback) => {
    ipcRenderer.on('window-maximized', callback);
  },
  onUnmaximized: (callback) => {
    ipcRenderer.on('window-unmaximized', callback);
  },
  onWindowStateChange: (callback) => {
    ipcRenderer.on('window-state-change', (event, state) => {
      callback(state);
    });
  },
  
  // Notifications
  showNotification: (options) => ipcRenderer.invoke('show-notification', options),
  
  // Menu actions listener
  onMenuAction: (callback) => {
    ipcRenderer.on('menu-action', (event, action, data) => {
      callback(action, data);
    });
  },
  
  // Remove menu action listener
  removeMenuActionListener: () => {
    ipcRenderer.removeAllListeners('menu-action');
  }
});

// Platform information
contextBridge.exposeInMainWorld('platform', {
  isWindows: process.platform === 'win32',
  isMac: process.platform === 'darwin',
  isLinux: process.platform === 'linux',
  platform: process.platform,
  arch: process.arch
});

// Enhanced file operations for StrataDesk
contextBridge.exposeInMainWorld('strataDesk', {
  // Export project with native file dialog
  exportProject: async (projectData, defaultName) => {
    const result = await ipcRenderer.invoke('show-save-dialog', {
      title: 'Export Project',
      defaultPath: `${defaultName}.zip`,
      filters: [
        { name: 'ZIP Files', extensions: ['zip'] },
        { name: 'All Files', extensions: ['*'] }
      ]
    });
    
    if (!result.canceled) {
      return await ipcRenderer.invoke('write-file', result.filePath, projectData);
    }
    return { canceled: true };
  },
  
  // Export backup with native file dialog
  exportBackup: async (backupData) => {
    const date = new Date().toISOString().split('T')[0];
    const result = await ipcRenderer.invoke('show-save-dialog', {
      title: 'Export Backup',
      defaultPath: `strataDesk-backup-${date}.json`,
      filters: [
        { name: 'JSON Files', extensions: ['json'] },
        { name: 'All Files', extensions: ['*'] }
      ]
    });
    
    if (!result.canceled) {
      return await ipcRenderer.invoke('write-file', result.filePath, JSON.stringify(backupData, null, 2));
    }
    return { canceled: true };
  },
  
  // Import data with native file dialog
  importData: async () => {
    const result = await ipcRenderer.invoke('show-open-dialog', {
      title: 'Import Data',
      properties: ['openFile'],
      filters: [
        { name: 'JSON Files', extensions: ['json'] },
        { name: 'ZIP Files', extensions: ['zip'] },
        { name: 'All Files', extensions: ['*'] }
      ]
    });
    
    if (!result.canceled && result.filePaths.length > 0) {
      const fileData = await ipcRenderer.invoke('read-file', result.filePaths[0]);
      if (fileData.success) {
        return {
          success: true,
          data: fileData.data,
          filePath: result.filePaths[0]
        };
      }
      return fileData;
    }
    return { canceled: true };
  },
  
  // Save file to desktop
  saveToDesktop: async (filename, data) => {
    const desktopPath = await ipcRenderer.invoke('get-app-path', 'desktop');
    const fullPath = require('path').join(desktopPath, filename);
    const result = await ipcRenderer.invoke('write-file', fullPath, data);
    
    if (result.success) {
      // Show in file explorer
      await ipcRenderer.invoke('show-item-in-folder', fullPath);
    }
    
    return result;
  },
  
  // Get app data directory
  getDataPath: () => ipcRenderer.invoke('get-app-path', 'userData'),
  
  // Show native notification
  notify: (title, body) => {
    return ipcRenderer.invoke('show-notification', { title, body });
  }
});

// Console logging for debugging
console.log('StrataDesk preload script loaded');
console.log('Platform:', process.platform);
console.log('Architecture:', process.arch);