import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { Resvg } from '@resvg/resvg-js';

const __dirname = dirname(fileURLToPath(import.meta.url));

const svgContent = readFileSync(join(__dirname, '../public/aasha-icon.svg'), 'utf-8');

function generate(size, outputPath) {
  const resvg = new Resvg(svgContent, {
    fitTo: { mode: 'width', value: size },
  });
  const pngData = resvg.render();
  const pngBuffer = pngData.asPng();
  writeFileSync(outputPath, pngBuffer);
  console.log(`✓ ${outputPath} (${size}×${size}px)`);
}

generate(192, join(__dirname, '../public/pwa-192x192.png'));
generate(512, join(__dirname, '../public/pwa-512x512.png'));
console.log('AASHA icons generated.');
