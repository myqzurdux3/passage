// Source unique du dessin. `src/ui/Logo.tsx` en tient une copie, qu'un test
// compare à celle-ci : sans ce garde-fou, retoucher l'un laissait l'autre
// sur l'ancien tracé.

const ARCH_PATH = 'M16 56 L16 32 A16 16 0 0 1 48 32 L48 56';
const DOT = { cx: 32, cy: 42, r: 5 };
const STROKE_WIDTH = 6;

export const PAPER = '#FBF9F4';
const ACCENT = '#C2703D';

/** `inset` laisse la marge de sécurité qu'Android rogne sur l'icône adaptative. */
export function archSvg(inset = 0) {
  const scale = 1 - inset * 2;
  const shift = 32 * (1 - scale);

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <rect width="64" height="64" fill="${PAPER}"/>
  <g transform="translate(${shift} ${shift}) scale(${scale})">
    <path d="${ARCH_PATH}"
          stroke="${ACCENT}" stroke-width="${STROKE_WIDTH}" stroke-linecap="round" fill="none"/>
    <circle cx="${DOT.cx}" cy="${DOT.cy}" r="${DOT.r}" fill="${ACCENT}"/>
  </g>
</svg>`;
}
