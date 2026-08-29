import { localDay } from '../core/date';
import { topWeakTags } from '../core/errorTags';
import { effectiveLevel, type Level } from '../core/levels';
import { SETTING_KEYS } from '../data/settingsRepository';
import type { StoredSeries } from '../data/seriesRepository';
import type { Deps } from './deps';

export const DEFAULT_BASE_LEVEL: Level = 'B1';

/** Fenêtres de l'adaptatif, fixées par la conception. */
const AVERAGES_WINDOW = 5;
const TAGS_WINDOW = 3;
const RECENT_SOURCES_DAYS = 7;

export function resolveLevel(deps: Deps): Level {
  const base = (deps.settings.get(SETTING_KEYS.baseLevel) ?? DEFAULT_BASE_LEVEL) as Level;
  return effectiveLevel(base, deps.stats.recentAverages(AVERAGES_WINDOW));
}

export async function getTodaySeries(deps: Deps): Promise<StoredSeries> {
  const day = localDay(deps.now());

  const existing = deps.series.findByDay(day);
  if (existing) return existing;

  const level = resolveLevel(deps);
  const sentences = await deps.ai.generateSeries({
    level,
    weakTags: topWeakTags(deps.stats.recentTagsBySeries(TAGS_WINDOW)),
    recentSources: deps.series.recentSources(RECENT_SOURCES_DAYS),
  });

  return deps.series.insert(day, level, sentences);
}
