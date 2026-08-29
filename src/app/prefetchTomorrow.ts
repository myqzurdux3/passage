import { addDays, localDay } from '../core/date';
import { topWeakTags } from '../core/errorTags';
import type { Deps } from './deps';
import { resolveLevel } from './getTodaySeries';

const TAGS_WINDOW = 3;
const RECENT_SOURCES_DAYS = 7;

/**
 * Prépare la série du lendemain pour que la phase de traduction fonctionne hors
 * ligne. N'échoue jamais : elle est appelée en marge d'autre chose.
 */
export async function prefetchTomorrow(deps: Deps): Promise<void> {
  const tomorrow = addDays(localDay(deps.now()), 1);
  if (deps.series.findByDay(tomorrow)) return;

  try {
    const level = resolveLevel(deps);
    const sentences = await deps.ai.generateSeries({
      level,
      weakTags: topWeakTags(deps.stats.recentTagsBySeries(TAGS_WINDOW)),
      recentSources: deps.series.recentSources(RECENT_SOURCES_DAYS),
    });
    deps.series.insert(tomorrow, level, sentences);
  } catch {
    // Sans réseau, demain se générera à l'ouverture. Rien à signaler.
  }
}
