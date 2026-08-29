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

export type CorrectionInput = {
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
 * Une réponse illisible vaut une seconde chance ; une erreur du SDK n'en vaut
 * aucune — elle est convertie et remonte telle quelle.
 */
async function parseWithRetry<T>(run: () => Promise<{ parsed_output: T | null }>): Promise<T> {
  for (let attempt = 0; attempt < ATTEMPTS; attempt++) {
    let response: { parsed_output: T | null };
    try {
      response = await run();
    } catch (e) {
      throw toAppError(e);
    }
    if (response.parsed_output) return response.parsed_output;
  }
  throw new AppError('bad_response');
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
