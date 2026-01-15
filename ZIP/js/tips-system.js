// Enhanced Tips System - Comprehensive user guidance
(function() {
    'use strict';
    
    console.log('💡 Tips System loading...');
    
    class TipsSystem {
        constructor() {
            this.isVisible = false;
            this.currentTipIndex = 0;
            this.tips = this.getTipsData();
        }
        
        // Initialize tips system
        init() {
            this.addTipsButton();
            this.setupEventListeners();
            console.log('✅ Tips System initialized');
        }
        
        // Add tips button to navbar
        addTipsButton() {
            // Button creation is now handled by navbar-buttons-fix.js
            // This prevents conflicts and ensures proper timing
            console.log('Tips button creation delegated to navbar buttons manager');
        }
        
        // Setup event listeners
        setupEventListeners() {
            // Keyboard shortcut F2 for tips
            document.addEventListener('keydown', (e) => {
                if (e.key === 'F2') {
                    e.preventDefault();
                    this.showTipsModal();
                }
            });
            
            // Close tips on escape
            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape' && this.isVisible) {
                    this.hideTipsModal();
                }
            });
        }
        
        // Get comprehensive tips data
        getTipsData() {
            return [
                {
                    title: "🚀 Getting Started",
                    category: "basics",
                    content: `
                        <div class="tip-section">
                            <h4>Welcome to StrataDesk!</h4>
                            <p>StrataDesk is a professional groundwater data management system. Here's how to get started:</p>
                            
                            <div class="tip-steps">
                                <div class="tip-step">
                                    <div class="tip-step-number">1</div>
                                    <div class="tip-step-content">
                                        <strong>Login:</strong> Click "Continue as Guest" for immediate access, or create an account for data persistence.
                                    </div>
                                </div>
                                <div class="tip-step">
                                    <div class="tip-step-number">2</div>
                                    <div class="tip-step-content">
                                        <strong>Create Project:</strong> Enter a project name like "Smith Property Well Survey" and click the + button.
                                    </div>
                                </div>
                                <div class="tip-step">
                                    <div class="tip-step-number">3</div>
                                    <div class="tip-step-content">
                                        <strong>Set Location:</strong> Click "Click on Map" then click where your well is located, or search for an address.
                                    </div>
                                </div>
                                <div class="tip-step">
                                    <div class="tip-step-number">4</div>
                                    <div class="tip-step-content">
                                        <strong>Enter Data:</strong> Fill in bore ID, water level, and attach any files like photos or reports.
                                    </div>
                                </div>
                            </div>
                        </div>
                    `
                },
                {
                    title: "📍 Location Management",
                    category: "location",
                    content: `
                        <div class="tip-section">
                            <h4>Setting Accurate Locations</h4>
                            <p>Precise location data is crucial for groundwater monitoring. Here are three ways to set locations:</p>
                            
                            <div class="location-methods">
                                <div class="method-card">
                                    <div class="method-icon">🗺️</div>
                                    <div class="method-content">
                                        <h5>Click on Map</h5>
                                        <p>Click "Click on Map" button, then click directly on the map where your well is located. This is the most accurate method.</p>
                                        <div class="method-tip">💡 Zoom in for better precision</div>
                                    </div>
                                </div>
                                
                                <div class="method-card">
                                    <div class="method-icon">🔍</div>
                                    <div class="method-content">
                                        <h5>Address Search</h5>
                                        <p>Type an address in the search box. The system will find the location and show suggestions.</p>
                                        <div class="method-tip">💡 Try "123 Main St, City, State" format</div>
                                    </div>
                                </div>
                                
                                <div class="method-card">
                                    <div class="method-icon">📐</div>
                                    <div class="method-content">
                                        <h5>GPS Coordinates</h5>
                                        <p>Enter precise coordinates in the format: latitude,longitude (e.g., 40.7128,-74.0060)</p>
                                        <div class="method-tip">💡 Use decimal degrees format</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    `
                },
                {
                    title: "💧 Water Level Data",
                    category: "data",
                    content: `
                        <div class="tip-section">
                            <h4>Recording Water Level Measurements</h4>
                            <p>Accurate water level data is essential for groundwater analysis:</p>
                            
                            <div class="measurement-guide">
                                <div class="guide-item">
                                    <div class="guide-icon">📏</div>
                                    <div class="guide-content">
                                        <h5>How to Measure</h5>
                                        <ul>
                                            <li>Use a water level meter or measuring tape</li>
                                            <li>Measure from the top of the well casing to the water surface</li>
                                            <li>Record the depth in feet below ground surface</li>
                                            <li>Take measurements at the same time each day for consistency</li>
                                        </ul>
                                    </div>
                                </div>
                                
                                <div class="guide-item">
                                    <div class="guide-icon">⏰</div>
                                    <div class="guide-content">
                                        <h5>Best Practices</h5>
                                        <ul>
                                            <li>Measure early morning for stable readings</li>
                                            <li>Wait 24 hours after pumping before measuring</li>
                                            <li>Record weather conditions in notes</li>
                                            <li>Double-check measurements before saving</li>
                                        </ul>
                                    </div>
                                </div>
                                
                                <div class="guide-item">
                                    <div class="guide-icon">📝</div>
                                    <div class="guide-content">
                                        <h5>Data Entry Tips</h5>
                                        <ul>
                                            <li>Use consistent bore ID naming (e.g., MW-01, TW-02)</li>
                                            <li>Enter water level as feet below ground</li>
                                            <li>Add tags like "monitoring", "baseline", "post-rain"</li>
                                            <li>Include detailed notes about conditions</li>
                                        </ul>
                                    </div>
                                </div>
                            </div>
                        </div>
                    `
                },
                {
                    title: "📁 File Management",
                    category: "files",
                    content: `
                        <div class="tip-section">
                            <h4>Managing Project Files</h4>
                            <p>Organize your groundwater data files effectively:</p>
                            
                            <div class="file-tips">
                                <div class="file-tip-card">
                                    <div class="file-tip-icon">📤</div>
                                    <div class="file-tip-content">
                                        <h5>Uploading Files</h5>
                                        <ul>
                                            <li>Click "Choose Files" or drag files directly onto the form</li>
                                            <li>Supported formats: PDF, Excel, Word, Images (JPG, PNG)</li>
                                            <li>Multiple files can be selected at once</li>
                                            <li>Files are automatically associated with your boring data</li>
                                        </ul>
                                    </div>
                                </div>
                                
                                <div class="file-tip-card">
                                    <div class="file-tip-icon">🏷️</div>
                                    <div class="file-tip-content">
                                        <h5>File Organization</h5>
                                        <ul>
                                            <li>Use descriptive filenames: "MW01_WaterLevel_2024-01-15.xlsx"</li>
                                            <li>Group related files in the same boring entry</li>
                                            <li>Add tags to categorize files: "lab-results", "photos", "reports"</li>
                                            <li>Include date and location in filename when possible</li>
                                        </ul>
                                    </div>
                                </div>
                                
                                <div class="file-tip-card">
                                    <div class="file-tip-icon">📦</div>
                                    <div class="file-tip-content">
                                        <h5>Export & Backup</h5>
                                        <ul>
                                            <li>Export individual projects as ZIP files</li>
                                            <li>Use "Backup All" for complete data export</li>
                                            <li>Regular backups prevent data loss</li>
                                            <li>Exported files include all metadata and organization</li>
                                        </ul>
                                    </div>
                                </div>
                            </div>
                        </div>
                    `
                },
                {
                    title: "⌨️ Keyboard Shortcuts",
                    category: "shortcuts",
                    content: `
                        <div class="tip-section">
                            <h4>Keyboard Shortcuts for Efficiency</h4>
                            <p>Speed up your workflow with these keyboard shortcuts:</p>
                            
                            <div class="shortcuts-grid">
                                <div class="shortcut-category">
                                    <h5>🚀 Quick Actions</h5>
                                    <div class="shortcut-list">
                                        <div class="shortcut-item">
                                            <kbd>Ctrl</kbd> + <kbd>N</kbd>
                                            <span>New Project</span>
                                        </div>
                                        <div class="shortcut-item">
                                            <kbd>Ctrl</kbd> + <kbd>S</kbd>
                                            <span>Save Boring Data</span>
                                        </div>
                                        <div class="shortcut-item">
                                            <kbd>Ctrl</kbd> + <kbd>E</kbd>
                                            <span>Export Project</span>
                                        </div>
                                        <div class="shortcut-item">
                                            <kbd>Ctrl</kbd> + <kbd>F</kbd>
                                            <span>Focus Search</span>
                                        </div>
                                    </div>
                                </div>
                                
                                <div class="shortcut-category">
                                    <h5>🛠️ System</h5>
                                    <div class="shortcut-list">
                                        <div class="shortcut-item">
                                            <kbd>F1</kbd>
                                            <span>Help Modal</span>
                                        </div>
                                        <div class="shortcut-item">
                                            <kbd>F2</kbd>
                                            <span>Show Tips</span>
                                        </div>
                                        <div class="shortcut-item">
                                            <kbd>Escape</kbd>
                                            <span>Close Modals</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    `
                },
                {
                    title: "🔧 Troubleshooting",
                    category: "troubleshooting",
                    content: `
                        <div class="tip-section">
                            <h4>Common Issues & Solutions</h4>
                            <p>Quick fixes for common problems:</p>
                            
                            <div class="troubleshooting-list">
                                <div class="trouble-item">
                                    <div class="trouble-icon">🗺️</div>
                                    <div class="trouble-content">
                                        <h5>Map Not Loading</h5>
                                        <ul>
                                            <li>Check your internet connection</li>
                                            <li>Refresh the page (F5)</li>
                                            <li>Try a different browser</li>
                                            <li>Clear browser cache and cookies</li>
                                        </ul>
                                    </div>
                                </div>
                                
                                <div class="trouble-item">
                                    <div class="trouble-icon">📁</div>
                                    <div class="trouble-content">
                                        <h5>Files Not Uploading</h5>
                                        <ul>
                                            <li>Check file size (max 10MB per file)</li>
                                            <li>Verify file format is supported</li>
                                            <li>Try uploading one file at a time</li>
                                            <li>Ensure sufficient browser storage space</li>
                                        </ul>
                                    </div>
                                </div>
                                
                                <div class="trouble-item">
                                    <div class="trouble-icon">🔍</div>
                                    <div class="trouble-content">
                                        <h5>Address Search Not Working</h5>
                                        <ul>
                                            <li>Try different search terms</li>
                                            <li>Use full address format: "Street, City, State"</li>
                                            <li>Click on map as alternative</li>
                                            <li>Enter coordinates manually if known</li>
                                        </ul>
                                    </div>
                                </div>
                                
                                <div class="trouble-item">
                                    <div class="trouble-icon">💾</div>
                                    <div class="trouble-content">
                                        <h5>Data Not Saving</h5>
                                        <ul>
                                            <li>Check that all required fields are filled</li>
                                            <li>Ensure project is selected</li>
                                            <li>Try refreshing and re-entering data</li>
                                            <li>Check browser console for errors (F12)</li>
                                        </ul>
                                    </div>
                                </div>
                            </div>
                        </div>
                    `
                }
            ];
        }
        
        // Show tips modal
        showTipsModal() {
            // Remove any existing modal first
            this.hideTipsModal();
            
            const modal = document.createElement('div');
            modal.id = 'tipsModal';
            modal.className = 'modal-overlay tips-modal show';
            modal.innerHTML = `
                <div class="modal tips-modal-content">
                    <div class="modal-header">
                        <h3 class="modal-title">💡 StrataDesk Tips & Guidance</h3>
                        <button class="modal-close" onclick="tipsSystem.hideTipsModal()">×</button>
                    </div>
                    <div class="modal-body">
                        <div class="tips-navigation">
                            <div class="tips-tabs">
                                ${this.tips.map((tip, index) => `
                                    <button class="tips-tab ${index === 0 ? 'active' : ''}" 
                                            onclick="tipsSystem.showTip(${index})">
                                        ${tip.title}
                                    </button>
                                `).join('')}
                            </div>
                        </div>
                        <div class="tips-content" id="tipsContent">
                            ${this.tips[0].content}
                        </div>
                        <div class="tips-navigation-buttons">
                            <button class="btn-secondary" onclick="tipsSystem.previousTip()">← Previous</button>
                            <span class="tip-counter">1 of ${this.tips.length}</span>
                            <button class="btn-secondary" onclick="tipsSystem.nextTip()">Next →</button>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button class="btn-primary" onclick="tipsSystem.hideTipsModal()">Got it!</button>
                        <button class="btn-secondary" onclick="tipsSystem.showQuickStart()">Quick Start Guide</button>
                    </div>
                </div>
            `;
            
            document.body.appendChild(modal);
            this.isVisible = true;
            this.currentTipIndex = 0;
            
            // Add click outside to close
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    this.hideTipsModal();
                }
            });
            
            console.log('Tips modal shown');
        }
        
        // Hide tips modal
        hideTipsModal() {
            const modal = document.getElementById('tipsModal');
            if (modal) {
                modal.remove();
                this.isVisible = false;
                console.log('Tips modal hidden');
            }
        }
        
        // Show specific tip
        showTip(index) {
            if (index < 0 || index >= this.tips.length) return;
            
            this.currentTipIndex = index;
            const content = document.getElementById('tipsContent');
            const counter = document.querySelector('.tip-counter');
            
            if (content) {
                content.innerHTML = this.tips[index].content;
            }
            
            if (counter) {
                counter.textContent = `${index + 1} of ${this.tips.length}`;
            }
            
            // Update active tab
            document.querySelectorAll('.tips-tab').forEach((tab, i) => {
                tab.classList.toggle('active', i === index);
            });
        }
        
        // Navigate to next tip
        nextTip() {
            const nextIndex = (this.currentTipIndex + 1) % this.tips.length;
            this.showTip(nextIndex);
        }
        
        // Navigate to previous tip
        previousTip() {
            const prevIndex = (this.currentTipIndex - 1 + this.tips.length) % this.tips.length;
            this.showTip(prevIndex);
        }
        
        // Show quick start guide
        showQuickStart() {
            this.showTip(0); // Show first tip (Getting Started)
        }
    }
    
    // Create global tips system
    window.tipsSystem = new TipsSystem();
    
    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            window.tipsSystem.init();
        });
    } else {
        window.tipsSystem.init();
    }
    
    console.log('✅ Tips System loaded');
    
})();