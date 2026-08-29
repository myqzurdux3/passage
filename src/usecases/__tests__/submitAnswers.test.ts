import { AppError } from '../../ai/errors';
import { submitAnswers } from '../submitAnswers';
import { ANSWERS, FIVE, makeHarness } from './fixtures';

describe('submitAnswers', () => {
  it('écrit les corrections et passe la série à corrected', async () => {
    const { deps } = makeHarness();
    const series = deps.series.insert('2026-08-29', 'B1', FIVE);

    const corrected = await submitAnswers(deps, series.id, ANSWERS);

    expect(corrected.status).toBe('corrected');
    expect(corrected.sentences[0].score).toBe(8);
    expect(corrected.sentences[0].corrected_en).toBe('corrected 1');
  });

  it('transmet source, référence et réponse au modèle', async () => {
    const { deps, correctSeries } = makeHarness();
    const series = deps.series.insert('2026-08-29', 'B1', FIVE);

    await submitAnswers(deps, series.id, ANSWERS);

    const sent = correctSeries.mock.calls[0][0];
    expect(sent.level).toBe('B1');
    expect(sent.items[0]).toEqual({
      position: 1,
      source_fr: 'Phrase 1.',
      reference_en: 'Sentence 1.',
      user_en: 'answer 1',
    });
  });

  it("écrit les réponses avant l'appel réseau", async () => {
    const { deps, correctSeries } = makeHarness();
    const series = deps.series.insert('2026-08-29', 'B1', FIVE);
    correctSeries.mockRejectedValue(new AppError('offline'));

    await expect(submitAnswers(deps, series.id, ANSWERS)).rejects.toMatchObject({
      kind: 'offline',
    });

    const stored = deps.series.findByDay('2026-08-29')!;
    expect(stored.sentences[0].user_en).toBe('answer 1');
  });

  it('passe la série à awaiting_correction quand le réseau tombe', async () => {
    const { deps, correctSeries } = makeHarness();
    const series = deps.series.insert('2026-08-29', 'B1', FIVE);
    correctSeries.mockRejectedValue(new AppError('offline'));

    await expect(submitAnswers(deps, series.id, ANSWERS)).rejects.toThrow();
    expect(deps.series.findByDay('2026-08-29')!.status).toBe('awaiting_correction');
  });

  it('traite une limite de débit comme une correction à reprendre', async () => {
    const { deps, correctSeries } = makeHarness();
    const series = deps.series.insert('2026-08-29', 'B1', FIVE);
    correctSeries.mockRejectedValue(new AppError('rate_limited'));

    await expect(submitAnswers(deps, series.id, ANSWERS)).rejects.toMatchObject({
      kind: 'rate_limited',
    });
    expect(deps.series.findByDay('2026-08-29')!.status).toBe('awaiting_correction');
  });

  it("laisse remonter une clé invalide telle quelle", async () => {
    const { deps, correctSeries } = makeHarness();
    const series = deps.series.insert('2026-08-29', 'B1', FIVE);
    correctSeries.mockRejectedValue(new AppError('invalid_key'));

    await expect(submitAnswers(deps, series.id, ANSWERS)).rejects.toMatchObject({
      kind: 'invalid_key',
    });
  });

  it('corrige bien la série soumise même si minuit passe entre-temps', async () => {
    const { deps, setNow, correctSeries } = makeHarness(new Date(2026, 7, 29, 23, 50));
    const today = deps.series.insert('2026-08-29', 'B1', FIVE);
    // La série de demain a déjà été préchargée : c'est elle que le bug attrapait.
    deps.series.insert('2026-08-30', 'B1', FIVE);

    setNow(new Date(2026, 7, 30, 0, 1));
    const corrected = await submitAnswers(deps, today.id, ANSWERS);

    expect(corrected.day).toBe('2026-08-29');
    expect(corrected.status).toBe('corrected');
    expect(deps.series.findByDay('2026-08-30')!.status).toBe('pending');
    expect(correctSeries.mock.calls[0][0].items[0].user_en).toBe('answer 1');
  });

  it('déclenche la génération du lendemain après un succès', async () => {
    const { deps, generateSeries } = makeHarness();
    const series = deps.series.insert('2026-08-29', 'B1', FIVE);

    await submitAnswers(deps, series.id, ANSWERS);
    await Promise.resolve();

    expect(generateSeries).toHaveBeenCalledTimes(1);
    expect(deps.series.findByDay('2026-08-30')).not.toBeNull();
  });

  it('rend la série corrigée même si la génération du lendemain échoue', async () => {
    const { deps, generateSeries } = makeHarness();
    const series = deps.series.insert('2026-08-29', 'B1', FIVE);
    generateSeries.mockRejectedValue(new AppError('offline'));

    const corrected = await submitAnswers(deps, series.id, ANSWERS);

    expect(corrected.status).toBe('corrected');
  });
});
