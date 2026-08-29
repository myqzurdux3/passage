import { DatabaseSync } from 'node:sqlite';
import type { Db } from '../db';
import { migrate } from '../migrations';
import { SeriesRepository } from '../seriesRepository';
import { SettingsRepository } from '../settingsRepository';
import { wipeAllData } from '../wipe';
import { makeTestDb } from './testDb';

const sentences = Array.from({ length: 5 }, (_, i) => ({
  source_fr: `Phrase ${i + 1}.`,
  reference_en: `Sentence ${i + 1}.`,
  targets_tag: null,
}));

/** Base identique à `makeTestDb`, mais sans `PRAGMA foreign_keys` — le pire cas. */
function makeDbWithoutForeignKeys(): Db {
  const raw = new DatabaseSync(':memory:');
  raw.exec('PRAGMA foreign_keys = OFF');
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

function seed(db: Db): void {
  migrate(db);
  const series = new SeriesRepository(db);
  const created = series.insert('2026-08-29', 'B1', sentences);
  series.saveAnswers(
    created.id,
    sentences.map((_, i) => ({ position: i + 1, user_en: `réponse ${i + 1}` })),
  );
  new SettingsRepository(db).set('base_level', 'B2');
}

const counts = (db: Db) => ({
  series: db.all('SELECT id FROM series').length,
  sentence: db.all('SELECT id FROM sentence').length,
  answer: db.all('SELECT id FROM answer').length,
  settings: db.all('SELECT key FROM settings').length,
});

describe('wipeAllData', () => {
  it('efface tout quand les clés étrangères sont actives', () => {
    const db = makeTestDb();
    seed(db);
    expect(counts(db)).toEqual({ series: 1, sentence: 5, answer: 5, settings: 1 });

    wipeAllData(db);

    expect(counts(db)).toEqual({ series: 0, sentence: 0, answer: 0, settings: 0 });
  });

  it('efface tout même sans clés étrangères — aucune donnée ne survit au pragma', () => {
    const db = makeDbWithoutForeignKeys();
    seed(db);
    expect(counts(db)).toEqual({ series: 1, sentence: 5, answer: 5, settings: 1 });

    wipeAllData(db);

    expect(counts(db)).toEqual({ series: 0, sentence: 0, answer: 0, settings: 0 });
  });

  it('montre que la cascade seule ne suffirait pas sans le pragma', () => {
    // Ce test documente précisément le risque écarté : un simple
    // `DELETE FROM series` laisserait phrases et réponses en base.
    const db = makeDbWithoutForeignKeys();
    seed(db);

    db.run('DELETE FROM series');

    expect(counts(db).sentence).toBe(5);
    expect(counts(db).answer).toBe(5);
  });

  it('laisse une base vide utilisable', () => {
    const db = makeTestDb();
    seed(db);
    wipeAllData(db);

    const series = new SeriesRepository(db);
    expect(() => series.insert('2026-08-30', 'B1', sentences)).not.toThrow();
    expect(series.findByDay('2026-08-30')!.sentences).toHaveLength(5);
  });
});
