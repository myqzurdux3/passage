import { buildTheme, resolveThemeName } from '../theme';

describe('buildTheme', () => {
  it('emploie la serif quand elle est chargée', () => {
    expect(buildTheme('light').fonts.serif).toBe('Fraunces_600SemiBold');
  });

  it('retombe sur la police système quand le chargement a échoué', () => {
    // `undefined` laisse React Native choisir la police système : c'est ce qui
    // évite un écran figé quand Fraunces est introuvable.
    expect(buildTheme('light', false).fonts.serif).toBeUndefined();
  });

  it('garde les deux palettes distinctes et complètes', () => {
    const light = buildTheme('light').colors;
    const dark = buildTheme('dark').colors;
    expect(Object.keys(light)).toEqual(Object.keys(dark));
    for (const key of Object.keys(light) as (keyof typeof light)[]) {
      expect(light[key]).not.toBe(dark[key]);
      expect(light[key]).toMatch(/^#[0-9A-F]{6}$/i);
    }
  });
});

describe('resolveThemeName', () => {
  it('suit le système quand la préférence est « système »', () => {
    expect(resolveThemeName('system', 'dark')).toBe('dark');
    expect(resolveThemeName('system', 'light')).toBe('light');
  });

  it('retombe sur le clair quand le système ne dit rien', () => {
    expect(resolveThemeName('system', null)).toBe('light');
    expect(resolveThemeName('system', undefined)).toBe('light');
  });

  it('ignore le système quand la préférence est explicite', () => {
    expect(resolveThemeName('dark', 'light')).toBe('dark');
    expect(resolveThemeName('light', 'dark')).toBe('light');
  });
});
