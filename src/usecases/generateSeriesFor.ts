import { TAGS_LOOKBACK, topWeakTags } from '../core/errorTags';
import { AVERAGES_WINDOW, effectiveLevel, type Level } from '../core/levels';
import { SETTING_KEYS } from '../data/settingsRepository';
import type { StoredSeries } from '../data/seriesRepository';
import type { Deps } from './deps';

export const DEFAULT_BASE_LEVEL: Level = 'B1';

/** Jours de phrases rappelés au modèle pour qu'il évite les redites. */
const RECENT_SOURCES_DAYS = 7;

export function resolveLevel(deps: Deps): Level {
  const base = (deps.settings.get(SETTING_KEYS.baseLevel) ?? DEFAULT_BASE_LEVEL) as Level;
  return effectiveLevel(base, deps.stats.recentAverages(AVERAGES_WINDOW));
}

/**
 * Génère et enregistre la série d'un jour donné. Chemin unique : quand la
 * série du jour et celle du lendemain étaient produites par deux blocs
 * recopiés, une évolution de la stratégie appliquée d'un seul côté les aurait
 * fait diverger sans qu'aucun test ne le voie.
 */
export async function generateSeriesFor(deps: Deps, day: string): Promise<StoredSeries> {
  const level = resolveLevel(deps);

  const sentences = await deps.ai.generateSeries({
    level,
    weakTags: topWeakTags(deps.stats.recentTagsBySeries(TAGS_LOOKBACK)),
    recentSources: deps.series.recentSources(RECENT_SOURCES_DAYS),
  });

  return deps.series.insert(day, level, sentences);
}
