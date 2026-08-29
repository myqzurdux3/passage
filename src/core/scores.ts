/** Arrondi au dixième, seule règle d'affichage des notes de l'application. */
export function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

/**
 * Moyenne des notes réellement attribuées. Rend `null` quand il n'y en a
 * aucune, plutôt qu'un `NaN` qui se propagerait jusqu'à l'écran.
 */
export function averageScore(scores: readonly (number | null)[]): number | null {
  const scored = scores.filter((s): s is number => s !== null);
  if (scored.length === 0) return null;
  return round1(scored.reduce((sum, s) => sum + s, 0) / scored.length);
}

/** Seuils de lecture d'une note, partagés par la pastille et le calendrier. */
const GOOD_SCORE = 8;
const FAIR_SCORE = 5;

export type ScoreBand = 'good' | 'fair' | 'poor';

export function scoreBand(score: number): ScoreBand {
  if (score >= GOOD_SCORE) return 'good';
  if (score >= FAIR_SCORE) return 'fair';
  return 'poor';
}

/** « 3 jours d'affilée », avec le pluriel écrit une seule fois. */
export function formatStreak(days: number): string {
  return `${days} jour${days > 1 ? 's' : ''} d’affilée`;
}
