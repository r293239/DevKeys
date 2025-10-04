document.addEventListener('DOMContentLoaded', () => {
  const toggleEnabled = document.getElementById('toggleEnabled');
  const activationKey = document.getElementById('activationKey');
  const showStatus = document.getElementById('showStatus');
  const excludedSites = document.getElementById('excludedSites');
  const mappingsList = document.getElementById('mappingsList');
  const saveSettings = document.getElementById('saveSettings');
  const resetSettings = document.getElementById('resetSettings');
  const currentActivationKey = document.getElementById('currentActivationKey');

  let currentSettings = {};

  // Load current settings
  loadSettings();

  // Event listeners
  toggleEnabled.addEventListener('change', updateActivationKeyDisplay);
  activationKey.addEventListener('change', updateActivationKeyDisplay);
  
  saveSettings.addEventListener('click', saveCurrentSettings);
  resetSettings.addEventListener('click', resetToDefaults);

  function loadSettings() {
    chrome.runtime.sendMessage({ action: 'getSettings' }, (response) => {
      currentSettings = response;
      
      // Update UI with current settings
      toggleEnabled.checked = currentSettings.enabled !== false;
      activationKey.value = currentSettings.activationKey || 'ControlRight';
      showStatus.checked = currentSettings.showStatus !== false;
      excludedSites.value = (currentSettings.excludedSites || []).join('\n');
      
      displayKeyMappings(currentSettings.keyMappings || {});
      updateActivationKeyDisplay();
    });
  }

  function updateActivationKeyDisplay() {
    currentActivationKey.textContent = activationKey.value;
  }

  function displayKeyMappings(mappings) {
    const mappingDisplay = {
      'semicolon': '; → ;',
      'quote': "' → \"",
      'backquote': '` → `',
      'bracketLeft': '[ → {',
      'bracketRight': '] → }',
      'slash': '/ → /',
      'backslash': '\\ → \\',
      'equal': '= → =',
      'minus': '- → -',
      'comma': ', → ,',
      'period': '. → .',
      'KeyP': 'P → console.log();',
      'KeyF': 'F → function() {}',
      'KeyA': 'A → => {}'
    };
    
    mappingsList.innerHTML = '';
    
    Object.entries(mappings).forEach(([key, symbol]) => {
      const item = document.createElement('div');
      item.className = 'mapping-item';
      item.innerHTML = `
        <span class="key">${mappingDisplay[key] || key}</span>
        <span class="symbol">${symbol}</span>
      `;
      mappingsList.appendChild(item);
    });
  }

  function saveCurrentSettings() {
    const settings = {
      enabled: toggleEnabled.checked,
      activationKey: activationKey.value,
      showStatus: showStatus.checked,
      excludedSites: excludedSites.value.split('\n').filter(site => site.trim()),
      keyMappings: currentSettings.keyMappings || {}
    };

    chrome.runtime.sendMessage({
      action: 'updateSettings',
      settings: settings
    }, () => {
      // Show save confirmation
      const originalText = saveSettings.textContent;
      saveSettings.textContent = 'Saved!';
      saveSettings.disabled = true;
      
      setTimeout(() => {
        saveSettings.textContent = originalText;
        saveSettings.disabled = false;
      }, 1000);
    });
  }

  function resetToDefaults() {
    if (confirm('Are you sure you want to reset all settings to defaults?')) {
      chrome.storage.sync.set({
        keyMappings: {
          'semicolon': ';',
          'quote': '"',
          'backquote': '`',
          'bracketLeft': '{',
          'bracketRight': '}',
          'slash': '/',
          'backslash': '\\',
          'equal': '=',
          'minus': '-',
          'comma': ',',
          'period': '.',
          'KeyP': 'console.log();',
          'KeyF': 'function() {}',
          'KeyA': '=> {}'
        },
        enabled: true,
        activationKey: 'ControlRight',
        showStatus: true,
        excludedSites: [
          'chrome://',
          'chrome-extension://',
          'moz-extension://'
        ]
      }, () => {
        loadSettings(); // Reload settings to update UI
      });
    }
  }
});
