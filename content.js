// ==================== Auto Login Functionality ====================

class PTTAutoLogin {
  constructor() {
    this.initialized = false;
    this.debugMode = true; // Set to false to disable debug mode
    this.preventSubmit = false; // Set to false to actually submit (press Enter)
    this.eventType = 'keypress'; // Options: 'keydown', 'keypress', or 'all'
    this.useBulkInput = true; // Try to paste all at once (faster)
    this.typingDelay = 20; // Milliseconds between characters (if bulk fails)
  }

  async init() {
    if (this.initialized) return;
    this.initialized = true;

    // Debug: Add event listener to verify events are received
    if (this.debugMode) {
      document.addEventListener('keypress', (e) => {
        console.log(`    ← Received keypress: key="${e.key}", charCode=${e.charCode}, keyCode=${e.keyCode}`);
      }, true);
    }

    // Get credentials from storage
    const credentials = await this.getCredentials();

    if (credentials.autoLogin && credentials.username && credentials.password) {
      this.attemptLogin(credentials);
    }
  }

  async getCredentials() {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage({ action: 'getCredentials' }, (response) => {
        resolve(response || {});
      });
    });
  }

  attemptLogin(credentials) {
    // PTT web terminal is a terminal emulator interface
    // Guard to prevent double execution
    if (this.loginInProgress) {
      console.log('%c[PTT Auto-Login] Login already in progress, skipping...', 'color: orange');
      return;
    }

    const checkLoginPrompt = () => {
      // Guard: strictly check if login is already in progress
      if (this.loginInProgress) {
        return true;
      }

      // Look for the login prompt text: "請輸入代號，或以 guest 參觀，或以 new 註冊:"
      const bodyText = document.body.innerText || document.body.textContent;

      if (bodyText.includes('請輸入代號') ||
        bodyText.includes('Please enter ID') ||
        bodyText.includes('guest 參觀')) {
        console.log('%c[PTT Auto-Login] Login prompt detected', 'color: green; font-weight: bold');

        // Double check to be absolutely sure
        if (this.loginInProgress) return true;
        this.loginInProgress = true;

        // Find the terminal container - could be the main div, body, or a specific container
        const terminalContainer = document.querySelector('.main') ||
          document.querySelector('#mainContainer') ||
          document.body;

        if (terminalContainer) {
          console.log('%c[PTT Auto-Login] Terminal container found:', 'color: blue', terminalContainer.className || 'body');
          console.log('%c[PTT Auto-Login] Username to type:', 'color: blue', `"${credentials.username}" (length: ${credentials.username.length})`);

          // Give it a moment for the terminal to be ready
          setTimeout(() => {
            this.inputText(terminalContainer, credentials.username, 'username', () => {
              console.log('%c[PTT Auto-Login] ▶ Username callback executed', 'color: magenta; font-weight: bold');
              console.log('%c[PTT Auto-Login] Username input completed, waiting for password prompt...', 'color: orange');

              // After username, wait for password prompt
              setTimeout(() => {
                // Check if password prompt appeared
                const currentText = document.body.innerText || document.body.textContent;

                // Prioritize checking for strict Password prompt to avoid false positives
                // "請輸入您的密碼:" or "Please enter your password"
                if (currentText.includes('請輸入您的密碼') ||
                  currentText.includes('Please enter your password') ||
                  (currentText.includes('密碼') && currentText.includes(':'))) {

                  console.log('%c[PTT Auto-Login] Password prompt detected', 'color: green; font-weight: bold');
                  console.log('%c[PTT Auto-Login] Password length:', 'color: blue', credentials.password.length);

                  this.inputText(terminalContainer, credentials.password, 'password', () => {
                    console.log('%c[PTT Auto-Login] ▶ Password callback executed', 'color: magenta; font-weight: bold');
                    console.log('%c[PTT Auto-Login] Password input completed', 'color: orange');
                    if (this.preventSubmit) {
                      console.log('%c[PTT Auto-Login] ⚠️ SUBMIT PREVENTED (preventSubmit = true)', 'color: red; font-weight: bold; font-size: 14px');
                    } else {
                      console.log('%c[PTT Auto-Login] ✓ Login submitted', 'color: green; font-weight: bold');
                    }
                  });
                }
                // Only if Password prompt is NOT found, check if we are stuck at ID prompt
                else if (currentText.includes('請輸入代號') || currentText.includes('Please enter ID')) {
                  console.log('%c[PTT Auto-Login] ⚠️ Still at ID prompt/screen (and no password prompt detected). Avoiding password entry.', 'color: red; font-weight: bold');
                  // OPTIONAL: We could try pressing Enter again here if we wanted to be persistent, 
                  // but for now, we'll just log it.
                  return;
                }
                else {
                  // Fallback: Check for loose password match if strict failed but we are DEFINITELY not on ID screen?
                  // No, safer to be strict.
                  console.log('%c[PTT Auto-Login] ⚠️ Password prompt NOT detected', 'color: red');
                  console.log('Current page text:', currentText.substring(0, 500));
                }
              }, 1000); // Slight increase to ensure screen update
            });
          }, 300);

          return true;
        }
      }

      return false;
    };

    // Try immediately
    if (!checkLoginPrompt()) {
      // If not found, wait for page to load and try again
      const retryTimeout = setTimeout(() => {
        checkLoginPrompt();
      }, 1000);

      // Also observe for dynamic content
      const observer = new MutationObserver(() => {
        if (checkLoginPrompt()) {
          observer.disconnect();
          clearTimeout(retryTimeout); // Clear the timeout if observer succeeded first
        }
      });

      observer.observe(document.body, {
        childList: true,
        subtree: true
      });

      // Stop observing after 10 seconds
      setTimeout(() => {
        observer.disconnect();
      }, 10000);
    }
  }

  inputText(container, text, fieldType, callback) {
    // Try bulk input first if enabled
    if (this.useBulkInput && this.tryBulkInput(container, text, fieldType, callback)) {
      return;
    }

    // Fall back to character-by-character typing
    this.typeInTerminal(container, text, fieldType, callback);
  }

  tryBulkInput(container, text, fieldType, callback) {
    const displayText = fieldType === 'password' ? '*'.repeat(text.length) : text;

    try {
      if (this.debugMode) {
        console.log(`%c[PTT Auto-Login] Attempting bulk input for ${fieldType}:`, 'color: cyan', displayText);
      }

      // Try to find a focused input or textarea
      let targetElement = document.activeElement;

      // If nothing is focused or it's the body, try to find an input
      if (!targetElement || targetElement === document.body) {
        targetElement = document.querySelector('input[type="text"]') ||
          document.querySelector('input:not([type])') ||
          document.querySelector('textarea') ||
          container;
      }

      // Try using clipboard paste simulation
      const pasteEvent = new ClipboardEvent('paste', {
        bubbles: true,
        cancelable: true,
        clipboardData: new DataTransfer()
      });

      // This might not work due to security restrictions, so we'll fall back
      if (this.debugMode) {
        console.log(`%c[PTT Auto-Login] ⚠️ Bulk input not reliable for web terminals, using fast typing instead`, 'color: orange');
      }

      return false; // Return false to use fast typing instead

    } catch (error) {
      if (this.debugMode) {
        console.log(`%c[PTT Auto-Login] Bulk input failed: ${error.message}`, 'color: orange');
      }
      return false;
    }
  }

  typeInTerminal(container, text, fieldType, callback) {
    // Type each character with a small delay to simulate real typing
    let index = 0;
    const displayText = fieldType === 'password' ? '*'.repeat(text.length) : text;
    const eventsSent = []; // Track all events sent
    let callbackExecuted = false; // Prevent double callback

    if (this.debugMode) {
      console.log(`%c[PTT Auto-Login] Starting to type ${fieldType}:`, 'color: cyan', displayText);
      console.log(`%c[PTT Auto-Login] Text length: ${text.length} characters`, 'color: cyan');
    }

    const typeNextChar = () => {
      if (index < text.length) {
        const char = text[index];
        const displayChar = fieldType === 'password' ? '*' : char;

        if (this.debugMode) {
          console.log(`  [${index + 1}/${text.length}] Typing: "${displayChar}" (charCode: ${char.charCodeAt(0)}) at index ${index}`);
        }

        // Track this event
        eventsSent.push({ index, char, type: this.eventType });

        // Simulate keyboard events for this character
        switch (this.eventType) {
          case 'keydown':
            // Only send keydown (cleanest, most terminals use this)
            this.sendKeyEvent(container, 'keydown', char);
            break;
          case 'keypress':
            // Only send keypress
            this.sendKeyEvent(container, 'keypress', char);
            break;
          case 'all':
            // Send all three event types
            this.sendKeyEvent(container, 'keydown', char);
            this.sendKeyEvent(container, 'keypress', char);
            this.sendKeyEvent(container, 'keyup', char);
            break;
        }

        index++;
        setTimeout(typeNextChar, this.typingDelay); // Configurable delay
      } else {
        // All characters typed
        if (this.debugMode) {
          console.log(`%c[PTT Auto-Login] ✓ Finished typing ${fieldType}`, 'color: green');
          console.log(`%c[PTT Auto-Login] Total events sent: ${eventsSent.length}`, 'color: green');
          console.log(`%c[PTT Auto-Login] Expected length: ${text.length}`, 'color: green');

          if (eventsSent.length !== text.length) {
            console.log(`%c[PTT Auto-Login] ⚠️ WARNING: Event count mismatch!`, 'color: red; font-weight: bold');
          }
        }

        // After typing all characters, press Enter (unless prevented)
        setTimeout(() => {
          if (!this.preventSubmit) {
            if (this.debugMode) {
              console.log(`%c[PTT Auto-Login] Pressing Enter for ${fieldType}`, 'color: yellow');
            }

            // FORCE FULL ENTER SEQUENCE: keydown -> keypress -> keyup
            // This is the most robust way to ensure the terminal picks it up.
            this.sendKeyEvent(container, 'keydown', 'Enter');
            this.sendKeyEvent(container, 'keypress', 'Enter');
            this.sendKeyEvent(container, 'keyup', 'Enter');

          } else {
            if (this.debugMode) {
              console.log(`%c[PTT Auto-Login] ⏸️  Skipping Enter press for ${fieldType} (preventSubmit = true)`, 'color: orange');
            }
          }

          if (callback && !callbackExecuted) {
            callbackExecuted = true;
            if (this.debugMode) {
              console.log(`%c[PTT Auto-Login] Executing callback for ${fieldType}`, 'color: magenta');
            }
            setTimeout(callback, 100);
          } else if (callbackExecuted) {
            console.log(`%c[PTT Auto-Login] ⚠️ Callback already executed for ${fieldType}, skipping!`, 'color: red; font-weight: bold');
          }
        }, 200); // Increased delay before Enter
      }
    };

    typeNextChar();
  }

  sendKeyEvent(element, eventType, key) {
    const isEnter = key === 'Enter';
    const timestamp = Date.now();

    // Build event properties - PTT terminal is picky about format
    let eventProps;

    if (isEnter) {
      eventProps = {
        key: 'Enter',
        code: 'Enter',
        charCode: 13,
        keyCode: 13,
        which: 13,
        bubbles: true,
        cancelable: true
      };
    } else {
      // For character keys
      const charCode = key.charCodeAt(0);
      eventProps = {
        key: key,
        code: `Key${key.toUpperCase()}`,
        charCode: charCode,
        keyCode: charCode,  // Try keeping keyCode same as charCode
        which: charCode,
        bubbles: true,
        cancelable: true
      };
    }

    const event = new KeyboardEvent(eventType, eventProps);

    // IMPORTANT: Only dispatch to document once
    document.dispatchEvent(event);

    if (this.debugMode && (eventType === 'keypress' || isEnter)) {
      console.log(`    → Sent ${eventType}: key="${eventProps.key}", charCode=${eventProps.charCode}, keyCode=${eventProps.keyCode}, which=${eventProps.which}`);
    }
  }
}

// ==================== Image Preview Functionality ====================

class ImagePreview {
  constructor() {
    this.previewPanel = null;
    this.imageCache = {};
    this.cacheSize = 50 * 1024 * 1024; // 50MB default
    this.currentCacheSize = 0;
    this.hoverTimeout = null;
    this.isMouseOverPreview = false;
    this.currentLink = null;
  }

  async init() {
    // Load cache settings
    const settings = await this.getCacheSettings();
    this.cacheSize = settings.cacheSize * 1024 * 1024; // Convert MB to bytes

    // Load existing cache
    await this.loadCache();

    // Create preview panel
    this.createPreviewPanel();

    // Add hover listeners to all image links
    this.attachLinkListeners();

    // Observe for dynamically added links
    this.observeNewLinks();
  }

  async getCacheSettings() {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage({ action: 'getCacheSettings' }, (response) => {
        resolve(response || { cacheSize: 50 });
      });
    });
  }

  async loadCache() {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage({ action: 'getImageCache' }, (response) => {
        if (response && response.imageCache) {
          this.imageCache = response.imageCache;
          this.calculateCacheSize();
        }
        resolve();
      });
    });
  }

  async saveCache() {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage(
        { action: 'setImageCache', cache: this.imageCache },
        (response) => {
          resolve(response);
        }
      );
    });
  }

  calculateCacheSize() {
    this.currentCacheSize = 0;
    for (const url in this.imageCache) {
      // Estimate size based on base64 data
      const data = this.imageCache[url];
      this.currentCacheSize += data.length * 0.75; // base64 is ~33% larger than binary
    }
  }

  createPreviewPanel() {
    this.previewPanel = document.createElement('div');
    this.previewPanel.id = 'ptt-image-preview-panel';
    this.previewPanel.style.cssText = `
      position: fixed;
      z-index: 999999;
      background: rgba(0, 0, 0, 0.95);
      border: 2px solid #4CAF50;
      border-radius: 8px;
      padding: 10px;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
      display: none;
      max-width: 600px;
      max-height: 600px;
      pointer-events: auto;
    `;

    const img = document.createElement('img');
    img.style.cssText = `
      max-width: 100%;
      max-height: 580px;
      display: block;
      border-radius: 4px;
    `;
    this.previewPanel.appendChild(img);

    const loadingDiv = document.createElement('div');
    loadingDiv.textContent = 'Loading...';
    loadingDiv.style.cssText = `
      color: white;
      padding: 20px;
      text-align: center;
      display: none;
    `;
    this.previewPanel.appendChild(loadingDiv);

    document.body.appendChild(this.previewPanel);

    // Add hover listeners to the preview panel itself
    this.previewPanel.addEventListener('mouseenter', () => {
      this.isMouseOverPreview = true;
      if (this.hoverTimeout) {
        clearTimeout(this.hoverTimeout);
        this.hoverTimeout = null;
      }
    });

    this.previewPanel.addEventListener('mouseleave', () => {
      this.isMouseOverPreview = false;
      this.hidePreview();
    });
  }

  attachLinkListeners() {
    const links = document.querySelectorAll('a[href]');
    links.forEach(link => {
      if (!link.hasAttribute('data-preview-attached')) {
        this.attachLinkListener(link);
      }
    });
  }

  attachLinkListener(link) {
    const href = link.href;

    // Check if it's an image link
    if (this.isImageUrl(href)) {
      link.setAttribute('data-preview-attached', 'true');

      link.addEventListener('mouseenter', (e) => {
        this.currentLink = link;
        if (this.hoverTimeout) {
          clearTimeout(this.hoverTimeout);
        }

        // Show preview after short delay
        this.hoverTimeout = setTimeout(() => {
          this.showPreview(href, e);
        }, 300);
      });

      link.addEventListener('mouseleave', () => {
        if (this.hoverTimeout) {
          clearTimeout(this.hoverTimeout);
          this.hoverTimeout = null;
        }

        // Delay hiding to allow moving to preview panel
        setTimeout(() => {
          if (!this.isMouseOverPreview) {
            this.hidePreview();
          }
        }, 100);
      });
    }
  }

  isImageUrl(url) {
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.svg'];
    const lowerUrl = url.toLowerCase();

    return imageExtensions.some(ext => lowerUrl.includes(ext)) ||
      lowerUrl.includes('image') ||
      lowerUrl.includes('imgur.com') ||
      lowerUrl.includes('i.redd.it') ||
      lowerUrl.match(/\.(jpg|jpeg|png|gif|bmp|webp|svg)(\?|#|$)/i);
  }

  async showPreview(imageUrl, event) {
    const img = this.previewPanel.querySelector('img');
    const loadingDiv = this.previewPanel.querySelector('div');

    // Show loading state
    img.style.display = 'none';
    loadingDiv.style.display = 'block';
    this.previewPanel.style.display = 'block';

    // Position the panel near the cursor
    this.positionPanel(event.clientX, event.clientY);

    try {
      let imageSrc;

      // Check cache first
      if (this.imageCache[imageUrl]) {
        imageSrc = this.imageCache[imageUrl];
      } else {
        // Fetch and cache the image
        imageSrc = await this.fetchAndCacheImage(imageUrl);
      }

      // Display the image
      img.src = imageSrc;
      img.style.display = 'block';
      loadingDiv.style.display = 'none';

      // Reposition after image loads
      img.onload = () => {
        this.positionPanel(event.clientX, event.clientY);
      };
    } catch (error) {
      console.error('Error loading image:', error);
      loadingDiv.textContent = 'Failed to load image';
      loadingDiv.style.color = '#ff6b6b';
    }
  }

  hidePreview() {
    if (this.previewPanel) {
      this.previewPanel.style.display = 'none';
    }
    this.currentLink = null;
  }

  positionPanel(x, y) {
    const panel = this.previewPanel;
    const panelRect = panel.getBoundingClientRect();
    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;

    let left = x + 15;
    let top = y + 15;

    // Adjust if panel goes off screen
    if (left + panelRect.width > windowWidth) {
      left = x - panelRect.width - 15;
    }

    if (top + panelRect.height > windowHeight) {
      top = windowHeight - panelRect.height - 10;
    }

    // Keep within viewport
    left = Math.max(10, Math.min(left, windowWidth - panelRect.width - 10));
    top = Math.max(10, Math.min(top, windowHeight - panelRect.height - 10));

    panel.style.left = left + 'px';
    panel.style.top = top + 'px';
  }

  async fetchAndCacheImage(url) {
    try {
      const response = await fetch(url);
      const blob = await response.blob();

      // Convert to base64
      const base64 = await this.blobToBase64(blob);
      const dataUrl = `data:${blob.type};base64,${base64}`;

      // Check cache size and add to cache
      const imageSize = base64.length * 0.75; // Approximate size in bytes

      // If adding this image exceeds cache limit, clear old entries
      while (this.currentCacheSize + imageSize > this.cacheSize && Object.keys(this.imageCache).length > 0) {
        // Remove oldest entry (first key)
        const oldestKey = Object.keys(this.imageCache)[0];
        const oldSize = this.imageCache[oldestKey].length * 0.75;
        delete this.imageCache[oldestKey];
        this.currentCacheSize -= oldSize;
      }

      // Add to cache
      if (imageSize <= this.cacheSize) {
        this.imageCache[url] = dataUrl;
        this.currentCacheSize += imageSize;
        await this.saveCache();
      }

      return dataUrl;
    } catch (error) {
      throw new Error(`Failed to fetch image: ${error.message}`);
    }
  }

  blobToBase64(blob) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  observeNewLinks() {
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            // Check if the node itself is a link
            if (node.tagName === 'A' && node.href) {
              this.attachLinkListener(node);
            }

            // Check for links within the node
            const links = node.querySelectorAll('a[href]');
            links.forEach(link => {
              if (!link.hasAttribute('data-preview-attached')) {
                this.attachLinkListener(link);
              }
            });
          }
        });
      });
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }
}

// ==================== Content CSS Styles ====================

const styles = `
  #ptt-image-preview-panel {
    animation: fadeIn 0.2s ease-in-out;
  }

  @keyframes fadeIn {
    from {
      opacity: 0;
      transform: scale(0.9);
    }
    to {
      opacity: 1;
      transform: scale(1);
    }
  }
`;

// Inject styles
const styleSheet = document.createElement('style');
styleSheet.textContent = styles;
document.head.appendChild(styleSheet);

// ==================== Initialize ====================

// Initialize auto-login
const autoLogin = new PTTAutoLogin();
autoLogin.init();

// Initialize image preview
const imagePreview = new ImagePreview();
imagePreview.init();

console.log('%c═══════════════════════════════════════════════════════════', 'color: cyan');
console.log('%c   PTT Auto Login & Image Preview Extension Loaded', 'color: cyan; font-weight: bold; font-size: 14px');
console.log('%c═══════════════════════════════════════════════════════════', 'color: cyan');
console.log('%c   Debug Mode: ' + (autoLogin.debugMode ? 'ON' : 'OFF'), 'color: ' + (autoLogin.debugMode ? 'green' : 'gray'));
console.log('%c   Prevent Submit: ' + (autoLogin.preventSubmit ? 'ON (Safe Mode)' : 'OFF (Will Login)'), 'color: ' + (autoLogin.preventSubmit ? 'orange' : 'red'));
console.log('%c   Event Type: ' + autoLogin.eventType + ' only', 'color: blue; font-weight: bold');
console.log('%c   Typing Delay: ' + autoLogin.typingDelay + 'ms per character (FAST MODE)', 'color: magenta; font-weight: bold');
console.log('%c   Event Target: document', 'color: green');
console.log('%c═══════════════════════════════════════════════════════════', 'color: cyan');

if (autoLogin.preventSubmit) {
  console.log('%c⚠️  SAFE MODE: Enter key will NOT be pressed after typing credentials', 'color: orange; font-weight: bold');
  console.log('%cTo enable actual login, edit content.js line 7: preventSubmit = false', 'color: gray');
}
