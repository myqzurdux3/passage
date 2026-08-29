import { addDays, localDay } from '../core/date';
import type { Deps } from './deps';
import { generateSeriesFor } from './generateSeriesFor';

/**
 * Prépare la série du lendemain pour que la phase de traduction fonctionne
 * hors ligne. Appelée après une correction réussie, jamais au lancement : la
 * série de demain doit tenir compte du résultat du jour, sans quoi l'adaptatif
 * a systématiquement un jour de retard.
 *
 * N'échoue jamais : elle est appelée en marge d'autre chose.
 */
export async function prefetchTomorrow(deps: Deps): Promise<void> {
  const tomorrow = addDays(localDay(deps.now()), 1);
  if (deps.series.findByDay(tomorrow)) return;

  try {
    await generateSeriesFor(deps, tomorrow);
  } catch {
    // Sans réseau, demain se générera à l'ouverture. Rien à signaler.
  }
}
