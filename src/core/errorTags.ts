/**
 * Ensemble fermé : sans lui, les statistiques d'historique ne s'agrègent pas
 * et le ciblage des faiblesses n'a rien à quoi se raccrocher.
 */
export const ERROR_TAGS = [
  'tense',
  'preposition',
  'article',
  'word_order',
  'vocabulary',
  'false_friend',
  'agreement',
  'register',
  'spelling',
  'idiom',
] as const;

export type ErrorTag = (typeof ERROR_TAGS)[number];

export const TAG_LABELS_FR: Record<ErrorTag, string> = {
  tense: 'Temps',
  preposition: 'Préposition',
  article: 'Article',
  word_order: 'Ordre des mots',
  vocabulary: 'Vocabulaire',
  false_friend: 'Faux-ami',
  agreement: 'Accord',
  register: 'Registre',
  spelling: 'Orthographe',
  idiom: 'Tournure idiomatique',
};

const LOOKBACK = 3;

/** Étiquettes les plus fréquentes sur les trois dernières séries corrigées. */
export function topWeakTags(seriesTags: ErrorTag[][], limit = 3): ErrorTag[] {
  const counts = new Map<ErrorTag, number>();
  for (const tags of seriesTags.slice(-LOOKBACK)) {
    for (const tag of tags) counts.set(tag, (counts.get(tag) ?? 0) + 1);
  }

  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || ERROR_TAGS.indexOf(a[0]) - ERROR_TAGS.indexOf(b[0]))
    .slice(0, limit)
    .map(([tag]) => tag);
}
