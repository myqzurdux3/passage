import type { ErrorTag } from '../../core/errorTags';
import type { Db } from '../db';
import { migrate } from '../migrations';
import { SeriesRepository, type NewSentence } from '../seriesRepository';
import { SettingsRepository } from '../settingsRepository';
import { StatsRepository } from '../statsRepository';
import { makeTestDb } from './testDb';

const blank: NewSentence[] = Array.from({ length: 5 }, (_, i) => ({
  source_fr: `Phrase ${i + 1}.`,
  reference_en: `Sentence ${i + 1}.`,
  targets_tag: null,
}));

function setup(): { db: Db; series: SeriesRepository; stats: StatsRepository } {
  const db = makeTestDb();
  migrate(db);
  return { db, series: new SeriesRepository(db), stats: new StatsRepository(db) };
}

/** Corrige une journée entière avec les notes et étiquettes fournies. */
function correctDay(
  series: SeriesRepository,
  day: string,
  scores: number[],
  tagsByPosition: ErrorTag[][] = [],
): void {
  const created = series.insert(day, 'B1', blank);
  series.saveAnswers(
    created.id,
    blank.map((_, i) => ({ position: i + 1, user_en: `answer ${i + 1}` })),
  );
  series.saveCorrections(
    created.id,
    scores.map((score, i) => ({
      position: i + 1,
      score,
      corrected_en: 'ok',
      explanation: '',
      error_tags: tagsByPosition[i] ?? [],
    })),
  );
}

describe('StatsRepository sur une base neuve', () => {
  it('rend des résultats vides', () => {
    const { stats } = setup();
    expect(stats.recentAverages(5)).toEqual([]);
    expect(stats.recentTagsBySeries(3)).toEqual([]);
    expect(stats.correctedDays()).toEqual([]);
    expect(stats.dailyScores()).toEqual([]);
  });
});

describe('StatsRepository.recentAverages', () => {
  it('rend la moyenne par série, du plus ancien au plus récent', () => {
    const { series, stats } = setup();
    correctDay(series, '2026-08-27', [10, 10, 10, 10, 10]);
    correctDay(series, '2026-08-28', [5, 5, 5, 5, 5]);
    expect(stats.recentAverages(5)).toEqual([10, 5]);
  });

  it('ignore les séries non corrigées', () => {
    const { series, stats } = setup();
    correctDay(series, '2026-08-27', [8, 8, 8, 8, 8]);
    series.insert('2026-08-28', 'B1', blank);
    expect(stats.recentAverages(5)).toEqual([8]);
  });

  it('se limite aux N dernières séries tout en gardant l\'ordre chronologique', () => {
    const { series, stats } = setup();
    correctDay(series, '2026-08-25', [1, 1, 1, 1, 1]);
    correctDay(series, '2026-08-26', [4, 4, 4, 4, 4]);
    correctDay(series, '2026-08-27', [7, 7, 7, 7, 7]);
    expect(stats.recentAverages(2)).toEqual([4, 7]);
  });
});

describe('StatsRepository.recentTagsBySeries', () => {
  it('groupe les étiquettes par série dans l\'ordre chronologique', () => {
    const { series, stats } = setup();
    correctDay(series, '2026-08-27', [6, 6, 6, 6, 6], [['tense'], ['article'], [], [], []]);
    correctDay(series, '2026-08-28', [6, 6, 6, 6, 6], [['idiom'], [], [], [], []]);

    expect(stats.recentTagsBySeries(3)).toEqual([['tense', 'article'], ['idiom']]);
  });

  it('rend un groupe vide pour une série sans faute', () => {
    const { series, stats } = setup();
    correctDay(series, '2026-08-27', [10, 10, 10, 10, 10]);
    expect(stats.recentTagsBySeries(3)).toEqual([[]]);
  });
});

describe('StatsRepository.correctedDays et dailyScores', () => {
  it('ne rend que les jours corrigés', () => {
    const { series, stats } = setup();
    correctDay(series, '2026-08-27', [9, 9, 9, 9, 9]);
    series.insert('2026-08-28', 'B1', blank);
    expect(stats.correctedDays()).toEqual(['2026-08-27']);
  });

  it('rend la moyenne par jour, triée par jour croissant', () => {
    const { series, stats } = setup();
    correctDay(series, '2026-08-28', [10, 10, 10, 10, 10]);
    correctDay(series, '2026-08-27', [6, 6, 6, 6, 4]);

    expect(stats.dailyScores()).toEqual([
      { day: '2026-08-27', average: 5.6 },
      { day: '2026-08-28', average: 10 },
    ]);
  });
});

describe('SettingsRepository', () => {
  it('rend null pour une clé absente', () => {
    const { db } = setup();
    expect(new SettingsRepository(db).get('base_level')).toBeNull();
  });

  it('écrit puis relit une valeur', () => {
    const { db } = setup();
    const settings = new SettingsRepository(db);
    settings.set('base_level', 'B2');
    expect(settings.get('base_level')).toBe('B2');
  });

  it('écrase une valeur existante', () => {
    const { db } = setup();
    const settings = new SettingsRepository(db);
    settings.set('base_level', 'B2');
    settings.set('base_level', 'C1');
    expect(settings.get('base_level')).toBe('C1');
    expect(db.all('SELECT key FROM settings')).toHaveLength(1);
  });
});

describe('StatsRepository.recentTagsBySeries — une seule requête', () => {
  it("n'émet pas une requête par jour", () => {
    const { db, series } = setup();
    for (const day of ['2026-08-25', '2026-08-26', '2026-08-27', '2026-08-28']) {
      correctDay(series, day, [6, 6, 6, 6, 6], [['tense'], [], [], [], []]);
    }

    let queries = 0;
    const counting: Db = { ...db, all: (sql, params) => (queries++, db.all(sql, params)) };

    new StatsRepository(counting).recentTagsBySeries(4);

    expect(queries).toBe(1);
  });

  it('groupe correctement malgré la requête unique', () => {
    const { series, stats } = setup();
    correctDay(series, '2026-08-27', [6, 6, 6, 6, 6], [['tense'], ['article'], [], [], []]);
    correctDay(series, '2026-08-28', [6, 6, 6, 6, 6], [['idiom'], [], [], [], []]);

    expect(stats.recentTagsBySeries(3)).toEqual([['tense', 'article'], ['idiom']]);
  });
});
