import { toAppError } from '../ai/errors';
import type { StoredSeries } from '../data/seriesRepository';
import type { Deps } from './deps';

/**
 * Correction d'une série déjà saisie. Partagée entre la validation du jour et
 * la reprise au lancement : les deux passent par le même chemin, la seule
 * différence est ce qu'elles font de l'erreur.
 */
export async function correctSeriesFor(deps: Deps, series: StoredSeries): Promise<StoredSeries> {
  try {
    const correction = await deps.ai.correctSeries({
      level: series.level,
      items: series.sentences.map((s) => ({
        position: s.position,
        source_fr: s.source_fr,
        reference_en: s.reference_en,
        user_en: s.user_en ?? '',
      })),
    });
    deps.series.saveCorrections(series.id, correction.items, correction.overall);
  } catch (e) {
    deps.series.setStatus(series.id, 'awaiting_correction');
    throw toAppError(e);
  }

  const corrected = deps.series.findById(series.id);
  if (!corrected) throw new Error(`Série introuvable après correction : ${series.id}`);
  return corrected;
}
