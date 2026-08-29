import { AppError } from '../../ai/errors';
import { getTodaySeries, resolveLevel } from '../getTodaySeries';
import { FIVE, makeHarness } from './fixtures';

describe('getTodaySeries', () => {
  it('rend la série du jour sans appeler le modèle si elle existe déjà', async () => {
    const { deps, generateSeries } = makeHarness();
    deps.series.insert('2026-08-29', 'B1', FIVE);

    const series = await getTodaySeries(deps);

    expect(series.day).toBe('2026-08-29');
    expect(generateSeries).not.toHaveBeenCalled();
  });

  it('génère, écrit en base au statut pending, puis rend la série', async () => {
    const { deps, generateSeries } = makeHarness();

    const series = await getTodaySeries(deps);

    expect(generateSeries).toHaveBeenCalledTimes(1);
    expect(series.status).toBe('pending');
    expect(series.sentences).toHaveLength(5);
    expect(deps.series.findByDay('2026-08-29')).not.toBeNull();
  });

  it('passe le niveau effectif au modèle', async () => {
    const { deps, generateSeries } = makeHarness();
    deps.settings.set('base_level', 'B1');

    await getTodaySeries(deps);

    expect(generateSeries.mock.calls[0][0].level).toBe('B1');
  });

  it("retombe sur B1 quand aucun niveau de base n'est enregistré", async () => {
    const { deps, generateSeries } = makeHarness();
    await getTodaySeries(deps);
    expect(generateSeries.mock.calls[0][0].level).toBe('B1');
  });

  it('transmet les phrases des sept derniers jours effectivement jouées', async () => {
    const { deps, generateSeries } = makeHarness();
    const played = deps.series.insert('2026-08-28', 'B1', [
      { source_fr: 'Déjà vue.', reference_en: 'Seen.', targets_tag: null },
    ]);
    deps.series.setStatus(played.id, 'corrected');

    await getTodaySeries(deps);

    expect(generateSeries.mock.calls[0][0].recentSources).toContain('Déjà vue.');
  });

  it('transmet les points faibles récents', async () => {
    const { deps, generateSeries } = makeHarness();
    const past = deps.series.insert('2026-08-28', 'B1', FIVE);
    deps.series.saveAnswers(
      past.id,
      FIVE.map((_, i) => ({ position: i + 1, user_en: 'x' })),
    );
    deps.series.saveCorrections(
      past.id,
      FIVE.map((_, i) => ({
        position: i + 1,
        score: 6,
        corrected_en: 'ok',
        explanation: '',
        error_tags: i < 3 ? (['tense'] as const).slice() : [],
      })),
    );

    await getTodaySeries(deps);

    expect(generateSeries.mock.calls[0][0].weakTags).toEqual(['tense']);
  });

  it("laisse remonter l'erreur réseau quand rien n'est en base", async () => {
    const { deps, generateSeries } = makeHarness();
    generateSeries.mockRejectedValue(new AppError('offline'));

    await expect(getTodaySeries(deps)).rejects.toMatchObject({ kind: 'offline' });
    expect(deps.series.findByDay('2026-08-29')).toBeNull();
  });
});

describe('resolveLevel', () => {
  it('monte le niveau après trois séries excellentes', () => {
    const { deps } = makeHarness();
    deps.settings.set('base_level', 'B1');

    for (const day of ['2026-08-25', '2026-08-26', '2026-08-27']) {
      const s = deps.series.insert(day, 'B1', FIVE);
      deps.series.saveAnswers(
        s.id,
        FIVE.map((_, i) => ({ position: i + 1, user_en: 'x' })),
      );
      deps.series.saveCorrections(
        s.id,
        FIVE.map((_, i) => ({
          position: i + 1,
          score: 10,
          corrected_en: 'ok',
          explanation: '',
          error_tags: [],
        })),
      );
    }

    expect(resolveLevel(deps)).toBe('B2');
  });
});

describe('getTodaySeries — série préchargée périmée', () => {
  /** Corrige une journée entière avec la note voulue. */
  function correctDay(deps: ReturnType<typeof makeHarness>['deps'], day: string, score: number) {
    const s = deps.series.insert(day, 'B1', FIVE);
    deps.series.saveAnswers(
      s.id,
      FIVE.map((_, i) => ({ position: i + 1, user_en: 'x' })),
    );
    deps.series.saveCorrections(
      s.id,
      FIVE.map((_, i) => ({
        position: i + 1,
        score,
        corrected_en: 'ok',
        explanation: '',
        error_tags: [],
      })),
    );
  }

  it('régénère une série préchargée dont le niveau ne correspond plus au réglage', async () => {
    const { deps, generateSeries } = makeHarness();
    deps.settings.set('base_level', 'B1');
    deps.series.insert('2026-08-29', 'B1', FIVE);

    deps.settings.set('base_level', 'C1');
    const series = await getTodaySeries(deps);

    expect(generateSeries).toHaveBeenCalledTimes(1);
    expect(series.level).toBe('C1');
    expect(deps.stats.correctedDays()).toEqual([]);
  });

  it('conserve une série déjà commencée même si le niveau a changé', async () => {
    const { deps, generateSeries } = makeHarness();
    deps.settings.set('base_level', 'B1');
    const existing = deps.series.insert('2026-08-29', 'B1', FIVE);
    deps.series.saveAnswers(existing.id, [{ position: 1, user_en: 'déjà tapé' }]);
    deps.series.setStatus(existing.id, 'in_progress');

    deps.settings.set('base_level', 'C1');
    const series = await getTodaySeries(deps);

    expect(generateSeries).not.toHaveBeenCalled();
    expect(series.sentences[0].user_en).toBe('déjà tapé');
  });

  it('conserve une série préchargée dont le niveau est toujours bon', async () => {
    const { deps, generateSeries } = makeHarness();
    deps.settings.set('base_level', 'B1');
    deps.series.insert('2026-08-29', 'B1', FIVE);

    await getTodaySeries(deps);

    expect(generateSeries).not.toHaveBeenCalled();
  });

  it("tient compte de la montée de niveau provoquée par les séries corrigées", async () => {
    const { deps, generateSeries } = makeHarness();
    deps.settings.set('base_level', 'B1');
    for (const day of ['2026-08-25', '2026-08-26', '2026-08-27']) correctDay(deps, day, 10);
    deps.series.insert('2026-08-29', 'B1', FIVE);

    const series = await getTodaySeries(deps);

    expect(generateSeries).toHaveBeenCalledTimes(1);
    expect(series.level).toBe('B2');
  });
});
