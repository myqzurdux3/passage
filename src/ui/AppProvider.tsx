import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { Deps } from '../app/deps';
import {
  clearApiKey,
  getDb,
  makeDepsWithKey,
  readApiKey,
  wipeLocalData,
  writeApiKey,
} from '../app/container';
import { prefetchTomorrow } from '../app/prefetchTomorrow';
import { retryPendingCorrection } from '../app/retryPendingCorrection';
import { SETTING_KEYS, SettingsRepository } from '../data/settingsRepository';
import type { Level } from '../core/levels';
import { DEFAULT_BASE_LEVEL } from '../app/getTodaySeries';
import type { ThemePreference } from './theme';

export type Settings = {
  baseLevel: Level;
  theme: ThemePreference;
  reminderHour: number | null;
  reminderMinute: number;
};

const DEFAULT_SETTINGS: Settings = {
  baseLevel: DEFAULT_BASE_LEVEL,
  theme: 'system',
  reminderHour: null,
  reminderMinute: 0,
};

type AppContextValue = {
  ready: boolean;
  deps: Deps | null;
  settings: Settings;
  saveApiKey: (key: string) => Promise<void>;
  forgetApiKey: () => Promise<void>;
  updateSettings: (patch: Partial<Settings>) => void;
  eraseEverything: () => Promise<void>;
};

const AppContext = createContext<AppContextValue | null>(null);

function readSettings(): Settings {
  const repo = new SettingsRepository(getDb());
  const hour = repo.get(SETTING_KEYS.reminderHour);
  const minute = repo.get(SETTING_KEYS.reminderMinute);

  return {
    baseLevel: (repo.get(SETTING_KEYS.baseLevel) as Level | null) ?? DEFAULT_SETTINGS.baseLevel,
    theme: (repo.get(SETTING_KEYS.theme) as ThemePreference | null) ?? DEFAULT_SETTINGS.theme,
    reminderHour: hour === null ? null : Number(hour),
    reminderMinute: minute === null ? DEFAULT_SETTINGS.reminderMinute : Number(minute),
  };
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [deps, setDeps] = useState<Deps | null>(null);
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const key = await readApiKey();
      if (cancelled) return;

      setSettings(readSettings());
      if (key) setDeps(makeDepsWithKey(key));
      setReady(true);
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  // Reprise et anticipation, toutes deux en marge : l'affichage ne les attend pas.
  useEffect(() => {
    if (!deps) return;
    void retryPendingCorrection(deps).then(() => prefetchTomorrow(deps));
  }, [deps]);

  const saveApiKey = useCallback(async (key: string) => {
    await writeApiKey(key);
    setDeps(makeDepsWithKey(key.trim()));
  }, []);

  const forgetApiKey = useCallback(async () => {
    await clearApiKey();
    setDeps(null);
  }, []);

  const updateSettings = useCallback((patch: Partial<Settings>) => {
    const repo = new SettingsRepository(getDb());
    if (patch.baseLevel) repo.set(SETTING_KEYS.baseLevel, patch.baseLevel);
    if (patch.theme) repo.set(SETTING_KEYS.theme, patch.theme);
    if (patch.reminderHour !== undefined && patch.reminderHour !== null) {
      repo.set(SETTING_KEYS.reminderHour, String(patch.reminderHour));
    }
    if (patch.reminderMinute !== undefined) {
      repo.set(SETTING_KEYS.reminderMinute, String(patch.reminderMinute));
    }
    setSettings((current) => ({ ...current, ...patch }));
  }, []);

  const eraseEverything = useCallback(async () => {
    wipeLocalData();
    await clearApiKey();
    setDeps(null);
    setSettings(DEFAULT_SETTINGS);
  }, []);

  const value = useMemo<AppContextValue>(
    () => ({ ready, deps, settings, saveApiKey, forgetApiKey, updateSettings, eraseEverything }),
    [ready, deps, settings, saveApiKey, forgetApiKey, updateSettings, eraseEverything],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppContextValue {
  const value = useContext(AppContext);
  if (!value) throw new Error('useApp doit être appelé sous AppProvider.');
  return value;
}

/** Les écrans qui ont besoin d'une clé passent par la garde du layout racine. */
export function useDeps(): Deps {
  const { deps } = useApp();
  if (!deps) throw new Error('Aucune clé API : la garde d’amorçage aurait dû rediriger.');
  return deps;
}
