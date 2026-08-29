import Anthropic from '@anthropic-ai/sdk';
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod';
import type { ErrorTag } from '../core/errorTags';
import type { Level } from '../core/levels';
import type { CorrectionItem, NewSentence } from '../data/seriesRepository';
import { AppError, toAppError } from './errors';
import {
  CORRECTION_SYSTEM,
  GENERATION_SYSTEM,
  correctionUserMessage,
  generationUserMessage,
} from './prompts';
import { CorrectionSchema, GeneratedSeriesSchema } from './schemas';

const MODEL = 'claude-opus-5';
const MAX_TOKENS = 16000;
const ATTEMPTS = 2;

type CorrectionInput = {
  position: number;
  source_fr: string;
  reference_en: string;
  user_en: string;
};

export interface AiClient {
  generateSeries(input: {
    level: Level;
    weakTags: ErrorTag[];
    recentSources: string[];
  }): Promise<NewSentence[]>;

  correctSeries(input: {
    level: Level;
    items: CorrectionInput[];
  }): Promise<{ items: CorrectionItem[]; overall: string }>;
}

/**
 * Une réponse hors contrat vaut une seconde chance ; toute autre erreur du SDK
 * n'en vaut aucune — elle est convertie et remonte telle quelle.
 *
 * Le SDK *lève* quand la validation Zod échoue (il ne rend pas un
 * `parsed_output` nul), d'où la reprise sur `bad_response` et non sur une
 * valeur de retour.
 */
async function parseWithRetry<T>(run: () => Promise<{ parsed_output: T | null }>): Promise<T> {
  let last: AppError = new AppError('bad_response');

  for (let attempt = 0; attempt < ATTEMPTS; attempt++) {
    try {
      const response = await run();
      if (response.parsed_output) return response.parsed_output;
      last = new AppError('bad_response');
    } catch (e) {
      const error = toAppError(e);
      if (error.kind !== 'bad_response') throw error;
      last = error;
    }
  }

  throw last;
}

export function makeAiClient(apiKey: string): AiClient {
  const client = new Anthropic({ apiKey });

  return {
    async generateSeries(input) {
      const parsed = await parseWithRetry(() =>
        client.messages.parse({
          model: MODEL,
          max_tokens: MAX_TOKENS,
          thinking: { type: 'adaptive' },
          output_config: { effort: 'low', format: zodOutputFormat(GeneratedSeriesSchema) },
          system: [
            { type: 'text', text: GENERATION_SYSTEM, cache_control: { type: 'ephemeral' } },
          ],
          messages: [{ role: 'user', content: generationUserMessage(input) }],
        }),
      );
      return parsed.sentences;
    },

    async correctSeries(input) {
      const parsed = await parseWithRetry(() =>
        client.messages.parse({
          model: MODEL,
          max_tokens: MAX_TOKENS,
          thinking: { type: 'adaptive' },
          output_config: { effort: 'high', format: zodOutputFormat(CorrectionSchema) },
          system: [
            { type: 'text', text: CORRECTION_SYSTEM, cache_control: { type: 'ephemeral' } },
          ],
          messages: [{ role: 'user', content: correctionUserMessage(input) }],
        }),
      );

      return {
        overall: parsed.overall,
        items: [...parsed.items].sort((a, b) => a.position - b.position),
      };
    },
  };
}
