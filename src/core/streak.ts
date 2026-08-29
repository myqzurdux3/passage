import { addDays } from './date';

/**
 * Jours consécutifs terminés. La série reste vivante tant qu'aujourd'hui n'est
 * pas fini : on part d'aujourd'hui s'il est fait, sinon d'hier.
 */
export function currentStreak(correctedDays: string[], today: string): number {
  const days = new Set(correctedDays);

  let cursor = days.has(today) ? today : addDays(today, -1);
  if (!days.has(cursor)) return 0;

  let count = 0;
  while (days.has(cursor)) {
    count++;
    cursor = addDays(cursor, -1);
  }
  return count;
}
