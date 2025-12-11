const fs = require('fs');
const path = require('path');

// Check if canvas module is available
let Canvas;
try {
  Canvas = require('canvas');
} catch (e) {
  console.log('Canvas module not found. Using alternative method...');
  console.log('Please open generate-icons.html in your browser to create icons manually.');
  console.log('Or run: yarn add canvas');
  process.exit(0);
}

const { createCanvas } = Canvas;

function generateIcon(size, filename) {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');

  // Background
  ctx.fillStyle = '#4CAF50';
  ctx.fillRect(0, 0, size, size);

  // Draw "PTT" text
  ctx.fillStyle = 'white';
  ctx.font = `bold ${size * 0.3}px Arial`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('PTT', size / 2, size / 2);

  // Save to file
  const buffer = canvas.toBuffer('image/png');
  fs.writeFileSync(path.join(__dirname, filename), buffer);
  console.log(`✓ Generated ${filename}`);
}

console.log('Generating extension icons...\n');

try {
  generateIcon(16, 'icon16.png');
  generateIcon(48, 'icon48.png');
  generateIcon(128, 'icon128.png');
  console.log('\n✓ All icons generated successfully!');
} catch (error) {
  console.error('Error generating icons:', error.message);
  console.log('\nAlternative: Open generate-icons.html in your browser to create icons manually.');
}
