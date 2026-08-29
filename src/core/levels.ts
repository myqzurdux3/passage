const LEVELS = ['A2', 'B1', 'B2', 'C1', 'C2'] as const;
export type Level = (typeof LEVELS)[number];

/** Niveaux proposés à l'utilisateur comme plancher. C2 s'atteint, il ne se choisit pas. */
export const BASE_LEVELS: readonly Level[] = ['A2', 'B1', 'B2', 'C1'];

export const LEVEL_LABELS_FR: Record<Level, string> = {
  A2: 'A2 — élémentaire',
  B1: 'B1 — seuil',
  B2: 'B2 — avancé',
  C1: 'C1 — autonome',
  C2: 'C2 — maîtrise',
};

/** Séries prises en compte par l'adaptatif. Exportée pour que la requête
 * en base et le calcul s'accordent sur le même nombre. */
export const AVERAGES_WINDOW = 5;
const MIN_SERIES = 3;
const UP = 8.5;
const DOWN = 5.5;

/**
 * Le niveau de base est un plancher de référence, pas une suggestion :
 * l'ajustement ne dévie jamais de plus d'un cran, dans les deux sens.
 */
export function effectiveLevel(base: Level, recentAverages: number[]): Level {
  const window = recentAverages.slice(-AVERAGES_WINDOW);
  if (window.length < MIN_SERIES) return base;

  const mean = window.reduce((a, b) => a + b, 0) / window.length;
  const shift = mean >= UP ? 1 : mean <= DOWN ? -1 : 0;

  const index = LEVELS.indexOf(base) + shift;
  return LEVELS[Math.min(Math.max(index, 0), LEVELS.length - 1)];
}
