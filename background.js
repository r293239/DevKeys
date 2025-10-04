// Background service worker
chrome.runtime.onInstalled.addListener(() => {
  console.log('Universal Coding Keyboard extension installed');
  
  // Set default key mappings
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
  });
});

// Handle extension activation/deactivation
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'toggleEnabled') {
    chrome.storage.sync.set({ enabled: request.enabled });
  }
  if (request.action === 'updateSettings') {
    chrome.storage.sync.set(request.settings);
  }
});

// Get current settings
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getSettings') {
    chrome.storage.sync.get(['enabled', 'keyMappings', 'activationKey', 'showStatus', 'excludedSites'], (result) => {
      sendResponse(result);
    });
    return true; // Will respond asynchronously
  }
});
