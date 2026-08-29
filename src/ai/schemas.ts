import { z } from 'zod';
import { ERROR_TAGS } from '../core/errorTags';

/**
 * `zodOutputFormat` rend les bornes numériques et les longueurs de tableau sous
 * forme de description plutôt que de contrainte de grammaire : le modèle peut
 * donc s'en écarter. La validation Zod au retour rattrape le cas, et
 * `parseWithRetry` relance une fois avant d'abandonner.
 */

const tag = z.enum(ERROR_TAGS);

export const GeneratedSeriesSchema = z.object({
  sentences: z
    .array(
      z.object({
        source_fr: z.string().min(1),
        reference_en: z.string().min(1),
        targets_tag: tag.nullable(),
      }),
    )
    .length(5),
});

export const CorrectionSchema = z.object({
  items: z
    .array(
      z.object({
        position: z.number().int().min(1).max(5),
        score: z.number().int().min(0).max(10),
        corrected_en: z.string().min(1),
        explanation: z.string(),
        error_tags: z.array(tag),
      }),
    )
    .length(5),
  overall: z.string(),
});

export type GeneratedSeries = z.infer<typeof GeneratedSeriesSchema>;
export type Correction = z.infer<typeof CorrectionSchema>;
