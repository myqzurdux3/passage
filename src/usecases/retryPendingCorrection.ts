import type { StoredSeries } from '../data/seriesRepository';
import { correctSeriesFor } from './correctSeriesFor';
import type { Deps } from './deps';

/**
 * Reprend la plus ancienne série dont la correction a échoué.
 * Appelée au lancement, sans bloquer l'affichage : un nouvel échec est silencieux.
 */
export async function retryPendingCorrection(deps: Deps): Promise<StoredSeries | null> {
  const pending = deps.series.findFirstByStatus('awaiting_correction');
  if (!pending) return null;

  try {
    return await correctSeriesFor(deps, pending);
  } catch {
    return null;
  }
}
