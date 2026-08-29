import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { PALETTES_LIGHT_ACCENT } from './lightAccent';

const root = join(__dirname, '..', '..', '..');
const component = readFileSync(join(root, 'src', 'ui', 'Logo.tsx'), 'utf8');
const generator = readFileSync(join(root, 'tools', 'logo.mjs'), 'utf8');

/** Extrait la valeur d'une chaîne littérale du fichier source. */
const literal = (source: string, pattern: RegExp): string => {
  const match = source.match(pattern);
  if (!match) throw new Error(`Motif introuvable : ${pattern}`);
  return match[1];
};

describe('le logo du composant et celui des icônes ne divergent pas', () => {
  it('partage le même tracé', () => {
    expect(literal(component, /d="([^"]+)"/)).toBe(literal(generator, /ARCH_PATH = '([^']+)'/));
  });

  it('partage la même position de point', () => {
    const dot = generator.match(/DOT = \{ cx: (\d+), cy: (\d+), r: (\d+) \}/);
    expect(dot).not.toBeNull();
    expect(component).toContain(`cx={${dot![1]}}`);
    expect(component).toContain(`cy={${dot![2]}}`);
    expect(component).toContain(`r={${dot![3]}}`);
  });

  it('partage la même épaisseur de trait', () => {
    expect(component).toContain(`strokeWidth={${literal(generator, /STROKE_WIDTH = (\d+)/)}}`);
  });

  it("emploie l'accent du thème clair", () => {
    expect(literal(generator, /ACCENT = '([^']+)'/)).toBe(PALETTES_LIGHT_ACCENT);
  });
});
