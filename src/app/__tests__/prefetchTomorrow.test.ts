import { AppError } from '../../ai/errors';
import { prefetchTomorrow } from '../prefetchTomorrow';
import { retryPendingCorrection } from '../retryPendingCorrection';
import { ANSWERS, FIVE, makeHarness } from './fixtures';

describe('prefetchTomorrow', () => {
  it('génère la série du lendemain au statut pending', async () => {
    const { deps, generateSeries } = makeHarness();

    await prefetchTomorrow(deps);

    expect(generateSeries).toHaveBeenCalledTimes(1);
    const tomorrow = deps.series.findByDay('2026-08-30');
    expect(tomorrow).not.toBeNull();
    expect(tomorrow!.status).toBe('pending');
  });

  it('ne fait rien si le lendemain est déjà prêt', async () => {
    const { deps, generateSeries } = makeHarness();
    deps.series.insert('2026-08-30', 'B1', FIVE);

    await prefetchTomorrow(deps);

    expect(generateSeries).not.toHaveBeenCalled();
  });

  it('avale une panne réseau sans rien écrire', async () => {
    const { deps, generateSeries } = makeHarness();
    generateSeries.mockRejectedValue(new AppError('offline'));

    await expect(prefetchTomorrow(deps)).resolves.toBeUndefined();
    expect(deps.series.findByDay('2026-08-30')).toBeNull();
  });
});

describe('retryPendingCorrection', () => {
  it("rend null quand aucune série n'attend sa correction", async () => {
    const { deps } = makeHarness();
    await expect(retryPendingCorrection(deps)).resolves.toBeNull();
  });

  it('corrige la série en attente et la rend', async () => {
    const { deps } = makeHarness();
    const series = deps.series.insert('2026-08-28', 'B1', FIVE);
    deps.series.saveAnswers(series.id, ANSWERS);
    deps.series.setStatus(series.id, 'awaiting_correction');

    const corrected = await retryPendingCorrection(deps);

    expect(corrected).not.toBeNull();
    expect(corrected!.day).toBe('2026-08-28');
    expect(corrected!.status).toBe('corrected');
  });

  it('laisse la série en attente si la correction échoue encore', async () => {
    const { deps, correctSeries } = makeHarness();
    const series = deps.series.insert('2026-08-28', 'B1', FIVE);
    deps.series.saveAnswers(series.id, ANSWERS);
    deps.series.setStatus(series.id, 'awaiting_correction');
    correctSeries.mockRejectedValue(new AppError('offline'));

    await expect(retryPendingCorrection(deps)).resolves.toBeNull();
    expect(deps.series.findByDay('2026-08-28')!.status).toBe('awaiting_correction');
  });

  it('reprend la plus ancienne série en attente', async () => {
    const { deps } = makeHarness();
    for (const day of ['2026-08-26', '2026-08-27']) {
      const s = deps.series.insert(day, 'B1', FIVE);
      deps.series.saveAnswers(s.id, ANSWERS);
      deps.series.setStatus(s.id, 'awaiting_correction');
    }

    const corrected = await retryPendingCorrection(deps);

    expect(corrected!.day).toBe('2026-08-26');
  });
});
