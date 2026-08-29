import type { Db } from '../db';
import { migrate } from '../migrations';
import { SeriesRepository, type NewSentence } from '../seriesRepository';
import { makeTestDb } from './testDb';

const sentences: NewSentence[] = [
  { source_fr: 'Il pleut.', reference_en: "It's raining.", targets_tag: null },
  { source_fr: 'Je pars demain.', reference_en: 'I leave tomorrow.', targets_tag: 'tense' },
  { source_fr: 'Elle a raison.', reference_en: "She's right.", targets_tag: null },
  { source_fr: 'On y va ?', reference_en: 'Shall we go?', targets_tag: null },
  { source_fr: "J'ai oublié.", reference_en: 'I forgot.', targets_tag: 'tense' },
];

const answers = sentences.map((_, i) => ({ position: i + 1, user_en: `answer ${i + 1}` }));

const corrections = sentences.map((_, i) => ({
  position: i + 1,
  score: 7,
  corrected_en: `corrected ${i + 1}`,
  explanation: `explication ${i + 1}`,
  error_tags: i === 0 ? (['tense'] as const).slice() : [],
}));

function setup(): { db: Db; repo: SeriesRepository } {
  const db = makeTestDb();
  migrate(db);
  return { db, repo: new SeriesRepository(db, () => new Date(2026, 7, 29, 9, 0)) };
}

describe('SeriesRepository.insert et findByDay', () => {
  it('écrit une série et ses cinq phrases, puis les relit triées par position', () => {
    const { repo } = setup();
    repo.insert('2026-08-29', 'B1', sentences);

    const found = repo.findByDay('2026-08-29');
    expect(found).not.toBeNull();
    expect(found!.day).toBe('2026-08-29');
    expect(found!.level).toBe('B1');
    expect(found!.status).toBe('pending');
    expect(found!.sentences.map((s) => s.position)).toEqual([1, 2, 3, 4, 5]);
    expect(found!.sentences[1].source_fr).toBe('Je pars demain.');
    expect(found!.sentences[1].targets_tag).toBe('tense');
  });

  it('rend des réponses vides tant que rien n\'a été saisi', () => {
    const { repo } = setup();
    repo.insert('2026-08-29', 'B1', sentences);

    const found = repo.findByDay('2026-08-29')!;
    expect(found.sentences[0].user_en).toBeNull();
    expect(found.sentences[0].score).toBeNull();
    expect(found.sentences[0].error_tags).toEqual([]);
  });

  it('rend null pour un jour inconnu', () => {
    const { repo } = setup();
    expect(repo.findByDay('2026-01-01')).toBeNull();
  });

  it('rend la série insérée sans relecture supplémentaire', () => {
    const { repo } = setup();
    const created = repo.insert('2026-08-29', 'B2', sentences);
    expect(created.id).toBeGreaterThan(0);
    expect(created.sentences).toHaveLength(5);
  });
});

describe('SeriesRepository.saveAnswers', () => {
  it('écrit les réponses sans toucher aux notes', () => {
    const { repo } = setup();
    const series = repo.insert('2026-08-29', 'B1', sentences);
    repo.saveAnswers(series.id, answers);

    const found = repo.findByDay('2026-08-29')!;
    expect(found.sentences.map((s) => s.user_en)).toEqual([
      'answer 1',
      'answer 2',
      'answer 3',
      'answer 4',
      'answer 5',
    ]);
    expect(found.sentences.every((s) => s.score === null)).toBe(true);
  });

  it('écrase une réponse déjà enregistrée sans créer de doublon', () => {
    const { db, repo } = setup();
    const series = repo.insert('2026-08-29', 'B1', sentences);
    repo.saveAnswers(series.id, answers);
    repo.saveAnswers(series.id, [{ position: 1, user_en: 'corrigé à la volée' }]);

    expect(db.all('SELECT id FROM answer')).toHaveLength(5);
    expect(repo.findByDay('2026-08-29')!.sentences[0].user_en).toBe('corrigé à la volée');
  });

  it('accepte une saisie partielle', () => {
    const { repo } = setup();
    const series = repo.insert('2026-08-29', 'B1', sentences);
    repo.saveAnswers(series.id, [{ position: 3, user_en: 'seulement la troisième' }]);

    const found = repo.findByDay('2026-08-29')!;
    expect(found.sentences[2].user_en).toBe('seulement la troisième');
    expect(found.sentences[0].user_en).toBeNull();
  });
});

describe('SeriesRepository.setStatus', () => {
  it('change le statut', () => {
    const { repo } = setup();
    const series = repo.insert('2026-08-29', 'B1', sentences);
    repo.setStatus(series.id, 'in_progress');
    expect(repo.findByDay('2026-08-29')!.status).toBe('in_progress');
  });

  it('refuse un statut hors liste', () => {
    const { repo } = setup();
    const series = repo.insert('2026-08-29', 'B1', sentences);
    // @ts-expect-error statut volontairement invalide
    expect(() => repo.setStatus(series.id, 'terminé')).toThrow();
  });
});

describe('SeriesRepository.saveCorrections', () => {
  it('écrit notes, corrections, explications et étiquettes', () => {
    const { repo } = setup();
    const series = repo.insert('2026-08-29', 'B1', sentences);
    repo.saveAnswers(series.id, answers);
    repo.saveCorrections(series.id, corrections);

    const found = repo.findByDay('2026-08-29')!;
    expect(found.sentences[0].score).toBe(7);
    expect(found.sentences[0].corrected_en).toBe('corrected 1');
    expect(found.sentences[0].explanation).toBe('explication 1');
    expect(found.sentences[0].error_tags).toEqual(['tense']);
    expect(found.sentences[1].error_tags).toEqual([]);
  });

  it('passe la série à corrected et horodate', () => {
    const { repo } = setup();
    const series = repo.insert('2026-08-29', 'B1', sentences);
    repo.saveAnswers(series.id, answers);
    repo.saveCorrections(series.id, corrections);

    const found = repo.findByDay('2026-08-29')!;
    expect(found.status).toBe('corrected');
    expect(found.corrected_at).toBeTruthy();
  });
});

describe('SeriesRepository.findFirstByStatus', () => {
  it('rend null si aucune série ne correspond', () => {
    const { repo } = setup();
    expect(repo.findFirstByStatus('awaiting_correction')).toBeNull();
  });

  it('rend la plus ancienne série au statut demandé', () => {
    const { repo } = setup();
    const older = repo.insert('2026-08-27', 'B1', sentences);
    const newer = repo.insert('2026-08-28', 'B1', sentences);
    repo.setStatus(newer.id, 'awaiting_correction');
    repo.setStatus(older.id, 'awaiting_correction');

    expect(repo.findFirstByStatus('awaiting_correction')!.day).toBe('2026-08-27');
  });
});

describe('SeriesRepository.recentSources', () => {
  it('rend un tableau vide sur une base neuve', () => {
    const { repo } = setup();
    expect(repo.recentSources(7)).toEqual([]);
  });

  it('rend les phrases françaises des séries récentes, la plus récente en tête', () => {
    const { repo } = setup();
    repo.insert('2026-08-27', 'B1', [
      { source_fr: 'Ancienne.', reference_en: 'Old.', targets_tag: null },
    ]);
    repo.insert('2026-08-28', 'B1', [
      { source_fr: 'Récente.', reference_en: 'Recent.', targets_tag: null },
    ]);

    expect(repo.recentSources(7)).toEqual(['Récente.', 'Ancienne.']);
  });

  it('se limite au nombre de jours demandé', () => {
    const { repo } = setup();
    for (const day of ['2026-08-25', '2026-08-26', '2026-08-27']) {
      repo.insert(day, 'B1', [
        { source_fr: `Phrase ${day}`, reference_en: 'x', targets_tag: null },
      ]);
    }
    expect(repo.recentSources(2)).toEqual(['Phrase 2026-08-27', 'Phrase 2026-08-26']);
  });
});
