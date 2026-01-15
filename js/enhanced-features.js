// Enhanced features and improvements for StrataDesk
(function() {
    'use strict';
    
    console.log('🚀 Enhanced features loading...');
    
    // Enhanced keyboard shortcuts
    function setupKeyboardShortcuts() {
        document.addEventListener('keydown', function(e) {
            // Ctrl/Cmd + N - New project
            if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
                e.preventDefault();
                document.getElementById('newProjectName')?.focus();
                console.log('Keyboard shortcut: New project');
            }
            
            // Ctrl/Cmd + S - Save boring
            if ((e.ctrlKey || e.metaKey) && e.key === 's') {
                e.preventDefault();
                const attachBtn = document.getElementById('attachBtn');
                if (attachBtn) {
                    attachBtn.click();
                    console.log('Keyboard shortcut: Save boring');
                }
            }
            
            // Ctrl/Cmd + F - Focus search
            if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
                e.preventDefault();
                document.getElementById('searchQ')?.focus();
                console.log('Keyboard shortcut: Focus search');
            }
            
            // Ctrl/Cmd + E - Export project
            if ((e.ctrlKey || e.metaKey) && e.key === 'e') {
                e.preventDefault();
                const exportBtn = document.getElementById('exportProjectBtn');
                if (exportBtn) {
                    exportBtn.click();
                    console.log('Keyboard shortcut: Export project');
                }
            }
            
            // F1 - Tips (since help modal is removed)
            if (e.key === 'F1') {
                e.preventDefault();
                if (window.tipsSystem) {
                    window.tipsSystem.showTipsModal();
                    console.log('Keyboard shortcut: Tips system');
                }
            }
        });
        
        console.log('✅ Keyboard shortcuts enabled');
    }
    
    // Enhanced tooltips
    function setupEnhancedTooltips() {
        const tooltipElements = document.querySelectorAll('[title]');
        
        tooltipElements.forEach(element => {
            const originalTitle = element.getAttribute('title');
            element.removeAttribute('title'); // Remove default tooltip
            
            element.addEventListener('mouseenter', function() {
                showCustomTooltip(this, originalTitle);
            });
            
            element.addEventListener('mouseleave', function() {
                hideCustomTooltip();
            });
        });
        
        console.log('✅ Enhanced tooltips enabled');
    }
    
    // Show custom tooltip
    function showCustomTooltip(element, text) {
        const tooltip = document.createElement('div');
        tooltip.className = 'custom-tooltip';
        tooltip.textContent = text;
        document.body.appendChild(tooltip);
        
        const rect = element.getBoundingClientRect();
        tooltip.style.left = rect.left + (rect.width / 2) - (tooltip.offsetWidth / 2) + 'px';
        tooltip.style.top = rect.top - tooltip.offsetHeight - 8 + 'px';
        
        // Adjust if tooltip goes off screen
        if (tooltip.offsetLeft < 0) {
            tooltip.style.left = '8px';
        }
        if (tooltip.offsetLeft + tooltip.offsetWidth > window.innerWidth) {
            tooltip.style.left = window.innerWidth - tooltip.offsetWidth - 8 + 'px';
        }
        
        tooltip.classList.add('show');
    }
    
    // Hide custom tooltip
    function hideCustomTooltip() {
        const tooltip = document.querySelector('.custom-tooltip');
        if (tooltip) {
            tooltip.remove();
        }
    }
    
    // Auto-save form data
    function setupAutoSave() {
        const formFields = ['boreId', 'waterLevel', 'tags', 'notes', 'latlng'];
        const autoSaveKey = 'strataAutoSave';
        
        // Load saved data
        function loadAutoSaveData() {
            try {
                const saved = localStorage.getItem(autoSaveKey);
                if (saved) {
                    const data = JSON.parse(saved);
                    formFields.forEach(fieldId => {
                        const field = document.getElementById(fieldId);
                        if (field && data[fieldId]) {
                            field.value = data[fieldId];
                        }
                    });
                    console.log('Auto-save data loaded');
                }
            } catch (error) {
                console.warn('Failed to load auto-save data:', error);
            }
        }
        
        // Save form data
        function saveFormData() {
            const data = {};
            formFields.forEach(fieldId => {
                const field = document.getElementById(fieldId);
                if (field && field.value.trim()) {
                    data[fieldId] = field.value;
                }
            });
            
            if (Object.keys(data).length > 0) {
                localStorage.setItem(autoSaveKey, JSON.stringify(data));
            }
        }
        
        // Clear auto-save data
        function clearAutoSaveData() {
            localStorage.removeItem(autoSaveKey);
        }
        
        // Setup listeners
        formFields.forEach(fieldId => {
            const field = document.getElementById(fieldId);
            if (field) {
                field.addEventListener('input', saveFormData);
                field.addEventListener('blur', saveFormData);
            }
        });
        
        // Clear auto-save when form is submitted
        const attachBtn = document.getElementById('attachBtn');
        if (attachBtn) {
            attachBtn.addEventListener('click', clearAutoSaveData);
        }
        
        // Load data on startup
        setTimeout(loadAutoSaveData, 1000);
        
        console.log('✅ Auto-save enabled');
    }
    
    // Enhanced file drag and drop
    function setupDragAndDrop() {
        const fileInput = document.getElementById('fileInput');
        const dropZone = document.querySelector('.data-entry-panel');
        
        if (!fileInput || !dropZone) return;
        
        // Prevent default drag behaviors
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            dropZone.addEventListener(eventName, preventDefaults, false);
            document.body.addEventListener(eventName, preventDefaults, false);
        });
        
        // Highlight drop zone when item is dragged over it
        ['dragenter', 'dragover'].forEach(eventName => {
            dropZone.addEventListener(eventName, highlight, false);
        });
        
        ['dragleave', 'drop'].forEach(eventName => {
            dropZone.addEventListener(eventName, unhighlight, false);
        });
        
        // Handle dropped files
        dropZone.addEventListener('drop', handleDrop, false);
        
        function preventDefaults(e) {
            e.preventDefault();
            e.stopPropagation();
        }
        
        function highlight(e) {
            dropZone.classList.add('drag-over');
        }
        
        function unhighlight(e) {
            dropZone.classList.remove('drag-over');
        }
        
        function handleDrop(e) {
            const dt = e.dataTransfer;
            const files = dt.files;
            
            if (files.length > 0) {
                fileInput.files = files;
                
                // Trigger change event
                const event = new Event('change', { bubbles: true });
                fileInput.dispatchEvent(event);
                
                // Show toast
                if (typeof UTILS !== 'undefined' && UTILS.showToast) {
                    UTILS.showToast(`${files.length} file(s) added`, 'success');
                }
                
                console.log('Files dropped:', files.length);
            }
        }
        
        console.log('✅ Drag and drop enabled');
    }
    
    // Enhanced search with filters
    function setupEnhancedSearch() {
        const searchInput = document.getElementById('searchQ');
        if (!searchInput) return;
        
        let searchTimeout;
        
        searchInput.addEventListener('input', function() {
            clearTimeout(searchTimeout);
            const query = this.value.trim();
            
            if (query.length === 0) {
                clearSearchResults();
                return;
            }
            
            searchTimeout = setTimeout(() => {
                performEnhancedSearch(query);
            }, 300);
        });
        
        function performEnhancedSearch(query) {
            console.log('Enhanced search for:', query);
            
            // Search in projects, files, and metadata
            const results = [];
            
            // Add search filters
            const searchFilters = document.createElement('div');
            searchFilters.className = 'search-filters';
            searchFilters.innerHTML = `
                <div class="filter-chips">
                    <button class="filter-chip active" data-filter="all">All</button>
                    <button class="filter-chip" data-filter="projects">Projects</button>
                    <button class="filter-chip" data-filter="files">Files</button>
                    <button class="filter-chip" data-filter="locations">Locations</button>
                </div>
            `;
            
            const searchResults = document.getElementById('searchResults');
            if (searchResults) {
                searchResults.innerHTML = '';
                searchResults.appendChild(searchFilters);
                
                // Add filter event listeners
                searchFilters.querySelectorAll('.filter-chip').forEach(chip => {
                    chip.addEventListener('click', function() {
                        searchFilters.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
                        this.classList.add('active');
                        // Perform filtered search
                        console.log('Filter selected:', this.dataset.filter);
                    });
                });
            }
        }
        
        function clearSearchResults() {
            const searchResults = document.getElementById('searchResults');
            if (searchResults) {
                searchResults.innerHTML = '';
            }
        }
        
        console.log('✅ Enhanced search enabled');
    }
    
    // Progress indicators
    function setupProgressIndicators() {
        // Add progress bar for file uploads
        const fileInput = document.getElementById('fileInput');
        if (fileInput) {
            fileInput.addEventListener('change', function() {
                if (this.files.length > 0) {
                    showUploadProgress(this.files.length);
                }
            });
        }
        
        function showUploadProgress(fileCount) {
            const progressBar = document.createElement('div');
            progressBar.className = 'upload-progress';
            progressBar.innerHTML = `
                <div class="progress-label">Processing ${fileCount} file(s)...</div>
                <div class="progress-bar">
                    <div class="progress-fill"></div>
                </div>
            `;
            
            const selectedFiles = document.getElementById('selectedFiles');
            if (selectedFiles) {
                selectedFiles.appendChild(progressBar);
                
                // Animate progress
                const progressFill = progressBar.querySelector('.progress-fill');
                let progress = 0;
                const interval = setInterval(() => {
                    progress += 10;
                    progressFill.style.width = progress + '%';
                    
                    if (progress >= 100) {
                        clearInterval(interval);
                        setTimeout(() => {
                            progressBar.remove();
                        }, 500);
                    }
                }, 50);
            }
        }
        
        console.log('✅ Progress indicators enabled');
    }
    
    // Enhanced notifications
    function setupEnhancedNotifications() {
        // Request notification permission
        if ('Notification' in window && Notification.permission === 'default') {
            Notification.requestPermission().then(permission => {
                console.log('Notification permission:', permission);
            });
        }
        
        // Show desktop notification for important events
        window.showDesktopNotification = function(title, message, type = 'info') {
            if ('Notification' in window && Notification.permission === 'granted') {
                const notification = new Notification(title, {
                    body: message,
                    icon: 'icons/icon.png',
                    badge: 'icons/icon.png'
                });
                
                setTimeout(() => notification.close(), 2000);
            }
        };
        
        console.log('✅ Enhanced notifications enabled');
    }
    
    // Data validation helpers
    function setupDataValidation() {
        const waterLevelInput = document.getElementById('waterLevel');
        const boreIdInput = document.getElementById('boreId');
        
        if (waterLevelInput) {
            waterLevelInput.addEventListener('input', function() {
                const value = parseFloat(this.value);
                if (isNaN(value) || value < 0 || value > 1000) {
                    this.setCustomValidity('Water level must be between 0 and 1000 feet');
                } else {
                    this.setCustomValidity('');
                }
            });
        }
        
        if (boreIdInput) {
            boreIdInput.addEventListener('input', function() {
                const value = this.value.trim();
                if (value && !/^[A-Za-z0-9\-_]+$/.test(value)) {
                    this.setCustomValidity('Bore ID can only contain letters, numbers, hyphens, and underscores');
                } else {
                    this.setCustomValidity('');
                }
            });
        }
        
        console.log('✅ Data validation enabled');
    }
    
    // Performance monitoring
    function setupPerformanceMonitoring() {
        let performanceData = {
            loadTime: performance.now(),
            interactions: 0,
            errors: 0
        };
        
        // Track interactions
        document.addEventListener('click', function() {
            performanceData.interactions++;
        });
        
        // Track errors
        window.addEventListener('error', function() {
            performanceData.errors++;
        });
        
        // Export performance data
        window.getPerformanceData = function() {
            return {
                ...performanceData,
                uptime: performance.now() - performanceData.loadTime,
                memory: performance.memory ? {
                    used: performance.memory.usedJSHeapSize,
                    total: performance.memory.totalJSHeapSize,
                    limit: performance.memory.jsHeapSizeLimit
                } : null
            };
        };
        
        console.log('✅ Performance monitoring enabled');
    }
    
    // Initialize all enhancements
    function initializeEnhancements() {
        console.log('🔧 Initializing enhanced features...');
        
        setupKeyboardShortcuts();
        setupEnhancedTooltips();
        setupAutoSave();
        setupDragAndDrop();
        setupEnhancedSearch();
        setupProgressIndicators();
        setupEnhancedNotifications();
        setupDataValidation();
        setupPerformanceMonitoring();
        
        console.log('✅ All enhanced features initialized');
        
        // Show enhancement notification
        setTimeout(() => {
            if (typeof UTILS !== 'undefined' && UTILS.showToast) {
                UTILS.showToast('Enhanced features loaded! Press F1 or F2 for tips.', 'success');
            }
        }, 2000);
    }
    
    // Run when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeEnhancements);
    } else {
        initializeEnhancements();
    }
    
    // Also run after a delay to catch late-loading elements
    setTimeout(initializeEnhancements, 1000);
    
})();