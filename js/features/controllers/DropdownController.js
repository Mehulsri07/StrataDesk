// Dropdown Controller - Handles dropdown UI interactions and animations
class DropdownController {
  constructor(dropdownElement, inputElement) {
    this.dropdown = dropdownElement;
    this.input = inputElement;
    this.isVisible = false;
    this.results = [];
    this.onSelect = null;
    this.onPreview = null;
    
    this.setupEventListeners();
  }

  // Setup event listeners
  setupEventListeners() {
    // Click outside to close
    document.addEventListener('click', (e) => {
      if (!this.dropdown.contains(e.target) && e.target !== this.input) {
        this.hide();
      }
    });

    // Handle option clicks
    this.dropdown.addEventListener('click', (e) => {
      const option = e.target.closest('.address-option');
      if (option && this.onSelect) {
        const index = parseInt(option.dataset.index);
        this.onSelect(this.results[index], index);
      }
    });

    // Handle option hover for preview
    this.dropdown.addEventListener('mouseover', (e) => {
      const option = e.target.closest('.address-option');
      if (option && this.onPreview) {
        const index = parseInt(option.dataset.index);
        this.highlightOption(index);
        this.onPreview(this.results[index], index, 'hover');
      }
    });

    this.dropdown.addEventListener('mouseleave', () => {
      if (this.onPreview) {
        this.onPreview(null, -1, 'leave');
      }
    });
  }

  // Show dropdown with results
  show(results) {
    this.results = results;
    this.render();
    
    if (!this.isVisible) {
      this.dropdown.classList.add('show');
      this.dropdown.style.opacity = '0';
      this.dropdown.style.transform = 'translateY(-10px)';
      
      // Smooth animation
      requestAnimationFrame(() => {
        this.dropdown.style.transition = 'opacity 0.2s ease, transform 0.2s ease';
        this.dropdown.style.opacity = '1';
        this.dropdown.style.transform = 'translateY(0)';
      });
      
      this.isVisible = true;
    } else {
      // Just update content if already visible
      this.dropdown.style.opacity = '1';
    }
  }

  // Hide dropdown
  hide() {
    if (!this.isVisible) return;
    
    this.dropdown.style.transition = 'opacity 0.15s ease, transform 0.15s ease';
    this.dropdown.style.opacity = '0';
    this.dropdown.style.transform = 'translateY(-5px)';
    
    setTimeout(() => {
      this.dropdown.classList.remove('show');
      this.dropdown.innerHTML = '';
      this.isVisible = false;
      this.results = [];
    }, 150);
  }

  // Render dropdown content
  render() {
    if (!this.results || this.results.length === 0) {
      this.dropdown.innerHTML = '<div class="address-no-results">No locations found</div>';
      return;
    }

    let html = '';
    this.results.forEach((result, index) => {
      html += this.renderOption(result, index);
    });

    this.dropdown.innerHTML = html;
  }

  // Render individual option
  renderOption(result, index) {
    const typeLabel = this.getLocationTypeLabel(result.type);
    const confidenceClass = `confidence-${result.confidence}`;
    const confidenceIcon = this.getConfidenceIcon(result.confidence);
    
    return `
      <div class="address-option ${confidenceClass}" 
           data-index="${index}" 
           data-lat="${result.lat}" 
           data-lng="${result.lng}" 
           data-name="${result.name}"
           role="option"
           aria-selected="false">
        <div class="address-option-header">
          <div class="address-option-name">
            ${typeLabel ? `<span class="address-option-type">${typeLabel}</span>` : ''}
            <span class="address-option-text">${result.matchedText || this.truncateText(result.name, 60)}</span>
          </div>
          <div class="address-option-confidence">
            ${confidenceIcon}
          </div>
        </div>
        <div class="address-option-details">
          📍 ${result.lat.toFixed(6)}, ${result.lng.toFixed(6)}
          ${result.importance ? `• Score: ${(result.importance * 100).toFixed(0)}` : ''}
        </div>
      </div>
    `;
  }

  // Highlight specific option
  highlightOption(index) {
    const options = this.dropdown.querySelectorAll('.address-option');
    options.forEach((option, i) => {
      if (i === index) {
        option.classList.add('highlighted');
        option.setAttribute('aria-selected', 'true');
        
        // Ensure highlighted option is visible
        option.scrollIntoView({
          block: 'nearest',
          behavior: 'smooth'
        });
      } else {
        option.classList.remove('highlighted');
        option.setAttribute('aria-selected', 'false');
      }
    });
  }

  // Get currently highlighted option index
  getHighlightedIndex() {
    const highlighted = this.dropdown.querySelector('.address-option.highlighted');
    return highlighted ? parseInt(highlighted.dataset.index) : -1;
  }

  // Get total number of options
  getOptionCount() {
    return this.results.length;
  }

  // Show loading state
  showLoading() {
    this.dropdown.innerHTML = `
      <div class="address-loading">
        <div class="loading-spinner"></div>
        <span>Searching locations...</span>
      </div>
    `;
    
    if (!this.isVisible) {
      this.dropdown.classList.add('show');
      this.isVisible = true;
    }
  }

  // Show error state
  showError(message) {
    this.dropdown.innerHTML = `
      <div class="address-error">
        <span class="error-icon">⚠️</span>
        <span>${message}</span>
      </div>
    `;
    
    if (!this.isVisible) {
      this.dropdown.classList.add('show');
      this.isVisible = true;
    }
  }

  // Show offline state
  showOffline() {
    this.dropdown.innerHTML = `
      <div class="address-offline">
        <span class="offline-icon">📡</span>
        <span>Offline - Click on map to set location</span>
      </div>
    `;
    
    if (!this.isVisible) {
      this.dropdown.classList.add('show');
      this.isVisible = true;
    }
  }

  // Get location type label with emoji
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

  // Get confidence icon
  getConfidenceIcon(confidence) {
    const iconMap = {
      'high': '🟢',
      'medium': '🟡',
      'low': '🟠'
    };
    return iconMap[confidence] || '⚪';
  }

  // Truncate text for display
  truncateText(text, maxLength) {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength - 3) + '...';
  }

  // Check if dropdown is visible
  isOpen() {
    return this.isVisible;
  }

  // Set callback for option selection
  onOptionSelect(callback) {
    this.onSelect = callback;
  }

  // Set callback for option preview
  onOptionPreview(callback) {
    this.onPreview = callback;
  }

  // Cleanup
  destroy() {
    this.hide();
    // Event listeners will be cleaned up when elements are removed
  }
}

// Export for use in other modules
window.DropdownController = DropdownController;