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

/** Désérialisation défensive du JSON stocké, filtrée sur les étiquettes connues. */
export function parseErrorTags(raw: string | null): ErrorTag[] {
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((t): t is ErrorTag => ERROR_TAGS.includes(t as ErrorTag));
  } catch {
    return [];
  }
}

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

/**
 * Nombre de séries examinées pour cibler les faiblesses dans la génération.
 * Une seule définition : quand la fenêtre vivait à la fois ici et chez
 * l'appelant, l'écran d'historique en demandait dix et n'en analysait que trois.
 */
export const TAGS_LOOKBACK = 3;

/**
 * Étiquettes les plus fréquentes parmi les séries fournies.
 * La fenêtre temporelle est le choix de l'appelant : tout ce qu'on lui passe
 * est compté.
 */
export function topWeakTags(seriesTags: ErrorTag[][], limit = 3): ErrorTag[] {
  const counts = new Map<ErrorTag, number>();
  for (const tags of seriesTags) {
    for (const tag of tags) counts.set(tag, (counts.get(tag) ?? 0) + 1);
  }

  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || ERROR_TAGS.indexOf(a[0]) - ERROR_TAGS.indexOf(b[0]))
    .slice(0, limit)
    .map(([tag]) => tag);
}
