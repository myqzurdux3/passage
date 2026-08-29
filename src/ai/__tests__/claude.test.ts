const mockParse = jest.fn();

jest.mock('@anthropic-ai/sdk', () => {
  class APIError extends Error {}
  class AuthenticationError extends APIError {}
  class RateLimitError extends APIError {}
  class APIConnectionError extends APIError {}
  class InternalServerError extends APIError {}

  class FakeAnthropic {
    messages = { parse: mockParse };
  }

  return {
    __esModule: true,
    default: Object.assign(FakeAnthropic, {
      APIError,
      AuthenticationError,
      RateLimitError,
      APIConnectionError,
      InternalServerError,
    }),
  };
});

import Anthropic from '@anthropic-ai/sdk';
import { makeAiClient } from '../claude';

/** Les erreurs du SDK ne s'instancient pas simplement : on fabrique le prototype. */
const sdkError = (Cls: { prototype: object }): unknown => Object.create(Cls.prototype);

const fiveSentences = Array.from({ length: 5 }, (_, i) => ({
  source_fr: `Phrase ${i + 1}.`,
  reference_en: `Sentence ${i + 1}.`,
  targets_tag: null,
}));

const correctionItems = fiveSentences.map((_, i) => ({
  position: i + 1,
  score: 8,
  corrected_en: `corrected ${i + 1}`,
  explanation: '',
  error_tags: [],
}));

const items = fiveSentences.map((s, i) => ({
  position: i + 1,
  source_fr: s.source_fr,
  reference_en: s.reference_en,
  user_en: `My sentence ${i + 1}.`,
}));

beforeEach(() => mockParse.mockReset());

describe('generateSeries', () => {
  it('appelle le modèle avec le bon identifiant, la pensée adaptative et un effort bas', async () => {
    mockParse.mockResolvedValue({ parsed_output: { sentences: fiveSentences } });
    await makeAiClient('sk-test').generateSeries({ level: 'B1', weakTags: [], recentSources: [] });

    const call = mockParse.mock.calls[0][0];
    expect(call.model).toBe('claude-opus-5');
    expect(call.thinking).toEqual({ type: 'adaptive' });
    expect(call.output_config.effort).toBe('low');
    expect(call.max_tokens).toBe(16000);
    expect(call).not.toHaveProperty('budget_tokens');
  });

  it("met le prompt système en cache et n'y injecte rien de volatile", async () => {
    mockParse.mockResolvedValue({ parsed_output: { sentences: fiveSentences } });
    const client = makeAiClient('sk-test');
    await client.generateSeries({ level: 'B1', weakTags: [], recentSources: [] });
    await client.generateSeries({ level: 'C1', weakTags: ['tense'], recentSources: ['Salut.'] });

    const [first, second] = mockParse.mock.calls.map((c) => c[0]);
    expect(first.system).toEqual(second.system);
    expect(first.system[0].cache_control).toEqual({ type: 'ephemeral' });
  });

  it('transmet niveau, points faibles et phrases récentes dans le message utilisateur', async () => {
    mockParse.mockResolvedValue({ parsed_output: { sentences: fiveSentences } });
    await makeAiClient('sk-test').generateSeries({
      level: 'B2',
      weakTags: ['tense', 'article'],
      recentSources: ['Il pleut.'],
    });

    const text = mockParse.mock.calls[0][0].messages[0].content as string;
    expect(text).toContain('B2');
    expect(text).toContain('tense, article');
    expect(text).toContain('Il pleut.');
  });

  it('rend les cinq phrases', async () => {
    mockParse.mockResolvedValue({ parsed_output: { sentences: fiveSentences } });
    const out = await makeAiClient('sk-test').generateSeries({
      level: 'B1',
      weakTags: [],
      recentSources: [],
    });
    expect(out).toHaveLength(5);
    expect(out[0].source_fr).toBe('Phrase 1.');
  });

  it('retente une fois quand parsed_output est nul, puis lève bad_response', async () => {
    mockParse.mockResolvedValue({ parsed_output: null });
    await expect(
      makeAiClient('sk-test').generateSeries({ level: 'B1', weakTags: [], recentSources: [] }),
    ).rejects.toMatchObject({ kind: 'bad_response' });
    expect(mockParse).toHaveBeenCalledTimes(2);
  });

  it('réussit si la seconde tentative aboutit', async () => {
    mockParse
      .mockResolvedValueOnce({ parsed_output: null })
      .mockResolvedValueOnce({ parsed_output: { sentences: fiveSentences } });
    const out = await makeAiClient('sk-test').generateSeries({
      level: 'B1',
      weakTags: [],
      recentSources: [],
    });
    expect(out).toHaveLength(5);
  });

  it('convertit une erreur du SDK en AppError sans retenter', async () => {
    mockParse.mockRejectedValue(sdkError(Anthropic.AuthenticationError));
    await expect(
      makeAiClient('sk-bad').generateSeries({ level: 'B1', weakTags: [], recentSources: [] }),
    ).rejects.toMatchObject({ kind: 'invalid_key' });
    expect(mockParse).toHaveBeenCalledTimes(1);
  });
});

describe('correctSeries', () => {
  it('utilise un effort élevé', async () => {
    mockParse.mockResolvedValue({ parsed_output: { items: correctionItems, overall: 'bien' } });
    await makeAiClient('sk-test').correctSeries({ level: 'B1', items });
    expect(mockParse.mock.calls[0][0].output_config.effort).toBe('high');
  });

  it('transmet source, référence et réponse pour chaque phrase', async () => {
    mockParse.mockResolvedValue({ parsed_output: { items: correctionItems, overall: '' } });
    await makeAiClient('sk-test').correctSeries({ level: 'B1', items });

    const text = mockParse.mock.calls[0][0].messages[0].content as string;
    expect(text).toContain('Phrase 1');
    expect(text).toContain('Sentence 1.');
    expect(text).toContain('My sentence 1.');
  });

  it('affiche (vide) pour une réponse laissée blanche', async () => {
    mockParse.mockResolvedValue({ parsed_output: { items: correctionItems, overall: '' } });
    await makeAiClient('sk-test').correctSeries({
      level: 'B1',
      items: [{ ...items[0], user_en: '' }],
    });
    expect(mockParse.mock.calls[0][0].messages[0].content).toContain('(vide)');
  });

  it('trie les corrections par position', async () => {
    mockParse.mockResolvedValue({
      parsed_output: {
        items: [5, 3, 1, 4, 2].map((p) => ({
          position: p,
          score: 7,
          corrected_en: `c${p}`,
          explanation: '',
          error_tags: [],
        })),
        overall: '',
      },
    });
    const out = await makeAiClient('sk-test').correctSeries({ level: 'B1', items });
    expect(out.items.map((i) => i.position)).toEqual([1, 2, 3, 4, 5]);
  });

  it('convertit une panne réseau en offline', async () => {
    mockParse.mockRejectedValue(sdkError(Anthropic.APIConnectionError));
    await expect(
      makeAiClient('sk-test').correctSeries({ level: 'B1', items }),
    ).rejects.toMatchObject({ kind: 'offline' });
  });
});
