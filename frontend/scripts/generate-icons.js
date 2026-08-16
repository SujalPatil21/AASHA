/**
 * Generate AASHA PNG icons from SVG using Vite's build environment.
 * Requires: npm install --save-dev @resvg/resvg-js
 * OR falls back to writing a minimal hand-coded PNG if not available.
 */

const fs = require('fs');
const path = require('path');

const svgContent = fs.readFileSync(path.join(__dirname, '../public/aasha-icon.svg'), 'utf-8');

async function generateWithResvg(size, outputPath) {
  const { Resvg } = require('@resvg/resvg-js');
  const resvg = new Resvg(svgContent, {
    fitTo: { mode: 'width', value: size },
  });
  const pngData = resvg.render();
  const pngBuffer = pngData.asPng();
  fs.writeFileSync(outputPath, pngBuffer);
  console.log(`✓ Generated ${outputPath} (${size}x${size})`);
}

async function main() {
  try {
    require.resolve('@resvg/resvg-js');
    await generateWithResvg(192, path.join(__dirname, '../public/pwa-192x192.png'));
    await generateWithResvg(512, path.join(__dirname, '../public/pwa-512x512.png'));
    console.log('All PWA icons generated.');
  } catch (e) {
    console.log('resvg-js not found. Installing...');
    const { execSync } = require('child_process');
    execSync('npm install --save-dev @resvg/resvg-js', { stdio: 'inherit', cwd: path.join(__dirname, '..') });
    await generateWithResvg(192, path.join(__dirname, '../public/pwa-192x192.png'));
    await generateWithResvg(512, path.join(__dirname, '../public/pwa-512x512.png'));
    console.log('All PWA icons generated.');
  }
}

main().catch(console.error);
