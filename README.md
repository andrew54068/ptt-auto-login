# PTT Auto Login & Image Preview Extension

A Chrome/Edge browser extension that provides automatic login functionality for PTT (https://term.ptt.cc/) and image preview on hover.

## Features

1. **Auto Login**: Automatically fill in your PTT credentials and login when visiting the site
2. **Image Preview**: Hover over image links to see a preview panel
3. **Smart Caching**: Cached images for faster loading with configurable size limit

## Installation

### Step 1: Generate Icons

1. Open `generate-icons.html` in your browser
2. Right-click on each canvas image and select "Save image as..."
3. Save them as `icon16.png`, `icon48.png`, and `icon128.png` in the extension folder

### Step 2: Load Extension in Browser

#### For Chrome:
1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode" (toggle in top-right corner)
3. Click "Load unpacked"
4. Select the `ptt-auto-login` folder
5. The extension should now appear in your extensions list

#### For Edge:
1. Open Edge and navigate to `edge://extensions/`
2. Enable "Developer mode" (toggle in left sidebar)
3. Click "Load unpacked"
4. Select the `ptt-auto-login` folder
5. The extension should now appear in your extensions list

## Usage

### Setting Up Auto Login

1. Click on the extension icon in your browser toolbar
2. Enter your PTT account ID and password
3. Check "Enable Auto Login" if you want automatic login
4. Set your preferred image cache size (default: 50MB)
5. Click "Save Settings"

### Image Preview

1. Navigate to any PTT page with image links
2. Hover your mouse cursor over an image link
3. A preview panel will appear after a short delay
4. Move your cursor away to close the preview
5. Images are automatically cached for faster subsequent loading

## Configuration

### Cache Settings

- **Image Cache Size**: Set the maximum cache size (10-500 MB)
- Older cached images are automatically removed when the cache is full
- Cache persists across browser sessions

### Auto Login Settings

- **Account ID**: Your PTT username
- **Password**: Your PTT password
- **Enable Auto Login**: Toggle automatic login on/off

## Security Notes

- Credentials are stored in Chrome's sync storage (encrypted by Chrome)
- The extension only runs on `https://term.ptt.cc/*` domain
- Image preview works on all domains to support external image hosts

## File Structure

```
ptt-auto-login/
├── manifest.json          # Extension configuration
├── popup.html            # Settings UI
├── popup.css             # Settings UI styles
├── popup.js              # Settings UI logic
├── background.js         # Background service worker
├── content.js            # Main extension logic
├── content.css           # Content script styles
├── generate-icons.html   # Icon generator utility
├── icon16.png           # Extension icon (16x16)
├── icon48.png           # Extension icon (48x48)
├── icon128.png          # Extension icon (128x128)
└── README.md            # This file
```

## Troubleshooting

### Auto-login not working
- Ensure "Enable Auto Login" is checked in settings
- Verify your credentials are correct
- Check that the PTT login page has fully loaded
- The extension looks for standard login form elements

### Image preview not showing
- Verify the link points to an image (common image extensions or image hosting sites)
- Check browser console for any errors (F12 → Console tab)
- Ensure the image URL is accessible

### Cache issues
- Try clearing the cache by reducing cache size to 10MB, saving, then increasing again
- Check available storage in `chrome://extensions/` under the extension details

## Development

### Technologies Used
- Manifest V3 (latest Chrome extension format)
- Vanilla JavaScript (no dependencies)
- Chrome Extension APIs (storage, runtime)

### Modifying the Extension

After making changes to any files:
1. Go to `chrome://extensions/` or `edge://extensions/`
2. Click the refresh icon on the extension card
3. Reload any open PTT tabs to see changes

## Privacy

This extension:
- Does NOT send any data to external servers
- Stores credentials locally in your browser
- Only makes requests to fetch images for preview
- Does NOT track or collect any user data

## License

Free to use and modify for personal use.

## Support

For issues or feature requests, please check the extension's repository or contact the developer.
