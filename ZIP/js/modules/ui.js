// UI management and interactions
class UIManager {
  constructor() {
    this.currentTheme = 'light';
    this.lastUsedData = {};
  }

  // Initialize UI
  async init() {
    console.log('UI Manager initializing...');
    this.initTheme();
    console.log('Theme initialized');
    this.setupEventListeners();
    console.log('Event listeners set up');
    this.loadSettings();
    console.log('Settings loaded');
    this.setupGlobalEventListeners();
    console.log('Global event listeners set up');
    
    // Wait a bit for enhanced features to load
    await this.waitForEnhancedFeatures();
    console.log('Enhanced features check complete');
    
    // Initialize address search (enhanced or basic)
    this.initializeAddressSearch();
    console.log('Address search initialized');
    
    // Initialize extraction features if available
    this.initializeExtractionFeatures();
    console.log('Extraction features initialized');
    
    console.log('UI Manager initialization complete');
  }

  // Wait for enhanced features to load
  async waitForEnhancedFeatures() {
    return new Promise((resolve) => {
      let attempts = 0;
      const maxAttempts = 20; // 2 seconds max wait
      
      const checkFeatures = () => {
        attempts++;
        
        if (window.enhancedFeaturesAvailable === true) {
          console.log('✅ Enhanced features confirmed available');
          resolve(true);
        } else if (window.enhancedFeaturesAvailable === false || attempts >= maxAttempts) {
          console.log('⚠️ Using basic features only');
          resolve(false);
        } else {
          setTimeout(checkFeatures, 100);
        }
      };
      
      checkFeatures();
    });
  }

  // Initialize address search (enhanced or basic)
  async initializeAddressSearch() {
    try {
      // Try enhanced address search first
      if (window.enhancedFeaturesAvailable && 
          typeof AddressSearchIntegration !== 'undefined') {
        
        console.log('Initializing enhanced address search...');
        this.addressSearch = new AddressSearchIntegration();
        await this.addressSearch.init();
        console.log('✅ Enhanced address search initialized');
        return;
      }
    } catch (error) {
      console.warn('Enhanced address search failed, falling back to basic:', error);
    }
    
    // Fall back to basic address search
    console.log('Initializing basic address search...');
    this.setupBasicAddressSearch();
    console.log('✅ Basic address search initialized');
  }

  // Initialize theme
  initTheme() {
    const savedTheme = localStorage.getItem('strataTheme') || 'dark';
    console.log('Initializing theme:', savedTheme);
    this.setTheme(savedTheme);
  }

  // Set theme
  setTheme(theme) {
    console.log('Setting theme to:', theme);
    this.currentTheme = theme;
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('strataTheme', theme);
    
    // Update theme toggle button
    const themeToggle = document.getElementById('darkModeToggle');
    if (themeToggle) {
      const themeIcon = themeToggle.querySelector('.theme-icon');
      if (themeIcon) {
        themeIcon.textContent = theme === 'dark' ? '☀️' : '🌙';
      }
    }
    console.log('Theme set to:', theme, 'DOM attribute:', document.documentElement.getAttribute('data-theme'));
  }

  // Toggle theme
  toggleTheme() {
    console.log('Current theme before toggle:', this.currentTheme);
    const newTheme = this.currentTheme === 'dark' ? 'light' : 'dark';
    console.log('Toggling to theme:', newTheme);
    this.setTheme(newTheme);
    UTILS.showToast(`Switched to ${newTheme} mode`, 'info');
  }

  // Setup event listeners with retry mechanism
  setupEventListeners() {
    console.log('Setting up event listeners...');
    
    // Use a small delay to ensure DOM is ready
    setTimeout(() => {
      // Theme toggle
      const themeToggle = document.getElementById('darkModeToggle');
      if (themeToggle && !themeToggle.hasAttribute('data-listener-added')) {
        themeToggle.addEventListener('click', () => this.toggleTheme());
        themeToggle.setAttribute('data-listener-added', 'true');
        console.log('Theme toggle listener added');
      }

      // Auth buttons
      this.setupAuthListeners();
      
      // Project management
      this.setupProjectListeners();
      
      // File management
      this.setupFileListeners();
      
      // Map interactions
      this.setupMapListeners();
      
      // Form interactions
      this.setupFormListeners();
      
      // Quick action buttons
      this.setupQuickActionListeners();
      
      // Mobile sidebar toggle
      this.setupMobileListeners();
    }, 100);
  }

  // Setup quick action listeners
  setupQuickActionListeners() {
    const newProjectBtn = document.getElementById('newProjectBtn');
    const addBoringBtn = document.getElementById('addBoringBtn');
    const exportBtn = document.getElementById('exportBtn');

    if (newProjectBtn) {
      newProjectBtn.addEventListener('click', () => {
        document.getElementById('newProjectName')?.focus();
      });
    }

    if (addBoringBtn) {
      addBoringBtn.addEventListener('click', () => {
        document.getElementById('boreId')?.focus();
      });
    }

    if (exportBtn) {
      exportBtn.addEventListener('click', () => this.handleExportProject());
    }
  }

  // Setup mobile listeners
  setupMobileListeners() {
    // Add mobile sidebar toggle if needed
    const sidebarToggle = document.createElement('button');
    sidebarToggle.className = 'sidebar-toggle';
    sidebarToggle.innerHTML = '☰';
    sidebarToggle.addEventListener('click', () => this.toggleMobileSidebar());
    document.body.appendChild(sidebarToggle);
  }

  // Toggle mobile sidebar
  toggleMobileSidebar() {
    const sidebar = document.querySelector('.app-sidebar');
    if (sidebar) {
      sidebar.classList.toggle('open');
    }
  }

  // Setup authentication listeners
  setupAuthListeners() {
    console.log('Setting up auth listeners...');
    
    // Use querySelector as fallback and add delay
    setTimeout(() => {
      const loginBtn = document.getElementById('loginBtn') || document.querySelector('.login-btn');
      const registerBtn = document.getElementById('registerBtn') || document.querySelector('.register-btn');
      const guestBtn = document.getElementById('guestBtn') || document.querySelector('.btn-guest');
      const logoutBtn = document.getElementById('logoutBtn') || document.querySelector('.btn-logout');

      console.log('Login button:', loginBtn);
      console.log('Register button:', registerBtn);
      console.log('Guest button:', guestBtn);

      if (loginBtn && !loginBtn.hasAttribute('data-listener-added')) {
        loginBtn.addEventListener('click', (e) => {
          e.preventDefault();
          console.log('Login button event fired');
          this.handleLogin();
        });
        loginBtn.setAttribute('data-listener-added', 'true');
        console.log('Login button listener added');
      } else if (!loginBtn) {
        console.error('Login button not found!');
      }

      if (registerBtn && !registerBtn.hasAttribute('data-listener-added')) {
        registerBtn.addEventListener('click', (e) => {
          e.preventDefault();
          console.log('Register button event fired');
          this.handleRegister();
        });
        registerBtn.setAttribute('data-listener-added', 'true');
        console.log('Register button listener added');
      } else if (!registerBtn) {
        console.error('Register button not found!');
      }

      if (guestBtn && !guestBtn.hasAttribute('data-listener-added')) {
        guestBtn.addEventListener('click', (e) => {
          e.preventDefault();
          console.log('Guest button event fired');
          this.handleGuestLogin();
        });
        guestBtn.setAttribute('data-listener-added', 'true');
        console.log('Guest button listener added');
      } else if (!guestBtn) {
        console.error('Guest button not found!');
      }

      if (logoutBtn && !logoutBtn.hasAttribute('data-listener-added')) {
        logoutBtn.addEventListener('click', (e) => {
          e.preventDefault();
          this.handleLogout();
        });
        logoutBtn.setAttribute('data-listener-added', 'true');
      }
    }, 50);
  }

  // Setup project listeners
  setupProjectListeners() {
    const createProjectBtn = document.getElementById('createProject');
    
    if (createProjectBtn) {
      createProjectBtn.addEventListener('click', () => this.handleCreateProject());
    }
  }

  // Setup file listeners
  setupFileListeners() {
    const attachBtn = document.getElementById('attachBtn');
    const clearFormBtn = document.getElementById('clearFormBtn');
    const repeatLastBtn = document.getElementById('repeatLastBtn');
    const exportProjectBtn = document.getElementById('exportProjectBtn');
    const deleteFilesBtn = document.getElementById('deleteFilesBtn');
    const exportAllBtn = document.getElementById('exportAll');
    const settingsBtn = document.getElementById('settingsBtn');

    if (attachBtn) {
      attachBtn.addEventListener('click', () => this.handleSaveBoring());
    }

    if (clearFormBtn) {
      clearFormBtn.addEventListener('click', () => this.clearForm());
    }

    if (repeatLastBtn) {
      repeatLastBtn.addEventListener('click', () => this.repeatLastEntry());
    }

    if (exportProjectBtn) {
      exportProjectBtn.addEventListener('click', () => this.handleExportProject());
    }

    if (deleteFilesBtn) {
      deleteFilesBtn.addEventListener('click', () => this.handleDeleteFiles());
    }

    if (exportAllBtn) {
      exportAllBtn.addEventListener('click', () => this.handleExportAll());
    }

    if (settingsBtn) {
      settingsBtn.addEventListener('click', () => this.showSettingsModal());
    }
  }

  // Setup map listeners
  setupMapListeners() {
    const clickMapBtn = document.getElementById('clickMapBtn');
    const latlngInput = document.getElementById('latlng');

    if (clickMapBtn) {
      clickMapBtn.addEventListener('click', () => {
        if (mapManager) {
          mapManager.enterClickMode();
        }
      });
    }

    // Address search is now handled by AddressSearchIntegration
    // Keep this method for backward compatibility and coordinate input

    if (latlngInput) {
      latlngInput.addEventListener('blur', () => {
        this.handleCoordinatesInput(latlngInput.value);
      });
    }
  }

  // Setup basic address search fallback
  setupBasicAddressSearch() {
    const addressSearch = document.getElementById('addressSearch');
    if (!addressSearch) return;

    console.log('Setting up basic address search...');

    let searchTimeout;
    
    // Input event listener
    addressSearch.addEventListener('input', () => {
      clearTimeout(searchTimeout);
      const address = addressSearch.value.trim();
      
      if (address.length === 0) {
        this.hideAddressDropdown();
        return;
      }
      
      if (address.length >= 3) {
        searchTimeout = setTimeout(() => {
          this.handleBasicAddressSearch(address);
        }, CONFIG.UI.ADDRESS_SEARCH_DEBOUNCE);
      }
    });

    // Keyboard event listener
    addressSearch.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        const address = addressSearch.value.trim();
        if (address.length >= 3) {
          this.handleBasicAddressSearch(address);
        }
      } else if (e.key === 'Escape') {
        this.hideAddressDropdown();
        addressSearch.blur();
      }
    });

    console.log('✅ Basic address search event listeners set up');
  }

  // Basic address search handler (fallback)
  async handleBasicAddressSearch(address) {
    if (!address || address.length < 3) {
      this.hideAddressDropdown();
      return;
    }

    console.log('Performing basic address search for:', address);
    const locationStatus = document.getElementById('locationStatus');
    
    try {
      if (locationStatus) {
        locationStatus.textContent = '🔍 Searching...';
        locationStatus.className = 'location-status';
      }

      // Check if mapManager is available and has the search method
      if (!mapManager || typeof mapManager.searchAddressWithOptions !== 'function') {
        throw new Error('Map manager not available');
      }

      const results = await mapManager.searchAddressWithOptions(address);
      
      if (results && results.length > 0) {
        this.showAddressDropdown(results);
        if (locationStatus) {
          locationStatus.textContent = `Found ${results.length} location(s) - select one below`;
          locationStatus.className = 'location-status status-info';
        }
        console.log(`Found ${results.length} results for: ${address}`);
      } else {
        this.hideAddressDropdown();
        if (locationStatus) {
          locationStatus.textContent = '❌ No locations found. Try different terms or click map.';
          locationStatus.className = 'location-status status-error';
        }
        console.log('No results found for:', address);
      }
    } catch (error) {
      console.error('Basic address search failed:', error);
      this.hideAddressDropdown();
      if (locationStatus) {
        locationStatus.textContent = '❌ Search failed. Click on map instead.';
        locationStatus.className = 'location-status status-error';
      }
    }
  }

  // Show address dropdown with results (basic implementation)
  showAddressDropdown(results) {
    const dropdown = document.getElementById('addressDropdown');
    if (!dropdown) {
      console.error('Address dropdown element not found');
      return;
    }

    console.log('Showing dropdown with', results.length, 'results');

    let html = '';
    results.forEach((result, index) => {
      const typeLabel = this.getLocationTypeLabel(result.type);
      html += `
        <div class="address-option" data-index="${index}" data-lat="${result.lat}" data-lng="${result.lng}" data-name="${result.name}">
          <div class="address-option-name">
            ${typeLabel ? `<span class="address-option-type">${typeLabel}</span>` : ''}
            ${this.truncateText(result.name, 60)}
          </div>
          <div class="address-option-details">
            📍 ${result.lat.toFixed(6)}, ${result.lng.toFixed(6)}
          </div>
        </div>
      `;
    });

    dropdown.innerHTML = html;
    dropdown.classList.add('show');
    
    // Force visibility and animation
    dropdown.style.display = 'block';
    dropdown.style.opacity = '1';
    dropdown.style.transform = 'translateY(0)';

    // Add click handlers
    dropdown.querySelectorAll('.address-option').forEach(option => {
      option.addEventListener('click', () => {
        this.selectAddressOption(option);
      });
    });

    console.log('Dropdown shown with class:', dropdown.className);
    console.log('Dropdown style:', dropdown.style.cssText);
  }

  // Hide address dropdown
  hideAddressDropdown() {
    const dropdown = document.getElementById('addressDropdown');
    if (dropdown) {
      dropdown.classList.remove('show');
      dropdown.style.display = 'none';
      dropdown.style.opacity = '0';
      dropdown.style.transform = 'translateY(-10px)';
      dropdown.innerHTML = '';
      console.log('Dropdown hidden');
    }
  }

  // Select address option
  selectAddressOption(option) {
    const lat = parseFloat(option.dataset.lat);
    const lng = parseFloat(option.dataset.lng);
    const name = option.dataset.name;

    console.log('Selected location:', { lat, lng, name });

    // Set location on map
    if (mapManager) {
      mapManager.setLocationFromCoordinates(lat, lng, name);
    }

    // Update location status
    const locationStatus = document.getElementById('locationStatus');
    if (locationStatus) {
      locationStatus.textContent = `✅ ${this.truncateText(name, 50)}`;
      locationStatus.className = 'location-status status-success';
    }

    // Clear search input and hide dropdown
    const addressSearch = document.getElementById('addressSearch');
    if (addressSearch) {
      addressSearch.value = '';
    }
    this.hideAddressDropdown();

    UTILS.showToast('Location selected', 'success');
  }

  // Get location type label
  getLocationTypeLabel(type) {
    const typeMap = {
      'city': '🏙️ City',
      'town': '🏘️ Town',
      'village': '🏡 Village',
      'hamlet': '🏠 Hamlet',
      'suburb': '🏘️ Suburb',
      'district': '🗺️ District',
      'state': '🗺️ State',
      'country': '🌍 Country',
      'administrative': '🏛️ Admin',
      'residential': '🏠 Area',
      'commercial': '🏢 Commercial',
      'industrial': '🏭 Industrial',
      'road': '🛣️ Road',
      'highway': '🛣️ Highway',
      'railway': '🚂 Railway',
      'waterway': '🌊 Water',
      'natural': '🌿 Natural',
      'tourism': '🎯 Tourism',
      'amenity': '🏪 Amenity'
    };
    return typeMap[type] || null;
  }

  // Truncate text for display
  truncateText(text, maxLength) {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength - 3) + '...';
  }

  // Setup form listeners
  setupFormListeners() {
    const assignProject = document.getElementById('assignProject');
    
    if (assignProject) {
      assignProject.addEventListener('change', (e) => {
        const projectId = e.target.value;
        if (projectId) {
          this.loadProjectFiles(projectId);
        }
      });
    }
  }

  // Handle login
  async handleLogin() {
    console.log('Login button clicked');
    const username = document.getElementById('username')?.value?.trim();
    const password = document.getElementById('password')?.value;
    const loginMsg = document.getElementById('loginMsg');

    console.log('Username:', username, 'Password length:', password?.length);

    if (!username || !password) {
      this.showLoginMessage('Please enter username and password', 'error');
      return;
    }

    try {
      this.showLoginMessage('Logging in...', 'info');
      console.log('Attempting login...');
      await auth.login(username, password);
      console.log('Login successful, showing app...');
      await this.showApp();
      UTILS.showToast('Login successful', 'success');
    } catch (error) {
      console.error('Login error:', error);
      this.showLoginMessage(error.message, 'error');
    }
  }

  // Handle register
  async handleRegister() {
    console.log('Register button clicked');
    const username = document.getElementById('username')?.value?.trim();
    const password = document.getElementById('password')?.value;

    if (!username || !password) {
      this.showLoginMessage('Please enter username and password', 'error');
      return;
    }

    try {
      this.showLoginMessage('Creating account...', 'info');
      console.log('Attempting registration...');
      await auth.register(username, password);
      console.log('Registration successful, showing app...');
      await this.showApp();
      UTILS.showToast('Account created successfully', 'success');
    } catch (error) {
      console.error('Registration error:', error);
      this.showLoginMessage(error.message, 'error');
    }
  }

  // Handle guest login
  async handleGuestLogin() {
    console.log('Guest login button clicked');
    try {
      console.log('Attempting guest login...');
      
      // Check if auth is available
      if (typeof auth === 'undefined') {
        console.error('Auth module not available');
        this.showLoginMessage('Authentication system not ready', 'error');
        return;
      }
      
      await auth.loginAsGuest();
      console.log('Guest login successful, showing app...');
      await this.showApp();
      UTILS.showToast('Continuing as guest', 'success');
    } catch (error) {
      console.error('Guest login error:', error);
      this.showLoginMessage(error.message, 'error');
    }
  }

  // Handle logout
  handleLogout() {
    auth.logout();
    this.showLogin();
    UTILS.showToast('Logged out successfully', 'info');
  }

  // Show login message
  showLoginMessage(message, type = 'info') {
    const loginMsg = document.getElementById('loginMsg');
    if (loginMsg) {
      loginMsg.textContent = message;
      loginMsg.className = `small status-${type}`;
    }
  }

  // Show app interface
  async showApp() {
    console.log('showApp called');
    const loginPanel = document.getElementById('loginPanel');
    const appPanel = document.getElementById('appPanel');

    console.log('Login panel:', loginPanel);
    console.log('App panel:', appPanel);

    if (loginPanel) {
      loginPanel.classList.add('hidden');
      console.log('Login panel hidden');
    }
    if (appPanel) {
      appPanel.classList.remove('hidden');
      console.log('App panel shown');
    }

    // Update user info
    const user = auth.getCurrentUser();
    console.log('Current user:', user);
    const welcomeUser = document.getElementById('welcomeUser');
    const userInfo = document.getElementById('userInfo');

    if (welcomeUser) {
      welcomeUser.textContent = user.username;
      console.log('Welcome user updated');
    }

    if (userInfo) {
      userInfo.textContent = user.isGuest ? 'Guest session' : 'Local account';
      console.log('User info updated');
    }

    // Initialize components
    console.log('Initializing app components...');
    await this.initializeApp();
    console.log('App components initialized');
  }

  // Show login interface
  showLogin() {
    const loginPanel = document.getElementById('loginPanel');
    const appPanel = document.getElementById('appPanel');

    if (loginPanel) loginPanel.classList.remove('hidden');
    if (appPanel) appPanel.classList.add('hidden');

    // Clear form
    const username = document.getElementById('username');
    const password = document.getElementById('password');
    const loginMsg = document.getElementById('loginMsg');

    if (username) username.value = '';
    if (password) password.value = '';
    if (loginMsg) loginMsg.textContent = '';
  }

  // Initialize app components
  async initializeApp() {
    try {
      // Initialize managers
      await projectManager.init();
      await fileManager.init();
      await searchManager.init();
      
      // Initialize data panel (shows stored data in sidebar)
      if (window.dataPanel) {
        await dataPanel.init();
      }
      
      // Initialize map
      if (window.L) {
        // Small delay to ensure DOM is ready
        setTimeout(async () => {
          try {
            await mapManager.init();
          } catch (error) {
            console.error('Map initialization delayed retry failed:', error);
          }
        }, 100);
      } else {
        console.warn('Leaflet library not available, map will not be initialized');
        const mapContainer = document.getElementById('map');
        if (mapContainer) {
          mapContainer.innerHTML = `
            <div style="display: flex; align-items: center; justify-content: center; height: 100%; color: var(--text-light); text-align: center;">
              <div>
                <div style="font-size: 24px; margin-bottom: 10px;">🗺️</div>
                <div>Map library not loaded</div>
                <div style="font-size: 12px; margin-top: 5px;">Check your internet connection</div>
              </div>
            </div>
          `;
        }
      }

      // Load data
      await this.refreshProjects();
      await this.loadCurrentProject();
      
      // Set default date
      this.setDefaultDate();

    } catch (error) {
      console.error('App initialization failed:', error);
      UTILS.showToast('Some features may not work properly', 'warning');
    }
  }

  // Handle create project
  async handleCreateProject() {
    const input = document.getElementById('newProjectName');
    const name = input?.value?.trim();

    if (!name) {
      UTILS.showToast('Please enter a project name', 'error');
      return;
    }

    try {
      const project = await projectManager.createProject(name);
      input.value = '';
      await this.refreshProjects();
      
      // Auto-select the new project
      const assignProject = document.getElementById('assignProject');
      if (assignProject) {
        assignProject.value = project.id;
        assignProject.style.background = '#d1fae5';
        setTimeout(() => { assignProject.style.background = ''; }, 1500);
      }
      
      // Update titlebar project name if in Electron
      if (typeof window.updateTitlebarProject === 'function') {
        window.updateTitlebarProject(project.name);
      }
      
    } catch (error) {
      UTILS.showToast(error.message, 'error');
    }
  }

  // Handle save boring
  async handleSaveBoring() {
    try {
      const metadata = this.collectFormData();
      await fileManager.saveBoring(metadata);
      
      // Store for repeat function
      this.lastUsedData = { ...metadata };
      
      // Refresh UI
      await this.loadProjectFiles(metadata.project);
      this.clearForm(false); // Don't clear project selection
      
    } catch (error) {
      UTILS.showToast(error.message, 'error');
    }
  }

  // Collect form data
  collectFormData() {
    const assignProject = document.getElementById('assignProject');
    const fileDate = document.getElementById('fileDate');
    const boreId = document.getElementById('boreId');
    const waterLevel = document.getElementById('waterLevel');
    const latlng = document.getElementById('latlng');
    const tags = document.getElementById('tags');
    const notes = document.getElementById('notes');
    const strataSummary = document.getElementById('strataSummary');

    // Get strata layers
    const strataLayers = this.getStrataLayers();

    const metadata = {
      project: assignProject?.value,
      date: fileDate?.value,
      boreId: boreId?.value?.trim(),
      waterLevel: waterLevel?.value ? parseFloat(waterLevel.value) : null,
      tags: tags?.value?.trim(),
      notes: notes?.value?.trim(),
      strataLayers,
      strataSummary: strataSummary?.value?.trim()
    };

    // Parse coordinates
    if (latlng?.value) {
      const coords = UTILS.parseCoordinates(latlng.value);
      if (coords) {
        metadata.coordinates = coords;
      }
    }

    return metadata;
  }

  // Clear form
  clearForm(clearProject = true) {
    const fields = ['fileDate', 'boreId', 'waterLevel', 'latlng', 'tags', 'notes'];
    
    fields.forEach(fieldId => {
      const field = document.getElementById(fieldId);
      if (field) field.value = '';
    });

    if (clearProject) {
      const assignProject = document.getElementById('assignProject');
      if (assignProject) assignProject.value = '';
    }

    // Clear strata layers
    this.clearStrataLayers();

    // Clear file selection
    fileManager.clearSelectedFiles();
    
    // Clear map marker
    if (mapManager) {
      mapManager.clearClickMarker();
    }

    // Reset date to today
    this.setDefaultDate();
  }

  // Repeat last entry
  repeatLastEntry() {
    if (!this.lastUsedData.project) {
      UTILS.showToast('No previous entry to repeat', 'warning');
      return;
    }

    // Fill form with last used data
    const assignProject = document.getElementById('assignProject');
    const latlng = document.getElementById('latlng');

    if (assignProject && this.lastUsedData.project) {
      assignProject.value = this.lastUsedData.project;
    }

    if (latlng && this.lastUsedData.coordinates) {
      const { lat, lng } = this.lastUsedData.coordinates;
      latlng.value = `${lat},${lng}`;
      
      // Set map location
      if (mapManager) {
        mapManager.setLocationFromCoordinates(lat, lng, 'Repeated location');
      }
    }

    UTILS.showToast('Previous entry data loaded', 'success');
  }

  // Handle address search with dropdown
  async handleAddressSearch(address) {
    if (!address || address.length < 3) {
      this.hideAddressDropdown();
      return;
    }

    const locationStatus = document.getElementById('locationStatus');
    
    try {
      if (locationStatus) {
        locationStatus.textContent = '🔍 Searching...';
        locationStatus.className = 'location-status';
      }

      const results = await mapManager.searchAddressWithOptions(address);
      
      if (results.length > 0) {
        this.showAddressDropdown(results);
        if (locationStatus) {
          locationStatus.textContent = `Found ${results.length} location(s) - select one below`;
          locationStatus.className = 'location-status status-info';
        }
      } else {
        this.hideAddressDropdown();
        if (locationStatus) {
          locationStatus.textContent = '❌ No locations found. Try different terms or click map.';
          locationStatus.className = 'location-status status-error';
        }
      }
    } catch (error) {
      this.hideAddressDropdown();
      if (locationStatus) {
        locationStatus.textContent = '❌ Search failed. Click on map instead.';
        locationStatus.className = 'location-status status-error';
      }
    }
  }

  // Handle coordinates input
  handleCoordinatesInput(coordString) {
    const coords = UTILS.parseCoordinates(coordString);
    const locationStatus = document.getElementById('locationStatus');
    
    if (coords && mapManager) {
      try {
        mapManager.setLocationFromCoordinates(coords.lat, coords.lng);
        if (locationStatus) {
          locationStatus.textContent = `✅ Coordinates set: ${coords.lat.toFixed(6)}, ${coords.lng.toFixed(6)}`;
          locationStatus.className = 'location-status status-success';
        }
      } catch (error) {
        if (locationStatus) {
          locationStatus.textContent = '❌ Invalid coordinates';
          locationStatus.className = 'location-status status-error';
        }
      }
    } else if (coordString.trim()) {
      if (locationStatus) {
        locationStatus.textContent = '❌ Invalid coordinate format. Use: lat,lng';
        locationStatus.className = 'location-status status-error';
      }
    }
  }

  // Refresh projects list
  async refreshProjects() {
    await projectManager.loadProjects();
    const projects = projectManager.getProjects();
    
    // Update project dropdown
    const assignProject = document.getElementById('assignProject');
    if (assignProject) {
      assignProject.innerHTML = '<option value="">-- Select project --</option>';
      projects.forEach(project => {
        const option = document.createElement('option');
        option.value = project.id;
        option.textContent = project.name;
        assignProject.appendChild(option);
      });
    }

    // Update project list in sidebar - simplified without file counts
    const projectList = document.getElementById('projectList');
    if (projectList) {
      projectList.innerHTML = '';
      projects.forEach(project => {
        const item = document.createElement('div');
        item.className = 'project-item';
        item.innerHTML = `
          <div class="project-item-name">${project.name}</div>
        `;
        item.addEventListener('click', () => {
          this.selectProject(project.id);
        });
        projectList.appendChild(item);
      });
    }
  }

  // Select project
  selectProject(projectId) {
    const assignProject = document.getElementById('assignProject');
    if (assignProject) {
      assignProject.value = projectId;
    }
    this.loadProjectFiles(projectId);
    
    // Update titlebar project name if in Electron
    if (typeof window.updateTitlebarProject === 'function') {
      const projects = projectManager.getProjects();
      const project = projects.find(p => p.id === projectId);
      window.updateTitlebarProject(project ? project.name : '');
    }
  }

  // Delete project
  async deleteProject(projectId) {
    try {
      await projectManager.deleteProject(projectId);
      await this.refreshProjects();
      
      // Clear file list if this project was selected
      const assignProject = document.getElementById('assignProject');
      if (assignProject?.value === projectId) {
        assignProject.value = '';
        this.loadProjectFiles('');
      }
    } catch (error) {
      UTILS.showToast(error.message, 'error');
    }
  }

  // Load current project
  async loadCurrentProject() {
    const project = await projectManager.loadCurrentProject();
    if (project) {
      const assignProject = document.getElementById('assignProject');
      if (assignProject) {
        assignProject.value = project.id;
      }
      await this.loadProjectFiles(project.id);
    }
  }

  // Load project files
  async loadProjectFiles(projectId) {
    const files = await fileManager.loadProjectFiles(projectId);
    const fileList = document.getElementById('fileList');
    const statSummary = document.getElementById('statSummary');

    if (fileList) {
      fileList.innerHTML = '';
      
      if (files.length === 0) {
        fileList.innerHTML = '<div class="empty-state">No files in this project</div>';
      } else {
        files.forEach(file => {
          const item = document.createElement('div');
          item.className = 'file-item';
          item.innerHTML = `
            <input type="checkbox" data-file-id="${file.id}">
            <div class="file-icon">📄</div>
            <div class="file-info">
              <div class="file-name">${file.filename}</div>
              <div class="file-meta">${UTILS.formatDate(file.metadata.createdAt)} • ${file.files?.length || 0} file(s)</div>
            </div>
            <button class="btn-tool" onclick="uiManager.previewFile('${file.id}')" title="Preview">👁️</button>
          `;
          fileList.appendChild(item);
        });
      }
    }

    if (statSummary) {
      const totalSize = files.reduce((sum, file) => {
        return sum + (file.files?.reduce((fileSum, f) => fileSum + f.size, 0) || 0);
      }, 0);
      
      statSummary.textContent = `${files.length} file(s) • ${UTILS.formatFileSize(totalSize)}`;
    }

    // Save current project
    if (projectId) {
      const project = await projectManager.getProject(projectId);
      projectManager.setCurrentProject(project);
    }
  }

  // Preview file
  async previewFile(fileId) {
    const file = await db.get(CONFIG.STORES.FILES, fileId);
    const previewArea = document.getElementById('previewArea');
    
    if (previewArea && file) {
      previewArea.innerHTML = fileManager.getFilePreview(file);
    }
  }

  // Handle export project
  async handleExportProject() {
    const assignProject = document.getElementById('assignProject');
    const projectId = assignProject?.value;

    if (!projectId) {
      UTILS.showToast('Please select a project to export', 'error');
      return;
    }

    try {
      await fileManager.exportProjectAsZip(projectId);
    } catch (error) {
      UTILS.showToast(error.message, 'error');
    }
  }

  // Handle delete files
  async handleDeleteFiles() {
    const checkboxes = document.querySelectorAll('#fileList input[type="checkbox"]:checked');
    const fileIds = Array.from(checkboxes).map(cb => cb.dataset.fileId);

    if (fileIds.length === 0) {
      UTILS.showToast('Please select files to delete', 'error');
      return;
    }

    try {
      await fileManager.deleteFiles(fileIds);
      
      // Refresh current project files
      const assignProject = document.getElementById('assignProject');
      if (assignProject?.value) {
        await this.loadProjectFiles(assignProject.value);
      }
    } catch (error) {
      UTILS.showToast(error.message, 'error');
    }
  }

  // Handle export all
  async handleExportAll() {
    try {
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
      UTILS.showToast('Backup exported successfully', 'success');
    } catch (error) {
      UTILS.showToast('Export failed: ' + error.message, 'error');
    }
  }

  // Set default date
  setDefaultDate() {
    const fileDate = document.getElementById('fileDate');
    if (fileDate && !fileDate.value) {
      fileDate.value = new Date().toISOString().split('T')[0];
    }
  }

  // Load settings
  loadSettings() {
    // Load any saved UI settings
    const settings = localStorage.getItem('strataUISettings');
    if (settings) {
      try {
        const parsed = JSON.parse(settings);
        // Apply settings
      } catch (e) {
        console.warn('Failed to load UI settings:', e);
      }
    }
  }

  // Save settings
  saveSettings() {
    const settings = {
      theme: this.currentTheme,
      // Add other settings as needed
    };
    localStorage.setItem('strataUISettings', JSON.stringify(settings));
  }

  // Show address dropdown with results
  showAddressDropdown(results) {
    const dropdown = document.getElementById('addressDropdown');
    if (!dropdown) return;

    let html = '';
    results.forEach((result, index) => {
      const typeLabel = this.getLocationTypeLabel(result.type);
      html += `
        <div class="address-option" data-index="${index}" data-lat="${result.lat}" data-lng="${result.lng}" data-name="${result.name}">
          <div class="address-option-name">
            ${typeLabel ? `<span class="address-option-type">${typeLabel}</span>` : ''}
            ${this.truncateText(result.name, 60)}
          </div>
          <div class="address-option-details">
            📍 ${result.lat.toFixed(6)}, ${result.lng.toFixed(6)}
          </div>
        </div>
      `;
    });

    dropdown.innerHTML = html;
    dropdown.classList.add('show');

    // Add click handlers
    dropdown.querySelectorAll('.address-option').forEach(option => {
      option.addEventListener('click', () => {
        this.selectAddressOption(option);
      });
    });

    // Add keyboard navigation
    this.setupAddressKeyboardNavigation(results.length);
  }

  // Hide address dropdown
  hideAddressDropdown() {
    const dropdown = document.getElementById('addressDropdown');
    if (dropdown) {
      dropdown.classList.remove('show');
      dropdown.innerHTML = '';
    }
  }

  // Select address option
  selectAddressOption(option) {
    const lat = parseFloat(option.dataset.lat);
    const lng = parseFloat(option.dataset.lng);
    const name = option.dataset.name;

    // Set location on map
    if (mapManager) {
      mapManager.setLocationFromCoordinates(lat, lng, name);
    }

    // Update location status
    const locationStatus = document.getElementById('locationStatus');
    if (locationStatus) {
      locationStatus.textContent = `✅ ${this.truncateText(name, 50)}`;
      locationStatus.className = 'location-status status-success';
    }

    // Clear search input and hide dropdown
    const addressSearch = document.getElementById('addressSearch');
    if (addressSearch) {
      addressSearch.value = '';
    }
    this.hideAddressDropdown();

    UTILS.showToast('Location selected', 'success');
  }

  // Setup keyboard navigation for address dropdown
  setupAddressKeyboardNavigation(resultCount) {
    const addressSearch = document.getElementById('addressSearch');
    const dropdown = document.getElementById('addressDropdown');
    if (!addressSearch || !dropdown) return;

    let highlightedIndex = -1;

    const keyHandler = (e) => {
      const options = dropdown.querySelectorAll('.address-option');
      
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          highlightedIndex = Math.min(highlightedIndex + 1, options.length - 1);
          this.updateHighlight(options, highlightedIndex);
          break;
        case 'ArrowUp':
          e.preventDefault();
          highlightedIndex = Math.max(highlightedIndex - 1, -1);
          this.updateHighlight(options, highlightedIndex);
          break;
        case 'Enter':
          e.preventDefault();
          if (highlightedIndex >= 0 && options[highlightedIndex]) {
            this.selectAddressOption(options[highlightedIndex]);
          } else {
            // If no option highlighted, perform search
            this.handleAddressSearch(addressSearch.value.trim());
          }
          break;
        case 'Escape':
          e.preventDefault();
          this.hideAddressDropdown();
          break;
      }
    };

    // Remove existing listener
    if (addressSearch._keyHandler) {
      addressSearch.removeEventListener('keydown', addressSearch._keyHandler);
    }
    // Add new listener
    addressSearch._keyHandler = keyHandler;
    addressSearch.addEventListener('keydown', keyHandler);
  }

  // Update highlight in dropdown
  updateHighlight(options, highlightedIndex) {
    options.forEach((option, index) => {
      if (index === highlightedIndex) {
        option.classList.add('highlighted');
      } else {
        option.classList.remove('highlighted');
      }
    });
  }

  // Get location type label
  getLocationTypeLabel(type) {
    const typeMap = {
      'city': '🏙️ City',
      'town': '🏘️ Town',
      'village': '🏡 Village',
      'hamlet': '🏠 Hamlet',
      'suburb': '🏘️ Suburb',
      'district': '🗺️ District',
      'state': '🗺️ State',
      'country': '🌍 Country',
      'administrative': '🏛️ Admin',
      'residential': '🏠 Area',
      'commercial': '🏢 Commercial',
      'industrial': '🏭 Industrial',
      'road': '🛣️ Road',
      'highway': '🛣️ Highway',
      'railway': '🚂 Railway',
      'waterway': '🌊 Water',
      'natural': '🌿 Natural',
      'tourism': '🎯 Tourism',
      'amenity': '🏪 Amenity'
    };
    return typeMap[type] || null;
  }

  // Truncate text for display
  truncateText(text, maxLength) {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength - 3) + '...';
  }

  // Setup global event listeners
  setupGlobalEventListeners() {
    // Global click handler for dropdowns
    document.addEventListener('click', (e) => {
      const dropdown = document.getElementById('addressDropdown');
      const addressSearch = document.getElementById('addressSearch');
      
      if (dropdown && dropdown.classList.contains('show')) {
        if (!dropdown.contains(e.target) && e.target !== addressSearch) {
          this.hideAddressDropdown();
        }
      }
    });
  }

  // Show settings modal
  showSettingsModal() {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay show';
    modal.innerHTML = `
      <div class="modal">
        <div class="modal-header">
          <h3 class="modal-title">Settings</h3>
          <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">×</button>
        </div>
        <div class="modal-body">
          <div class="form-section">
            <label class="form-label">Theme</label>
            <select id="themeSelect" class="form-select">
              <option value="light" ${this.currentTheme === 'light' ? 'selected' : ''}>Light</option>
              <option value="dark" ${this.currentTheme === 'dark' ? 'selected' : ''}>Dark</option>
            </select>
          </div>
          
          <div class="form-section">
            <label class="form-label">Default Date</label>
            <select id="defaultDateSelect" class="form-select">
              <option value="today">Today</option>
              <option value="yesterday">Yesterday</option>
              <option value="custom">Custom</option>
            </select>
          </div>
          
          <div class="form-section">
            <label class="form-label">Auto-save Form Data</label>
            <input type="checkbox" id="autoSaveCheck" checked>
            <span class="help-text">Automatically save form data as you type</span>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn-primary" onclick="uiManager.saveSettingsModal(this)">Save Settings</button>
          <button class="btn-secondary" onclick="this.closest('.modal-overlay').remove()">Cancel</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
  }

  // Save settings from modal
  saveSettingsModal(button) {
    const modal = button.closest('.modal-overlay');
    const themeSelect = modal.querySelector('#themeSelect');
    
    if (themeSelect && themeSelect.value !== this.currentTheme) {
      this.setTheme(themeSelect.value);
    }
    
    // Save other settings as needed
    this.saveSettings();
    
    UTILS.showToast('Settings saved', 'success');
    modal.remove();
  }

  // Show help modal
  showHelpModal() {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay show';
    modal.innerHTML = `
      <div class="modal">
        <div class="modal-header">
          <h3 class="modal-title">StrataDesk Help</h3>
          <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">×</button>
        </div>
        <div class="modal-body">
          <div class="guide-steps">
            <div class="guide-title">Getting Started</div>
            
            <div class="guide-step">
              <div class="guide-step-number">1</div>
              <div class="guide-step-content">
                <div class="guide-step-title">Create a Project</div>
                <div class="guide-step-description">
                  Enter a project name and click "Create" to organize your groundwater data.
                </div>
              </div>
            </div>

            <div class="guide-step">
              <div class="guide-step-number">2</div>
              <div class="guide-step-content">
                <div class="guide-step-title">Set Location</div>
                <div class="guide-step-description">
                  Click "Click on Map" then click the map, or search for an address, or enter coordinates.
                </div>
              </div>
            </div>

            <div class="guide-step">
              <div class="guide-step-number">3</div>
              <div class="guide-step-content">
                <div class="guide-step-title">Enter Data</div>
                <div class="guide-step-description">
                  Fill in the bore ID, water level, and attach any files. Then click "Save Boring".
                </div>
              </div>
            </div>

            <div class="guide-step">
              <div class="guide-step-number">4</div>
              <div class="guide-step-content">
                <div class="guide-step-title">Export & Share</div>
                <div class="guide-step-description">
                  Use "Export ZIP" to download your project files or "Backup All" for complete data export.
                </div>
              </div>
            </div>
          </div>
          
          <div class="tip-banner info" style="margin-top: 20px;">
            <div class="tip-icon">💡</div>
            <div class="tip-content">
              <div class="tip-title">Pro Tips</div>
              <div class="tip-message">
                • Use the 🔄 button to repeat your last entry<br>
                • All data is stored locally in your browser<br>
                • Export regularly to backup your work
              </div>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn-primary" onclick="this.closest('.modal-overlay').remove()">Got it!</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
  }

  // Show location status
  showLocationStatus(message, type = 'info') {
    const locationStatus = document.getElementById('locationStatus');
    if (locationStatus) {
      locationStatus.textContent = message;
      locationStatus.className = `location-status ${type}`;
      locationStatus.style.display = 'block';
    }
  }

  // Hide location status
  hideLocationStatus() {
    const locationStatus = document.getElementById('locationStatus');
    if (locationStatus) {
      locationStatus.style.display = 'none';
    }
  }

  // Update project selection highlight
  updateProjectSelection(projectId) {
    const projectItems = document.querySelectorAll('.project-item');
    projectItems.forEach(item => {
      item.classList.remove('active');
    });
    
    const assignProject = document.getElementById('assignProject');
    if (assignProject) {
      assignProject.value = projectId;
      
      // Highlight the selected project in the list
      projectItems.forEach(item => {
        if (item.textContent.includes(assignProject.options[assignProject.selectedIndex]?.text)) {
          item.classList.add('active');
        }
      });
    }
  }

  // Strata layer management
  addStrataLayer() {
    const container = document.getElementById('strataLayers');
    const layerDiv = document.createElement('div');
    layerDiv.className = 'strata-layer-input';
    
    layerDiv.innerHTML = `
      <select class="strata-type">
        <option value="">Layer type...</option>
        <option value="topsoil">Topsoil</option>
        <option value="clay">Clay</option>
        <option value="sand">Sand</option>
        <option value="gravel">Gravel</option>
        <option value="silt">Silt</option>
        <option value="sandstone">Sandstone</option>
        <option value="limestone">Limestone</option>
        <option value="shale">Shale</option>
        <option value="rock">Rock</option>
        <option value="bedrock">Bedrock</option>
      </select>
      <input type="number" class="strata-thickness" placeholder="Thickness (ft)" step="0.1" min="0">
      <button type="button" class="btn-tool remove-layer" onclick="this.parentElement.remove()">−</button>
    `;
    
    container.appendChild(layerDiv);
  }
  
  // Get strata layers from form
  getStrataLayers() {
    const layers = [];
    const layerInputs = document.querySelectorAll('.strata-layer-input');
    
    layerInputs.forEach(input => {
      const type = input.querySelector('.strata-type').value;
      const thickness = parseFloat(input.querySelector('.strata-thickness').value);
      
      if (type && thickness > 0) {
        layers.push({ type, thickness });
      }
    });
    
    return layers;
  }
  
  // Clear strata layers
  clearStrataLayers() {
    const container = document.getElementById('strataLayers');
    // Keep first layer, clear others
    const layers = container.querySelectorAll('.strata-layer-input');
    for (let i = 1; i < layers.length; i++) {
      layers[i].remove();
    }
    
    // Clear first layer values
    const firstLayer = container.querySelector('.strata-layer-input');
    if (firstLayer) {
      firstLayer.querySelector('.strata-type').value = '';
      firstLayer.querySelector('.strata-thickness').value = '';
    }
    
    const strataSummary = document.getElementById('strataSummary');
    if (strataSummary) {
      strataSummary.value = '';
    }
  }

  // Initialize extraction features
  initializeExtractionFeatures() {
    // Check if extraction modules are available
    if (typeof window.StrataExtractor !== 'undefined' && typeof window.ReviewInterface !== 'undefined') {
      console.log('✅ Strata extraction features available');
      
      // Add extraction-related UI enhancements
      this.setupExtractionUI();
      
      // Register global extraction handlers (will be overridden by proper integration)
      window.showStrataReview = this.showStrataReview.bind(this);
      window.hideStrataReview = this.hideStrataReview.bind(this);
      
    } else {
      console.log('⚠️ Strata extraction features not available, will retry...');
      
      // Retry after a short delay to allow modules to load
      setTimeout(() => {
        this.initializeExtractionFeatures();
      }, 500);
    }
  }

  // Setup extraction-specific UI enhancements
  setupExtractionUI() {
    // Add keyboard shortcuts for extraction
    document.addEventListener('keydown', (e) => {
      // Ctrl/Cmd + E for extraction (when files are selected)
      if ((e.ctrlKey || e.metaKey) && e.key === 'e') {
        const extractBtn = document.getElementById('extract-strata-btn');
        if (extractBtn && !extractBtn.disabled) {
          e.preventDefault();
          extractBtn.click();
        }
      }
    });

    // Add tooltips for extraction features
    this.addExtractionTooltips();
  }

  // Add tooltips for extraction features
  addExtractionTooltips() {
    const fileInput = document.getElementById('fileInput');
    if (fileInput) {
      fileInput.title = 'Upload Excel (.xlsx) or PDF files for automatic strata extraction';
    }

    // Add help text for strata extraction
    const selectedFiles = document.getElementById('selectedFiles');
    if (selectedFiles && !selectedFiles.querySelector('.extraction-help')) {
      const helpText = document.createElement('div');
      helpText.className = 'extraction-help';
      helpText.innerHTML = `
        <small style="color: var(--text-muted); font-size: var(--font-size-xs); margin-top: var(--spacing-xs); display: block;">
          💡 Upload Excel or PDF strata charts for automatic layer extraction
        </small>
      `;
      selectedFiles.appendChild(helpText);
    }
  }

  // Show strata review modal (global handler)
  showStrataReview(layers, metadata) {
    if (typeof window.ReviewInterface !== 'undefined') {
      const reviewInterface = new window.ReviewInterface();
      reviewInterface.displayDraftLayers(layers, metadata);
      return reviewInterface;
    } else {
      console.error('ReviewInterface not available');
      return null;
    }
  }

  // Hide strata review modal (global handler)
  hideStrataReview() {
    const modal = document.querySelector('.strata-review-modal');
    if (modal) {
      modal.style.display = 'none';
      document.body.classList.remove('modal-open');
    }
  }

  // Enhanced modal management for extraction
  createModal(content, className = '') {
    const modal = document.createElement('div');
    modal.className = `modal-overlay show ${className}`;
    modal.innerHTML = content;
    
    // Add close on backdrop click
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.remove();
      }
    });
    
    // Add escape key handler
    const escapeHandler = (e) => {
      if (e.key === 'Escape') {
        modal.remove();
        document.removeEventListener('keydown', escapeHandler);
      }
    };
    document.addEventListener('keydown', escapeHandler);
    
    document.body.appendChild(modal);
    return modal;
  }
}

// Create global UI manager
window.uiManager = new UIManager();

// Ensure UTILS is available for UI manager
if (typeof window.UTILS === 'undefined') {
  console.warn('UTILS not available, UI manager may not work properly');
}