// Rend le logo vectoriel dans les PNG attendus par Expo.
// Lancer avec `npm run icons` après toute retouche de `assets/logo.svg`.

import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const here = dirname(fileURLToPath(import.meta.url));
const assets = join(here, '..', 'assets');

const PAPER = '#FBF9F4';
const ACCENT = '#C2703D';

/** `inset` laisse la marge de sécurité qu'Android rogne sur l'icône adaptative. */
const arch = (inset) => {
  const scale = 1 - inset * 2;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <rect width="64" height="64" fill="${PAPER}"/>
  <g transform="translate(${32 * (1 - scale)} ${32 * (1 - scale)}) scale(${scale})">
    <path d="M16 56 L16 32 A16 16 0 0 1 48 32 L48 56"
          stroke="${ACCENT}" stroke-width="6" stroke-linecap="round" fill="none"/>
    <circle cx="32" cy="42" r="5" fill="${ACCENT}"/>
  </g>
</svg>`;
};

const OUTPUTS = [
  { file: 'icon.png', size: 1024, inset: 0.08 },
  { file: 'android-icon-foreground.png', size: 1024, inset: 0.2 },
  { file: 'android-icon-monochrome.png', size: 1024, inset: 0.2 },
  { file: 'splash-icon.png', size: 512, inset: 0.15 },
  { file: 'favicon.png', size: 96, inset: 0.05 },
];

await mkdir(assets, { recursive: true });

for (const { file, size, inset } of OUTPUTS) {
  const png = await sharp(Buffer.from(arch(inset))).resize(size, size).png().toBuffer();
  await writeFile(join(assets, file), png);
  console.log(`${file} — ${size}×${size}`);
}

// Fond uni de l'icône adaptative Android.
const background = await sharp({
  create: { width: 1024, height: 1024, channels: 4, background: PAPER },
})
  .png()
  .toBuffer();
await writeFile(join(assets, 'android-icon-background.png'), background);
console.log('android-icon-background.png — 1024×1024');
