import type { StoredSeries } from '../data/seriesRepository';
import { correctSeriesFor } from './correctSeriesFor';
import type { Deps } from './deps';

/**
 * Reprend les corrections restées en plan. Deux statuts sont concernés :
 * `awaiting_correction` (l'appel a échoué) et `in_progress` (l'application a
 * été tuée pendant la correction) — sans quoi une série tuée en vol serait
 * perdue le lendemain, sans jamais réapparaître dans l'historique.
 *
 * Chaque série est tentée indépendamment : un échec durable sur l'une ne doit
 * pas bloquer indéfiniment toutes les suivantes.
 *
 * Rend la première série effectivement corrigée, ou `null` si rien ne l'a été.
 */
export async function retryPendingCorrection(deps: Deps): Promise<StoredSeries | null> {
  const pending = deps.series
    .findAllByStatus('awaiting_correction', 'in_progress')
    // Une série en cours sans aucune réponse saisie n'a rien à corriger.
    .filter((series) => series.sentences.some((s) => (s.user_en ?? '').trim().length > 0));

  let first: StoredSeries | null = null;

  for (const series of pending) {
    try {
      const corrected = await correctSeriesFor(deps, series);
      first ??= corrected;
    } catch {
      // Série laissée en `awaiting_correction` : on retentera au prochain
      // lancement, sans empêcher les autres d'aboutir maintenant.
    }
  }

  return first;
}
