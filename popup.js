// Load saved settings when popup opens
document.addEventListener('DOMContentLoaded', async () => {
  const result = await chrome.storage.sync.get(['username', 'password', 'autoLogin', 'cacheSize']);

  if (result.username) {
    document.getElementById('username').value = result.username;
  }

  if (result.password) {
    document.getElementById('password').value = result.password;
  }

  document.getElementById('autoLogin').checked = result.autoLogin || false;
  document.getElementById('cacheSize').value = result.cacheSize || 50;
});

// Save settings when button is clicked
document.getElementById('saveBtn').addEventListener('click', async () => {
  const username = document.getElementById('username').value.trim();
  const password = document.getElementById('password').value;
  const autoLogin = document.getElementById('autoLogin').checked;
  const cacheSize = parseInt(document.getElementById('cacheSize').value);

  const statusEl = document.getElementById('status');

  if (!username || !password) {
    statusEl.textContent = 'Please enter both username and password';
    statusEl.className = 'status error';
    return;
  }

  if (cacheSize < 10 || cacheSize > 500) {
    statusEl.textContent = 'Cache size must be between 10 and 500 MB';
    statusEl.className = 'status error';
    return;
  }

  try {
    await chrome.storage.sync.set({
      username,
      password,
      autoLogin,
      cacheSize
    });

    statusEl.textContent = 'Settings saved successfully!';
    statusEl.className = 'status success';

    setTimeout(() => {
      statusEl.style.display = 'none';
    }, 2000);
  } catch (error) {
    statusEl.textContent = 'Error saving settings: ' + error.message;
    statusEl.className = 'status error';
  }
});
