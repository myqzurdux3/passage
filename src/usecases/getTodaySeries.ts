import { localDay } from '../core/date';
import type { StoredSeries } from '../data/seriesRepository';
import type { Deps } from './deps';
import { generateSeriesFor, resolveLevel } from './generateSeriesFor';

export { DEFAULT_BASE_LEVEL, resolveLevel } from './generateSeriesFor';

export async function getTodaySeries(deps: Deps): Promise<StoredSeries> {
  const day = localDay(deps.now());

  // Les séries d'avant-hier restées `pending` n'ont jamais été jouées et ne le
  // seront pas : elles ne feraient que polluer les phrases récentes.
  deps.series.purgeStalePending(day);

  const existing = deps.series.findByDay(day);
  if (existing) {
    // Une série préchargée hier a pu être calculée sur un niveau depuis
    // modifié dans les réglages : on la régénère plutôt que de servir des
    // phrases qui contredisent le réglage affiché.
    if (existing.status !== 'pending' || existing.level === resolveLevel(deps)) return existing;

    deps.series.remove(existing.id);
  }

  return generateSeriesFor(deps, day);
}
