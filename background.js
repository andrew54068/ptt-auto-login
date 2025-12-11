// Listen for messages from content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getCredentials') {
    chrome.storage.sync.get(['username', 'password', 'autoLogin'], (result) => {
      sendResponse(result);
    });
    return true; // Keep the message channel open for async response
  }

  if (request.action === 'getCacheSettings') {
    chrome.storage.sync.get(['cacheSize'], (result) => {
      sendResponse({ cacheSize: result.cacheSize || 50 });
    });
    return true;
  }

  if (request.action === 'getImageCache') {
    chrome.storage.local.get(['imageCache'], (result) => {
      sendResponse({ imageCache: result.imageCache || {} });
    });
    return true;
  }

  if (request.action === 'setImageCache') {
    chrome.storage.local.set({ imageCache: request.cache }, () => {
      sendResponse({ success: true });
    });
    return true;
  }

  if (request.action === 'clearImageCache') {
    chrome.storage.local.remove('imageCache', () => {
      sendResponse({ success: true });
    });
    return true;
  }
});

// Initialize storage on install
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.sync.get(['cacheSize'], (result) => {
    if (!result.cacheSize) {
      chrome.storage.sync.set({ cacheSize: 50 });
    }
  });
});
