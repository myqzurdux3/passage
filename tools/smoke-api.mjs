// Vérification manuelle des deux appels réels, avec des réponses volontairement
// fautives pour voir ce que la correction produit.
//
// Jamais lancé par la suite de tests : cet appel coûte de l'argent.
//
//   ANTHROPIC_API_KEY=sk-ant-… node tools/smoke-api.mjs

import Anthropic from '@anthropic-ai/sdk';
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod';
import { z } from 'zod';

const ERROR_TAGS = [
  'tense', 'preposition', 'article', 'word_order', 'vocabulary',
  'false_friend', 'agreement', 'register', 'spelling', 'idiom',
];

const GENERATION_SYSTEM = `Tu écris des exercices de version pour un francophone qui apprend l'anglais.

On te donne un niveau CECRL et, parfois, des points faibles à retravailler.
Tu produis exactement cinq phrases en français, à traduire vers l'anglais.

Règles :
- Chaque phrase tient en une proposition principale, éventuellement une subordonnée. Jamais plus de vingt mots.
- Les phrases sont naturelles et utiles : ce qu'on dit vraiment, pas des exercices de grammaire déguisés.
- Les cinq phrases sont indépendantes et portent sur des sujets différents.
- Pour chaque phrase, tu donnes une traduction anglaise de référence, idiomatique, pas mot à mot.
- targets_tag vaut l'étiquette ciblée, ou null.`;

const CORRECTION_SYSTEM = `Tu corriges des traductions du français vers l'anglais faites par un apprenant francophone.

- Toute traduction correcte et idiomatique vaut 10, même éloignée de la référence.
- corrected_en reste au plus près de la réponse de l'apprenant.
- explanation : deux phrases au maximum, en français.
- error_tags : uniquement les fautes réelles.`;

const SeriesSchema = z.object({
  sentences: z
    .array(
      z.object({
        source_fr: z.string(),
        reference_en: z.string(),
        targets_tag: z.enum(ERROR_TAGS).nullable(),
      }),
    )
    .length(5),
});

const CorrectionSchema = z.object({
  items: z
    .array(
      z.object({
        position: z.number().int(),
        score: z.number().int(),
        corrected_en: z.string(),
        explanation: z.string(),
        error_tags: z.array(z.enum(ERROR_TAGS)),
      }),
    )
    .length(5),
  overall: z.string(),
});

const client = new Anthropic();

console.log('→ génération (niveau B1)…');
const generated = await client.messages.parse({
  model: 'claude-opus-5',
  max_tokens: 16000,
  thinking: { type: 'adaptive' },
  output_config: { effort: 'low', format: zodOutputFormat(SeriesSchema) },
  system: [{ type: 'text', text: GENERATION_SYSTEM, cache_control: { type: 'ephemeral' } }],
  messages: [{ role: 'user', content: 'Niveau : B1\n\nAucun point faible identifié : balaie large.' }],
});

const sentences = generated.parsed_output?.sentences;
if (!sentences) throw new Error('Génération illisible.');

for (const s of sentences) console.log(`  · ${s.source_fr}  →  ${s.reference_en}`);

// Réponses volontairement fautives : temps, préposition, accord.
const answers = [
  'I am go to the shop yesterday.',
  'She depends of her brother.',
  'The informations was very useful.',
  'I have seen him last week.',
  'He suggested me to wait.',
];

console.log('\n→ correction…');
const corrected = await client.messages.parse({
  model: 'claude-opus-5',
  max_tokens: 16000,
  thinking: { type: 'adaptive' },
  output_config: { effort: 'high', format: zodOutputFormat(CorrectionSchema) },
  system: [{ type: 'text', text: CORRECTION_SYSTEM, cache_control: { type: 'ephemeral' } }],
  messages: [
    {
      role: 'user',
      content:
        'Niveau visé : B1\n\n' +
        sentences
          .map(
            (s, i) =>
              `Phrase ${i + 1}\nSource : ${s.source_fr}\nRéférence : ${s.reference_en}\n` +
              `Réponse de l'apprenant : ${answers[i]}`,
          )
          .join('\n\n'),
    },
  ],
});

const correction = corrected.parsed_output;
if (!correction) throw new Error('Correction illisible.');

for (const item of correction.items.sort((a, b) => a.position - b.position)) {
  console.log(`\n  ${item.position}. ${item.score}/10  ${item.error_tags.join(', ') || '—'}`);
  console.log(`     ${item.corrected_en}`);
  console.log(`     ${item.explanation}`);
}
console.log(`\n  ${correction.overall}`);
