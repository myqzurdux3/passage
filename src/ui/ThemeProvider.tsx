import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { useColorScheme } from 'react-native';
import { buildTheme, resolveThemeName, type Theme, type ThemePreference } from './theme';

const ThemeContext = createContext<Theme | null>(null);

/**
 * Purement dérivé : la préférence est détenue par les réglages, pas ici.
 * Un seul endroit décide, l'affichage suit.
 */
export function ThemeProvider({
  children,
  preference = 'system',
}: {
  children: ReactNode;
  preference?: ThemePreference;
}) {
  const scheme = useColorScheme();

  const theme = useMemo(
    () => buildTheme(resolveThemeName(preference, scheme === 'dark' ? 'dark' : 'light')),
    [preference, scheme],
  );

  return <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>;
}

/** Hors provider, le thème clair sert de repli : un composant isolé reste lisible. */
export function useThemeContext(): Theme {
  return useContext(ThemeContext) ?? buildTheme('light');
}
