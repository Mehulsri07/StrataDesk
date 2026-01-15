// StrataDesk Desktop - Main Electron Process
const { app, BrowserWindow, Menu, dialog, shell, ipcMain, protocol } = require('electron');
const path = require('path');
const fs = require('fs');

// Initialize simple settings storage
const settings = {
  windowBounds: { width: 1200, height: 800 },
  theme: 'light',
  autoBackup: true,
  backupInterval: 24, // hours
  lastBackup: null
};

let mainWindow;
let splashWindow;
const isDev = process.argv.includes('--dev');

// Enable live reload for development (optional)
if (isDev) {
  try {
    require('electron-reload')(__dirname, {
      electron: path.join(__dirname, 'node_modules', '.bin', 'electron'),
      hardResetMethod: 'exit'
    });
    console.log('✅ Electron reload enabled');
  } catch (error) {
    console.log('⚠️ electron-reload not installed (optional for development)');
  }
}

// App event handlers
app.whenReady().then(() => {
  createSplashWindow();
  setTimeout(createMainWindow, 2000); // Show splash for 2 seconds
  
  // Remove native menu bar
  Menu.setApplicationMenu(null);
  
  // setupAutoUpdater(); // Disabled for now
  setupProtocols();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createMainWindow();
  }
});

// Create splash screen
function createSplashWindow() {
  splashWindow = new BrowserWindow({
    width: 400,
    height: 300,
    frame: false,
    alwaysOnTop: true,
    transparent: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  splashWindow.loadFile('splash.html');
  
  splashWindow.on('closed', () => {
    splashWindow = null;
  });
}

// Create main application window
function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    show: false, // Don't show until ready
    frame: false, // Remove native window frame
    titleBarStyle: 'hidden', // Hide title bar on macOS
    icon: getIconPath(),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      preload: path.join(__dirname, 'preload.js'),
      webSecurity: true,
      allowRunningInsecureContent: false
    }
  });

  // Load the app
  mainWindow.loadFile('index.html');

  // Show window when ready
  mainWindow.once('ready-to-show', () => {
    if (splashWindow) {
      splashWindow.close();
    }
    mainWindow.show();
    
    // Focus window
    if (isDev) {
      mainWindow.webContents.openDevTools();
    }
  });

  // Handle window closed
  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Handle window state changes
  mainWindow.on('maximize', () => {
    mainWindow.webContents.send('window-maximized');
    mainWindow.webContents.send('window-state-change', { maximized: true });
  });

  mainWindow.on('unmaximize', () => {
    mainWindow.webContents.send('window-unmaximized');
    mainWindow.webContents.send('window-state-change', { maximized: false });
  });

  // Handle external links
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  // Prevent navigation away from app
  mainWindow.webContents.on('will-navigate', (event, navigationUrl) => {
    const parsedUrl = new URL(navigationUrl);
    if (parsedUrl.origin !== 'file://') {
      event.preventDefault();
    }
  });
}

// Get platform-specific icon
function getIconPath() {
  const iconPaths = {
    win32: path.join(__dirname, 'icons', 'icon.ico'),
    darwin: path.join(__dirname, 'icons', 'icon.icns'),
    default: path.join(__dirname, 'icons', 'icon.png')
  };
  
  const iconPath = iconPaths[process.platform] || iconPaths.default;
  
  // Fallback to PNG if platform-specific icon doesn't exist
  if (!fs.existsSync(iconPath)) {
    console.log(`Icon not found: ${iconPath}, using default PNG`);
    return iconPaths.default;
  }
  
  return iconPath;
}

// Create application menu
function createMenu() {
  const template = [
    {
      label: 'File',
      submenu: [
        {
          label: 'New Project',
          accelerator: 'CmdOrCtrl+N',
          click: () => {
            mainWindow.webContents.send('menu-action', 'new-project');
          }
        },
        {
          label: 'Export Project',
          accelerator: 'CmdOrCtrl+E',
          click: () => {
            mainWindow.webContents.send('menu-action', 'export-project');
          }
        },
        {
          label: 'Export Backup',
          accelerator: 'CmdOrCtrl+Shift+E',
          click: () => {
            mainWindow.webContents.send('menu-action', 'export-backup');
          }
        },
        { type: 'separator' },
        {
          label: 'Import Data',
          click: async () => {
            const result = await dialog.showOpenDialog(mainWindow, {
              properties: ['openFile'],
              filters: [
                { name: 'JSON Files', extensions: ['json'] },
                { name: 'ZIP Files', extensions: ['zip'] },
                { name: 'All Files', extensions: ['*'] }
              ]
            });
            
            if (!result.canceled) {
              mainWindow.webContents.send('menu-action', 'import-data', result.filePaths[0]);
            }
          }
        },
        { type: 'separator' },
        {
          label: 'Preferences',
          accelerator: 'CmdOrCtrl+,',
          click: () => {
            mainWindow.webContents.send('menu-action', 'preferences');
          }
        },
        { type: 'separator' },
        {
          role: 'quit'
        }
      ]
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectall' }
      ]
    },
    {
      label: 'View',
      submenu: [
        {
          label: 'Search Files',
          accelerator: 'CmdOrCtrl+F',
          click: () => {
            mainWindow.webContents.send('menu-action', 'search');
          }
        },
        { type: 'separator' },
        {
          label: 'Toggle Theme',
          accelerator: 'CmdOrCtrl+T',
          click: () => {
            mainWindow.webContents.send('menu-action', 'toggle-theme');
          }
        },
        { type: 'separator' },
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' }
      ]
    },
    {
      label: 'Data',
      submenu: [
        {
          label: 'Add New Boring',
          accelerator: 'CmdOrCtrl+Shift+N',
          click: () => {
            mainWindow.webContents.send('menu-action', 'add-boring');
          }
        },
        {
          label: 'View Map',
          accelerator: 'CmdOrCtrl+M',
          click: () => {
            mainWindow.webContents.send('menu-action', 'view-map');
          }
        },
        { type: 'separator' },
        {
          label: 'Auto Backup',
          type: 'checkbox',
          checked: settings.autoBackup,
          click: (menuItem) => {
            settings.autoBackup = menuItem.checked;
            mainWindow.webContents.send('menu-action', 'toggle-auto-backup', menuItem.checked);
          }
        }
      ]
    },
    {
      label: 'Window',
      submenu: [
        { role: 'minimize' },
        { role: 'close' }
      ]
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'User Guide',
          click: () => {
            shell.openExternal('file://' + path.join(__dirname, 'USER_GUIDE.md'));
          }
        },
        {
          label: 'Technical Documentation',
          click: () => {
            shell.openExternal('file://' + path.join(__dirname, 'PROJECT_MASTER.md'));
          }
        },
        { type: 'separator' },
        {
          label: 'Check for Updates',
          click: () => {
            dialog.showMessageBox(mainWindow, {
              type: 'info',
              title: 'Updates',
              message: 'Auto-update feature is currently disabled. Please check for manual updates.',
              buttons: ['OK']
            });
          }
        },
        {
          label: 'About StrataDesk',
          click: () => {
            dialog.showMessageBox(mainWindow, {
              type: 'info',
              title: 'About StrataDesk',
              message: 'StrataDesk Desktop',
              detail: `Version: ${app.getVersion()}\nElectron: ${process.versions.electron}\nNode: ${process.versions.node}\n\nProfessional groundwater boring data management application.`,
              buttons: ['OK']
            });
          }
        }
      ]
    }
  ];

  // macOS specific menu adjustments
  if (process.platform === 'darwin') {
    template.unshift({
      label: app.getName(),
      submenu: [
        { role: 'about' },
        { type: 'separator' },
        { role: 'services' },
        { type: 'separator' },
        { role: 'hide' },
        { role: 'hideothers' },
        { role: 'unhide' },
        { type: 'separator' },
        { role: 'quit' }
      ]
    });

    // Window menu
    template[5].submenu = [
      { role: 'close' },
      { role: 'minimize' },
      { role: 'zoom' },
      { type: 'separator' },
      { role: 'front' }
    ];
  }

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

// Setup auto updater (disabled for now)
function setupAutoUpdater() {
  // Auto-updater functionality disabled
  // Can be re-enabled later when needed
  console.log('Auto-updater disabled');
}

// Setup custom protocols
function setupProtocols() {
  protocol.registerFileProtocol('strataDesk', (request, callback) => {
    const url = request.url.substr(12); // Remove 'strataDesk://'
    callback({ path: path.normalize(`${__dirname}/${url}`) });
  });
}

// IPC handlers
ipcMain.handle('app-version', () => {
  return app.getVersion();
});

ipcMain.handle('show-save-dialog', async (event, options) => {
  const result = await dialog.showSaveDialog(mainWindow, options);
  return result;
});

ipcMain.handle('show-open-dialog', async (event, options) => {
  const result = await dialog.showOpenDialog(mainWindow, options);
  return result;
});

ipcMain.handle('write-file', async (event, filePath, data) => {
  try {
    fs.writeFileSync(filePath, data);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('read-file', async (event, filePath) => {
  try {
    const data = fs.readFileSync(filePath, 'utf8');
    return { success: true, data };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('get-app-path', (event, name) => {
  return app.getPath(name);
});

ipcMain.handle('show-item-in-folder', (event, fullPath) => {
  shell.showItemInFolder(fullPath);
});

// Store management (simplified)
ipcMain.handle('store-get', (event, key) => {
  return settings[key];
});

ipcMain.handle('store-set', (event, key, value) => {
  settings[key] = value;
});

ipcMain.handle('store-delete', (event, key) => {
  delete settings[key];
});

// Window management
ipcMain.handle('window-minimize', () => {
  mainWindow.minimize();
});

ipcMain.handle('window-maximize', () => {
  if (mainWindow.isMaximized()) {
    mainWindow.unmaximize();
  } else {
    mainWindow.maximize();
  }
});

ipcMain.handle('window-restore', () => {
  if (mainWindow.isMaximized()) {
    mainWindow.unmaximize();
  }
});

ipcMain.handle('window-close', () => {
  mainWindow.close();
});

ipcMain.handle('get-window-state', () => {
  return {
    maximized: mainWindow.isMaximized(),
    minimized: mainWindow.isMinimized(),
    fullscreen: mainWindow.isFullScreen(),
    bounds: mainWindow.getBounds()
  };
});

// Notification support
ipcMain.handle('show-notification', (event, options) => {
  const { Notification } = require('electron');
  
  if (Notification.isSupported()) {
    const notification = new Notification({
      title: options.title,
      body: options.body,
      icon: getIconPath()
    });
    
    notification.show();
    return true;
  }
  return false;
});