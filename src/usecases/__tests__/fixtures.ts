import type { AiClient } from '../../ai/claude';
import type { Db } from '../../data/db';
import { migrate } from '../../data/migrations';
import { SeriesRepository, type NewSentence } from '../../data/seriesRepository';
import { SettingsRepository } from '../../data/settingsRepository';
import { StatsRepository } from '../../data/statsRepository';
import { makeTestDb } from '../../data/__tests__/testDb';
import type { Deps } from '../deps';

export const FIVE: NewSentence[] = Array.from({ length: 5 }, (_, i) => ({
  source_fr: `Phrase ${i + 1}.`,
  reference_en: `Sentence ${i + 1}.`,
  targets_tag: null,
}));

export const ANSWERS = FIVE.map((_, i) => ({
  position: i + 1,
  user_en: `answer ${i + 1}`,
}));

export const CORRECTIONS = FIVE.map((_, i) => ({
  position: i + 1,
  score: 8,
  corrected_en: `corrected ${i + 1}`,
  explanation: `explication ${i + 1}`,
  error_tags: [],
}));

export type Harness = {
  deps: Deps;
  db: Db;
  generateSeries: jest.Mock;
  correctSeries: jest.Mock;
};

export function makeHarness(today = new Date(2026, 7, 29, 9, 0)): Harness {
  const db = makeTestDb();
  migrate(db);

  const generateSeries = jest.fn().mockResolvedValue(FIVE);
  const correctSeries = jest
    .fn()
    .mockResolvedValue({ items: CORRECTIONS, overall: 'Bon travail.' });

  const ai: AiClient = {
    generateSeries: generateSeries as AiClient['generateSeries'],
    correctSeries: correctSeries as AiClient['correctSeries'],
  };

  const now = () => today;

  return {
    db,
    generateSeries,
    correctSeries,
    deps: {
      series: new SeriesRepository(db, now),
      settings: new SettingsRepository(db),
      stats: new StatsRepository(db),
      ai,
      now,
    },
  };
}
