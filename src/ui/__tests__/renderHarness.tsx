import type { ReactElement, ReactNode } from 'react';
import { render } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import type { AiClient } from '../../ai/claude';
import { migrate } from '../../data/migrations';
import { SeriesRepository, type NewSentence } from '../../data/seriesRepository';
import { SettingsRepository } from '../../data/settingsRepository';
import { StatsRepository } from '../../data/statsRepository';
import type { Db } from '../../data/db';
import type { Deps } from '../../usecases/deps';
import { ThemeProvider } from '../ThemeProvider';

/**
 * Rend un écran avec de vrais dépôts sur une base en mémoire et un client IA
 * doublé. Les écrans sont là où l'audit a trouvé les bugs : ils méritent
 * d'être exercés contre la vraie persistance, pas contre des doublures de
 * dépôts qui masqueraient les erreurs de requête.
 */
export const FIVE: NewSentence[] = Array.from({ length: 5 }, (_, i) => ({
  source_fr: `Phrase ${i + 1}.`,
  reference_en: `Sentence ${i + 1}.`,
  targets_tag: null,
}));

export const CORRECTIONS = FIVE.map((_, i) => ({
  position: i + 1,
  score: 8,
  corrected_en: `corrected ${i + 1}`,
  explanation: `explication ${i + 1}`,
  error_tags: [],
}));

/** Base en mémoire : `node:sqlite` n'existe pas sous l'environnement jsdom. */
function makeMemoryDb(): Db {
  const tables = new Map<string, Record<string, unknown>[]>();
  void tables;
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { DatabaseSync } = require('node:sqlite') as typeof import('node:sqlite');
  const raw = new DatabaseSync(':memory:');
  raw.exec('PRAGMA foreign_keys = ON');
  return {
    exec: (sql) => raw.exec(sql),
    all: <T,>(sql: string, params: unknown[] = []) =>
      raw.prepare(sql).all(...(params as never[])) as T[],
    run: (sql, params = []) => {
      raw.prepare(sql).run(...(params as never[]));
    },
    transaction: <T,>(fn: () => T): T => {
      raw.exec('BEGIN');
      try {
        const result = fn();
        raw.exec('COMMIT');
        return result;
      } catch (e) {
        raw.exec('ROLLBACK');
        throw e;
      }
    },
  };
}

export type ScreenHarness = {
  deps: Deps;
  generateSeries: jest.Mock;
  correctSeries: jest.Mock;
  setNow: (d: Date) => void;
};

export function makeScreenDeps(today = new Date(2026, 7, 29, 9, 0)): ScreenHarness {
  const db = makeMemoryDb();
  migrate(db);

  const generateSeries = jest.fn().mockResolvedValue(FIVE);
  const correctSeries = jest
    .fn()
    .mockResolvedValue({ items: CORRECTIONS, overall: 'Bon travail.' });

  let clock = today;
  const now = () => clock;

  return {
    generateSeries,
    correctSeries,
    setNow: (d: Date) => {
      clock = d;
    },
    deps: {
      series: new SeriesRepository(db, now),
      settings: new SettingsRepository(db),
      stats: new StatsRepository(db),
      ai: {
        generateSeries: generateSeries as AiClient['generateSeries'],
        correctSeries: correctSeries as AiClient['correctSeries'],
      },
      now,
    },
  };
}

export function Wrapper({ children }: { children: ReactNode }) {
  return (
    <SafeAreaProvider
      initialMetrics={{
        frame: { x: 0, y: 0, width: 400, height: 800 },
        insets: { top: 0, left: 0, right: 0, bottom: 0 },
      }}
    >
      <ThemeProvider preference="light">{children}</ThemeProvider>
    </SafeAreaProvider>
  );
}

export const renderScreen = (ui: ReactElement) => render(ui, { wrapper: Wrapper });
