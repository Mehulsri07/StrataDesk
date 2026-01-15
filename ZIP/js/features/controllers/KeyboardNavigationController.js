// Keyboard Navigation Controller - Handles keyboard interactions and accessibility
class KeyboardNavigationController {
  constructor(inputElement, dropdownController) {
    this.input = inputElement;
    this.dropdown = dropdownController;
    this.highlightedIndex = -1;
    this.onSearch = null;
    this.onSelect = null;
    this.onCancel = null;
    
    this.setupKeyboardHandlers();
    this.setupAccessibility();
  }

  // Setup keyboard event handlers
  setupKeyboardHandlers() {
    this.input.addEventListener('keydown', (e) => {
      this.handleKeyDown(e);
    });

    // Handle input focus
    this.input.addEventListener('focus', () => {
      this.input.setAttribute('aria-expanded', 'false');
    });

    this.input.addEventListener('blur', (e) => {
      // Delay hiding dropdown to allow for option clicks
      setTimeout(() => {
        if (!this.dropdown.dropdown.contains(document.activeElement)) {
          this.dropdown.hide();
          this.resetHighlight();
        }
      }, 150);
    });
  }

  // Setup ARIA accessibility attributes
  setupAccessibility() {
    // Set up ARIA attributes on input
    this.input.setAttribute('role', 'combobox');
    this.input.setAttribute('aria-autocomplete', 'list');
    this.input.setAttribute('aria-expanded', 'false');
    this.input.setAttribute('aria-haspopup', 'listbox');
    
    // Set up ARIA attributes on dropdown
    this.dropdown.dropdown.setAttribute('role', 'listbox');
    this.dropdown.dropdown.setAttribute('aria-label', 'Address search results');
    
    // Generate unique IDs for ARIA relationships
    const dropdownId = 'address-dropdown-' + Math.random().toString(36).substr(2, 9);
    this.dropdown.dropdown.id = dropdownId;
    this.input.setAttribute('aria-controls', dropdownId);
  }

  // Handle keyboard navigation
  handleKeyDown(e) {
    const isDropdownOpen = this.dropdown.isOpen();
    const optionCount = this.dropdown.getOptionCount();

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        if (isDropdownOpen && optionCount > 0) {
          this.moveHighlight(1, optionCount);
        } else if (this.onSearch) {
          // Trigger search if dropdown not open
          this.onSearch(this.input.value.trim());
        }
        break;

      case 'ArrowUp':
        e.preventDefault();
        if (isDropdownOpen && optionCount > 0) {
          this.moveHighlight(-1, optionCount);
        }
        break;

      case 'Enter':
        e.preventDefault();
        if (isDropdownOpen && this.highlightedIndex >= 0) {
          // Select highlighted option
          const result = this.dropdown.results[this.highlightedIndex];
          if (result && this.onSelect) {
            this.onSelect(result, this.highlightedIndex);
          }
        } else if (this.input.value.trim() && this.onSearch) {
          // Perform search if no option highlighted
          this.onSearch(this.input.value.trim());
        }
        break;

      case 'Escape':
        e.preventDefault();
        if (isDropdownOpen) {
          this.dropdown.hide();
          this.resetHighlight();
          this.input.focus();
        } else if (this.onCancel) {
          this.onCancel();
        }
        break;

      case 'Tab':
        // Allow normal tab behavior but close dropdown
        if (isDropdownOpen) {
          this.dropdown.hide();
          this.resetHighlight();
        }
        break;

      case 'Home':
        if (isDropdownOpen && optionCount > 0) {
          e.preventDefault();
          this.setHighlight(0);
        }
        break;

      case 'End':
        if (isDropdownOpen && optionCount > 0) {
          e.preventDefault();
          this.setHighlight(optionCount - 1);
        }
        break;

      case 'PageDown':
        if (isDropdownOpen && optionCount > 0) {
          e.preventDefault();
          const newIndex = Math.min(this.highlightedIndex + 3, optionCount - 1);
          this.setHighlight(newIndex);
        }
        break;

      case 'PageUp':
        if (isDropdownOpen && optionCount > 0) {
          e.preventDefault();
          const newIndex = Math.max(this.highlightedIndex - 3, 0);
          this.setHighlight(newIndex);
        }
        break;
    }
  }

  // Move highlight by delta
  moveHighlight(delta, optionCount) {
    let newIndex = this.highlightedIndex + delta;
    
    // Wrap around behavior
    if (newIndex >= optionCount) {
      newIndex = 0;
    } else if (newIndex < 0) {
      newIndex = optionCount - 1;
    }
    
    this.setHighlight(newIndex);
  }

  // Set highlight to specific index
  setHighlight(index) {
    this.highlightedIndex = index;
    this.dropdown.highlightOption(index);
    
    // Update ARIA attributes
    this.updateAriaActiveDescendant();
    
    // Trigger preview if callback is set
    if (this.dropdown.onPreview && index >= 0) {
      const result = this.dropdown.results[index];
      this.dropdown.onPreview(result, index, 'keyboard');
    }
  }

  // Reset highlight
  resetHighlight() {
    this.highlightedIndex = -1;
    this.dropdown.highlightOption(-1);
    this.updateAriaActiveDescendant();
  }

  // Update ARIA active descendant
  updateAriaActiveDescendant() {
    if (this.highlightedIndex >= 0) {
      const options = this.dropdown.dropdown.querySelectorAll('.address-option');
      const activeOption = options[this.highlightedIndex];
      if (activeOption) {
        // Ensure option has an ID
        if (!activeOption.id) {
          activeOption.id = 'address-option-' + this.highlightedIndex;
        }
        this.input.setAttribute('aria-activedescendant', activeOption.id);
      }
    } else {
      this.input.removeAttribute('aria-activedescendant');
    }
  }

  // Handle dropdown state changes
  onDropdownShow() {
    this.input.setAttribute('aria-expanded', 'true');
    this.resetHighlight();
  }

  onDropdownHide() {
    this.input.setAttribute('aria-expanded', 'false');
    this.resetHighlight();
  }

  // Set callback for search trigger
  onSearchTrigger(callback) {
    this.onSearch = callback;
  }

  // Set callback for option selection
  onOptionSelect(callback) {
    this.onSelect = callback;
  }

  // Set callback for cancel action
  onCancelAction(callback) {
    this.onCancel = callback;
  }

  // Get current highlighted index
  getHighlightedIndex() {
    return this.highlightedIndex;
  }

  // Focus management
  focusInput() {
    this.input.focus();
  }

  // Announce to screen readers
  announceToScreenReader(message) {
    const announcement = document.createElement('div');
    announcement.setAttribute('aria-live', 'polite');
    announcement.setAttribute('aria-atomic', 'true');
    announcement.className = 'sr-only';
    announcement.textContent = message;
    
    document.body.appendChild(announcement);
    
    // Remove after announcement
    setTimeout(() => {
      document.body.removeChild(announcement);
    }, 1000);
  }

  // Handle results update
  onResultsUpdate(results) {
    this.resetHighlight();
    
    // Announce results to screen readers
    if (results && results.length > 0) {
      this.announceToScreenReader(`${results.length} locations found. Use arrow keys to navigate.`);
    } else {
      this.announceToScreenReader('No locations found.');
    }
  }

  // Cleanup
  destroy() {
    // Remove event listeners
    this.input.removeEventListener('keydown', this.handleKeyDown);
    this.input.removeEventListener('focus', this.onFocus);
    this.input.removeEventListener('blur', this.onBlur);
  }
}

// Export for use in other modules
window.KeyboardNavigationController = KeyboardNavigationController;