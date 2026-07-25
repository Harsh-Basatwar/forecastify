/**
 * Run this script to generate icon PNGs from the logo.
 * Usage: node generate-icons.js
 * 
 * This uses canvas to resize the logo into 16x16, 48x48, and 128x128.
 * Requires: npm install canvas (optional, for PNG generation)
 * 
 * For now, you can manually create icons or use an online tool:
 * 1. Go to https://realfavicongenerator.net/
 * 2. Upload the logo.png
 * 3. Download icons in 16, 48, 128 sizes
 * 4. Place them in the icons/ directory
 */

const fs = require('fs');
const path = require('path');

// Simple SVG-based icon generator (no external deps needed)
function generateSvgIcon(size) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#6366f1"/>
      <stop offset="100%" style="stop-color:#a855f7"/>
    </linearGradient>
  </defs>
  <rect width="${size}" height="${size}" rx="${Math.round(size * 0.2)}" fill="url(#bg)"/>
  <text x="${size/2}" y="${size * 0.72}" text-anchor="middle" fill="white" font-family="Arial, sans-serif" font-weight="bold" font-size="${Math.round(size * 0.6)}">F</text>
</svg>`;
}

const iconsDir = path.join(__dirname, 'icons');
if (!fs.existsSync(iconsDir)) fs.mkdirSync(iconsDir, { recursive: true });

[16, 48, 128].forEach(size => {
  const svg = generateSvgIcon(size);
  fs.writeFileSync(path.join(iconsDir, `icon${size}.svg`), svg);
  console.log(`Generated icon${size}.svg`);
});

console.log('\nNote: Chrome requires PNG icons. Convert SVGs to PNG using:');
console.log('  - https://svgtopng.com/');
console.log('  - Or use the logo.png directly as your icon');
