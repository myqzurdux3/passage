import { z } from 'zod';
import { ERROR_TAGS } from '../core/errorTags';

/**
 * `zodOutputFormat` rend les bornes numériques et les longueurs de tableau sous
 * forme de description plutôt que de contrainte de grammaire : le modèle peut
 * donc s'en écarter. La validation Zod au retour rattrape le cas — elle *lève*,
 * elle ne rend pas un résultat nul — et `parseWithRetry` relance une fois avant
 * d'abandonner.
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
    .length(5)
    // Cinq items dans les bornes ne garantissent pas cinq positions
    // *distinctes* : sans ce contrôle, `[1,1,2,3,4]` laissait la phrase 5 sans
    // correction dans une série pourtant marquée corrigée.
    .refine(
      (items) => new Set(items.map((i) => i.position)).size === items.length,
      { message: 'Les positions doivent être distinctes.' },
    ),
  overall: z.string(),
});

export type Correction = z.infer<typeof CorrectionSchema>;
