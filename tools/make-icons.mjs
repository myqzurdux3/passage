// Rend le logo vectoriel dans les PNG attendus par Expo, plus `assets/logo.svg`
// qui en est dérivé — il ne sert plus de source, seulement de référence lisible.
//
// Lancer avec `npm run icons` après toute retouche de `tools/logo.mjs`.

import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { PAPER, archSvg } from './logo.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const assets = join(here, '..', 'assets');

const OUTPUTS = [
  { file: 'icon.png', size: 1024, inset: 0.08 },
  { file: 'android-icon-foreground.png', size: 1024, inset: 0.2 },
  { file: 'android-icon-monochrome.png', size: 1024, inset: 0.2 },
  { file: 'splash-icon.png', size: 512, inset: 0.15 },
];

await mkdir(assets, { recursive: true });

await writeFile(join(assets, 'logo.svg'), `${archSvg(0)}\n`);
console.log('logo.svg');

for (const { file, size, inset } of OUTPUTS) {
  const png = await sharp(Buffer.from(archSvg(inset))).resize(size, size).png().toBuffer();
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
