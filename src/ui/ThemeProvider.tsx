import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import { useColorScheme } from 'react-native';
import {
  buildTheme,
  resolveThemeName,
  type Theme,
  type ThemePreference,
} from './theme';

type ThemeContextValue = Theme & {
  preference: ThemePreference;
  setPreference: (preference: ThemePreference) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({
  children,
  initialPreference = 'system',
}: {
  children: ReactNode;
  initialPreference?: ThemePreference;
}) {
  const [preference, setPreference] = useState<ThemePreference>(initialPreference);
  const scheme = useColorScheme();

  const value = useMemo<ThemeContextValue>(() => {
    const name = resolveThemeName(preference, scheme === 'dark' ? 'dark' : 'light');
    return { ...buildTheme(name), preference, setPreference };
  }, [preference, scheme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

/** Hors provider, le thème clair sert de repli : un composant isolé reste lisible. */
export function useThemeContext(): ThemeContextValue {
  const value = useContext(ThemeContext);
  if (value) return value;
  return { ...buildTheme('light'), preference: 'system', setPreference: () => {} };
}
