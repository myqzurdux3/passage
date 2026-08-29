import { CorrectionSchema, GeneratedSeriesSchema } from '../schemas';

const item = (position: number) => ({
  position,
  score: 8,
  corrected_en: 'ok',
  explanation: '',
  error_tags: [],
});

describe('CorrectionSchema', () => {
  it('accepte cinq positions distinctes', () => {
    expect(() =>
      CorrectionSchema.parse({ items: [1, 2, 3, 4, 5].map(item), overall: '' }),
    ).not.toThrow();
  });

  it('rejette une position dupliquée', () => {
    expect(() =>
      CorrectionSchema.parse({ items: [1, 1, 2, 3, 4].map(item), overall: '' }),
    ).toThrow();
  });

  it('rejette un nombre de corrections différent de cinq', () => {
    expect(() => CorrectionSchema.parse({ items: [1, 2, 3].map(item), overall: '' })).toThrow();
  });

  it('rejette une note hors bornes', () => {
    expect(() =>
      CorrectionSchema.parse({
        items: [1, 2, 3, 4, 5].map((p) => ({ ...item(p), score: 11 })),
        overall: '',
      }),
    ).toThrow();
  });

  it('rejette une étiquette inconnue', () => {
    expect(() =>
      CorrectionSchema.parse({
        items: [1, 2, 3, 4, 5].map((p) => ({ ...item(p), error_tags: ['inventée'] })),
        overall: '',
      }),
    ).toThrow();
  });
});

describe('GeneratedSeriesSchema', () => {
  const sentence = (i: number) => ({
    source_fr: `Phrase ${i}.`,
    reference_en: `Sentence ${i}.`,
    targets_tag: null,
  });

  it('accepte cinq phrases', () => {
    expect(() =>
      GeneratedSeriesSchema.parse({ sentences: [1, 2, 3, 4, 5].map(sentence) }),
    ).not.toThrow();
  });

  it('rejette quatre phrases', () => {
    expect(() => GeneratedSeriesSchema.parse({ sentences: [1, 2, 3, 4].map(sentence) })).toThrow();
  });

  it('rejette une phrase source vide', () => {
    expect(() =>
      GeneratedSeriesSchema.parse({
        sentences: [1, 2, 3, 4, 5].map((i) => ({ ...sentence(i), source_fr: '' })),
      }),
    ).toThrow();
  });
});
