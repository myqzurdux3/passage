export type ThemeName = 'light' | 'dark';
export type ThemePreference = ThemeName | 'system';

type Palette = {
  background: string;
  surface: string;
  text: string;
  textMuted: string;
  accent: string;
  accentSoft: string;
  success: string;
  successSoft: string;
  error: string;
  errorSoft: string;
  border: string;
};

/**
 * Papier chaud plutôt que blanc clinique, ambre plutôt que bleu applicatif :
 * la lecture est l'activité centrale, la teinte doit rester reposante.
 */
const LIGHT: Palette = {
  background: '#FBF9F4',
  surface: '#FFFFFF',
  text: '#1A1815',
  textMuted: '#6B6459',
  accent: '#C2703D',
  accentSoft: '#F6E7DA',
  success: '#4A7C59',
  successSoft: '#E3EFE6',
  error: '#B4544A',
  errorSoft: '#F6E2E0',
  border: '#E5DFD4',
};

const DARK: Palette = {
  background: '#121110',
  surface: '#1B1917',
  text: '#F0EBE3',
  textMuted: '#9A9186',
  accent: '#D98A56',
  accentSoft: '#33251B',
  success: '#6FA37D',
  successSoft: '#1D2A21',
  error: '#D2766B',
  errorSoft: '#2E1E1C',
  border: '#2A2724',
};

const PALETTES: Record<ThemeName, Palette> = { light: LIGHT, dark: DARK };

const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;
const radius = { sm: 8, md: 12, lg: 20, pill: 999 } as const;

const fonts = {
  serif: 'Fraunces_600SemiBold',
  body: 'Fraunces_400Regular',
} as const;

const type = {
  title: { fontSize: 28, lineHeight: 34 },
  heading: { fontSize: 20, lineHeight: 26 },
  sentence: { fontSize: 19, lineHeight: 28 },
  body: { fontSize: 15, lineHeight: 22 },
  label: { fontSize: 13, lineHeight: 18 },
  caption: { fontSize: 12, lineHeight: 16 },
} as const;

export type Theme = {
  name: ThemeName;
  colors: Palette;
  spacing: typeof spacing;
  radius: typeof radius;
  fonts: typeof fonts;
  type: typeof type;
};

export function buildTheme(name: ThemeName): Theme {
  return { name, colors: PALETTES[name], spacing, radius, fonts, type };
}

export function resolveThemeName(
  preference: ThemePreference,
  systemScheme: ThemeName | null | undefined,
): ThemeName {
  if (preference === 'system') return systemScheme ?? 'light';
  return preference;
}
