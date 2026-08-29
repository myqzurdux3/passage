import type { AiClient } from '../ai/claude';
import type { SeriesRepository } from '../data/seriesRepository';
import type { SettingsRepository } from '../data/settingsRepository';
import type { StatsRepository } from '../data/statsRepository';

/**
 * Tout ce dont un cas d'usage a besoin, passé en paramètre plutôt qu'importé :
 * les tests injectent des doublures, `container.ts` fournit l'assemblage réel.
 */
export type Deps = {
  series: SeriesRepository;
  settings: SettingsRepository;
  stats: StatsRepository;
  ai: AiClient;
  now: () => Date;
};
