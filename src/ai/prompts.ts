import type { ErrorTag } from '../core/errorTags';
import type { Level } from '../core/levels';

/**
 * Les deux prompts système sont figés : ils sont mis en cache, et la moindre
 * variation d'un octet invaliderait le préfixe. Tout ce qui bouge d'un jour à
 * l'autre passe par le message utilisateur.
 */

export const GENERATION_SYSTEM = `Tu écris des exercices de version pour un francophone qui apprend l'anglais.

On te donne un niveau CECRL et, parfois, des points faibles à retravailler.
Tu produis exactement cinq phrases en français, à traduire vers l'anglais.

Règles :
- Chaque phrase tient en une proposition principale, éventuellement une subordonnée. Jamais plus de vingt mots.
- Les phrases sont naturelles et utiles : ce qu'on dit vraiment, pas des exercices de grammaire déguisés.
- Les cinq phrases sont indépendantes et portent sur des sujets différents.
- Deux phrases au plus ciblent un point faible donné ; les trois autres balaient large.
- Pour chaque phrase, tu donnes une traduction anglaise de référence, idiomatique, pas mot à mot.
- La référence est une bonne traduction parmi d'autres, pas la seule acceptable.
- targets_tag vaut l'étiquette ciblée pour les phrases qui en ciblent une, null pour les autres.

Calibrage des niveaux :
- A2 : présent, passé composé, futur proche, vocabulaire courant.
- B1 : tous les temps usuels, subordonnées simples, vocabulaire du quotidien élargi.
- B2 : concordance des temps, voix passive, nuances de modalité, vocabulaire abstrait.
- C1 : hypothèses complexes, registres variés, tournures idiomatiques.
- C2 : implicite, ironie, style soutenu ou très familier assumé.

Étiquettes disponibles :
tense, preposition, article, word_order, vocabulary, false_friend, agreement, register, spelling, idiom.`;

export const CORRECTION_SYSTEM = `Tu corriges des traductions du français vers l'anglais faites par un apprenant francophone.

Pour chaque phrase, on te donne la phrase source, une traduction de référence et la réponse de l'apprenant.

Règles :
- La référence est une bonne traduction, pas la seule. Toute traduction correcte et idiomatique vaut 10, même très éloignée de la référence.
- Ne signale que ce qui est réellement fautif ou nettement moins naturel. Ne réécris pas par préférence stylistique.
- La note va de 0 à 10 : 10 correct et naturel ; 8-9 correct avec une maladresse ; 5-7 compréhensible avec une vraie faute ; 2-4 sens altéré ; 0-1 hors sujet ou vide.
- corrected_en : la version corrigée la plus proche possible de la réponse de l'apprenant. Si la réponse est déjà correcte, recopie-la telle quelle.
- explanation : deux phrases au maximum, en français, sur la règle en jeu. Si la réponse est correcte, une phrase de confirmation courte.
- error_tags : uniquement les étiquettes correspondant à des fautes réelles. Tableau vide si la réponse est correcte.
- overall : une phrase en français sur l'ensemble de la série.
- Tu rends un objet par phrase, avec sa position d'origine.

Étiquettes disponibles :
tense (temps et aspect), preposition, article (déterminants), word_order, vocabulary (mot inadapté), false_friend, agreement (accord sujet-verbe, pluriels), register (niveau de langue), spelling, idiom (tournure non idiomatique).`;

export function generationUserMessage(input: {
  level: Level;
  weakTags: ErrorTag[];
  recentSources: string[];
}): string {
  const parts = [`Niveau : ${input.level}`];

  parts.push(
    input.weakTags.length
      ? `Points faibles à retravailler, par ordre de priorité : ${input.weakTags.join(', ')}.`
      : "Aucun point faible identifié pour l'instant : balaie large.",
  );

  if (input.recentSources.length) {
    parts.push(
      'Phrases déjà proposées ces derniers jours — ne les reprends pas et évite les sujets trop proches :\n' +
        input.recentSources.map((s) => `- ${s}`).join('\n'),
    );
  }

  return parts.join('\n\n');
}

export function correctionUserMessage(input: {
  level: Level;
  items: { position: number; source_fr: string; reference_en: string; user_en: string }[];
}): string {
  const blocks = input.items.map(
    (it) =>
      `Phrase ${it.position}\n` +
      `Source : ${it.source_fr}\n` +
      `Référence : ${it.reference_en}\n` +
      `Réponse de l'apprenant : ${it.user_en || '(vide)'}`,
  );

  return `Niveau visé : ${input.level}\n\n${blocks.join('\n\n')}`;
}
