import { useMemo } from 'react';
import { localDay } from '../core/date';
import { currentStreak } from '../core/streak';
import { useDeps } from './AppProvider';

/**
 * Jours consécutifs terminés. Trois écrans l'affichent ; sans ce point unique,
 * chacun relisait la base à sa façon, dont un sans mémoïsation.
 */
export function useStreak(refreshKey = 0): number {
  const deps = useDeps();

  return useMemo(
    () => currentStreak(deps.stats.correctedDays(), localDay(deps.now())),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [deps, refreshKey],
  );
}
