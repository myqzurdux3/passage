/**
 * Vérification manuelle des deux appels réels, sur les *vrais* prompts et le
 * vrai client — l'ancien script recopiait les siens, qui avaient divergé.
 *
 * Jamais lancé par la suite de tests : cet appel coûte de l'argent.
 *
 *   ANTHROPIC_API_KEY=sk-ant-… npm run smoke
 */
import { makeAiClient } from '../claude';

const apiKey = process.env.ANTHROPIC_API_KEY;

// Réponses volontairement fautives : temps, préposition, accord, idiome.
const WRONG_ANSWERS = [
  'I am go to the shop yesterday.',
  'She depends of her brother.',
  'The informations was very useful.',
  'I have seen him last week.',
  'He suggested me to wait.',
];

const itWithKey = apiKey ? it : it.skip;

describe('appels réels à l’API', () => {
  jest.setTimeout(300_000);

  itWithKey('génère cinq phrases puis les corrige', async () => {
    const client = makeAiClient(apiKey!);

    const sentences = await client.generateSeries({
      level: 'B1',
      weakTags: [],
      recentSources: [],
    });
    expect(sentences).toHaveLength(5);
    for (const s of sentences) {
      console.log(`  · ${s.source_fr}  →  ${s.reference_en}`);
    }

    const correction = await client.correctSeries({
      level: 'B1',
      items: sentences.map((s, i) => ({
        position: i + 1,
        source_fr: s.source_fr,
        reference_en: s.reference_en,
        user_en: WRONG_ANSWERS[i],
      })),
    });

    expect(correction.items).toHaveLength(5);
    expect(new Set(correction.items.map((i) => i.position)).size).toBe(5);

    for (const item of correction.items) {
      console.log(`\n  ${item.position}. ${item.score}/10  ${item.error_tags.join(', ') || '—'}`);
      console.log(`     ${item.corrected_en}`);
      console.log(`     ${item.explanation}`);
    }
    console.log(`\n  ${correction.overall}`);

    // Les fautes glissées ci-dessus doivent être relevées.
    expect(correction.items.some((i) => i.error_tags.length > 0)).toBe(true);
  });
});
