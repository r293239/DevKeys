class UniversalCodingKeyboard {
  constructor() {
    this.enabled = false;
    this.keyMappings = {};
    this.activationKey = 'ControlRight';
    this.showStatus = true;
    this.excludedSites = [];
    this.isActive = false;
    this.currentUrl = '';
    
    this.init();
  }

  async init() {
    this.currentUrl = window.location.href;
    
    if (this.isExcludedSite()) {
      console.log('Coding Keyboard: Site excluded');
      return;
    }
    
    await this.loadSettings();
    this.setupEventListeners();
    if (this.showStatus) {
      this.createStatusIndicator();
    }
  }

  isExcludedSite() {
    return this.excludedSites.some(site => this.currentUrl.startsWith(site));
  }

  async loadSettings() {
    return new Promise((resolve) => {
      chrome.storage.sync.get([
        'keyMappings', 
        'enabled', 
        'activationKey', 
        'showStatus',
        'excludedSites'
      ], (result) => {
        this.keyMappings = result.keyMappings || {};
        this.enabled = result.enabled !== false;
        this.activationKey = result.activationKey || 'ControlRight';
        this.showStatus = result.showStatus !== false;
        this.excludedSites = result.excludedSites || [];
        
        if (this.showStatus && !this.statusIndicator) {
          this.createStatusIndicator();
        } else if (!this.showStatus && this.statusIndicator) {
          this.removeStatusIndicator();
        }
        
        this.updateStatusIndicator();
        resolve();
      });
    });
  }

  setupEventListeners() {
    // Remove existing listeners to prevent duplicates
    document.removeEventListener('keydown', this.boundKeyDown);
    document.removeEventListener('keyup', this.boundKeyUp);
    
    // Create bound functions
    this.boundKeyDown = this.handleKeyDown.bind(this);
    this.boundKeyUp = this.handleKeyUp.bind(this);
    
    // Add event listeners
    document.addEventListener('keydown', this.boundKeyDown, true);
    document.addEventListener('keyup', this.boundKeyUp, true);

    // Listen for settings changes
    chrome.storage.onChanged.addListener((changes) => {
      if (changes.enabled) {
        this.enabled = changes.enabled.newValue;
        this.updateStatusIndicator();
      }
      if (changes.keyMappings) {
        this.keyMappings = changes.keyMappings.newValue;
      }
      if (changes.activationKey) {
        this.activationKey = changes.activationKey.newValue;
      }
      if (changes.showStatus) {
        this.showStatus = changes.showStatus.newValue;
        if (this.showStatus && !this.statusIndicator) {
          this.createStatusIndicator();
        } else if (!this.showStatus && this.statusIndicator) {
          this.removeStatusIndicator();
        }
      }
      if (changes.excludedSites) {
        this.excludedSites = changes.excludedSites.newValue;
      }
    });

    // Handle page visibility changes
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.isActive = false;
        this.updateStatusIndicator();
      }
    });
  }

  handleKeyDown(e) {
    if (!this.enabled || this.isExcludedSite()) return;

    // Check for activation key
    if (e.code === this.activationKey) {
      this.isActive = true;
      this.updateStatusIndicator();
      return;
    }

    // Apply key mappings when active
    if (this.isActive && this.keyMappings[e.code]) {
      e.preventDefault();
      e.stopPropagation();
      this.insertText(this.keyMappings[e.code]);
    }
  }

  handleKeyUp(e) {
    if (e.code === this.activationKey) {
      this.isActive = false;
      this.updateStatusIndicator();
    }
  }

  insertText(text) {
    const activeElement = document.activeElement;
    
    if (activeElement && this.isEditable(activeElement)) {
      try {
        // For contenteditable elements
        if (activeElement.isContentEditable || activeElement.getAttribute('contenteditable') === 'true') {
          const selection = window.getSelection();
          if (selection.rangeCount > 0) {
            const range = selection.getRangeAt(0);
            range.deleteContents();
            const textNode = document.createTextNode(text);
            range.insertNode(textNode);
            range.setStartAfter(textNode);
            range.setEndAfter(textNode);
            selection.removeAllRanges();
            selection.addRange(range);
          }
        } 
        // For input and textarea elements
        else if (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA') {
          const start = activeElement.selectionStart;
          const end = activeElement.selectionEnd;
          const value = activeElement.value;
          
          activeElement.value = value.substring(0, start) + text + value.substring(end);
          activeElement.selectionStart = activeElement.selectionEnd = start + text.length;
        }
        
        // Trigger input event for React and other frameworks
        const event = new Event('input', { bubbles: true });
        activeElement.dispatchEvent(event);
        
        // Also trigger change event for good measure
        const changeEvent = new Event('change', { bubbles: true });
        activeElement.dispatchEvent(changeEvent);
        
      } catch (error) {
        console.warn('Coding Keyboard: Error inserting text', error);
      }
    }
  }

  isEditable(element) {
    // Skip if element is hidden or disabled
    if (element.disabled || element.readOnly || element.offsetParent === null) {
      return false;
    }
    
    return (
      element.tagName === 'TEXTAREA' ||
      (element.tagName === 'INPUT' && 
        (!element.type || 
         element.type === 'text' || 
         element.type === 'search' || 
         element.type === 'email' ||
         element.type === 'url' ||
         element.type === 'password')) ||
      element.isContentEditable ||
      element.getAttribute('contenteditable') === 'true' ||
      // Common code editor classes
      element.classList.contains('ace_text-input') ||
      element.classList.contains('monaco-inputbox') ||
      element.classList.contains('cm-content') ||
      element.classList.contains('CodeMirror-code') ||
      element.classList.contains('js-file-editor-textarea') ||
      element.classList.contains('comment-form-textarea') ||
      // Framework-specific
      element.classList.contains('ql-editor') || // Quill
      element.classList.contains('notion-cursor-listener') // Notion
    );
  }

  createStatusIndicator() {
    if (this.statusIndicator) return;
    
    this.statusIndicator = document.createElement('div');
    this.statusIndicator.className = 'coding-keyboard-status';
    this.statusIndicator.innerHTML = `
      <div class="status-indicator">
        <span class="status-text">CodeKeys: </span>
        <span class="status-value">OFF</span>
      </div>
    `;
    
    // Add some styles dynamically
    this.statusIndicator.style.cssText = `
      position: fixed;
      top: 10px;
      right: 10px;
      z-index: 10000;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      font-size: 12px;
      pointer-events: none;
    `;
    
    document.body.appendChild(this.statusIndicator);
    this.updateStatusIndicator();
  }

  removeStatusIndicator() {
    if (this.statusIndicator) {
      this.statusIndicator.remove();
      this.statusIndicator = null;
    }
  }

  updateStatusIndicator() {
    if (!this.statusIndicator) return;
    
    const statusValue = this.statusIndicator.querySelector('.status-value');
    if (!statusValue) return;
    
    if (this.enabled && this.isActive) {
      statusValue.textContent = 'ACTIVE';
      statusValue.style.color = '#3fb950';
      this.statusIndicator.style.opacity = '1';
    } else if (this.enabled) {
      statusValue.textContent = 'READY';
      statusValue.style.color = '#d29922';
      this.statusIndicator.style.opacity = '0.7';
    } else {
      statusValue.textContent = 'OFF';
      statusValue.style.color = '#f85149';
      this.statusIndicator.style.opacity = '0.5';
    }
  }
}

// Initialize when DOM is ready
let codingKeyboard;

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    codingKeyboard = new UniversalCodingKeyboard();
  });
} else {
  codingKeyboard = new UniversalCodingKeyboard();
}

// Handle page changes (SPA navigation)
let lastUrl = location.href;
new MutationObserver(() => {
  const url = location.href;
  if (url !== lastUrl) {
    lastUrl = url;
    // Reinitialize for SPA navigation
    setTimeout(() => {
      if (codingKeyboard) {
        codingKeyboard.currentUrl = url;
        if (codingKeyboard.isExcludedSite() && codingKeyboard.statusIndicator) {
          codingKeyboard.removeStatusIndicator();
        } else if (!codingKeyboard.isExcludedSite() && codingKeyboard.showStatus && !codingKeyboard.statusIndicator) {
          codingKeyboard.createStatusIndicator();
        }
      }
    }, 100);
  }
}).observe(document, { subtree: true, childList: true });
