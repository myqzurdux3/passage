import { ERROR_TAGS, TAG_LABELS_FR, topWeakTags } from '../errorTags';

describe('ERROR_TAGS', () => {
  it("contient les dix étiquettes dans l'ordre convenu", () => {
    expect(ERROR_TAGS).toEqual([
      'tense',
      'preposition',
      'article',
      'word_order',
      'vocabulary',
      'false_friend',
      'agreement',
      'register',
      'spelling',
      'idiom',
    ]);
  });

  it('a un libellé français pour chaque étiquette', () => {
    for (const tag of ERROR_TAGS) {
      expect(TAG_LABELS_FR[tag]).toBeTruthy();
    }
  });
});

describe('topWeakTags', () => {
  it('rend un tableau vide sans historique', () => {
    expect(topWeakTags([])).toEqual([]);
  });

  it('classe par fréquence décroissante', () => {
    expect(topWeakTags([['tense', 'tense', 'article'], ['tense', 'article']])).toEqual([
      'tense',
      'article',
    ]);
  });

  it('se limite à trois étiquettes par défaut', () => {
    // `register` et `idiom` sont à égalité (une occurrence chacun) : l'ordre
    // canonique tranche, et `register` y précède `idiom`.
    expect(
      topWeakTags([
        ['tense', 'tense', 'tense', 'article', 'article', 'idiom', 'register'],
      ]),
    ).toEqual(['tense', 'article', 'register']);
  });

  it('ne regarde que les trois dernières séries', () => {
    expect(
      topWeakTags([['spelling'], ['spelling'], ['spelling'], ['tense'], ['tense'], ['article']]),
    ).toEqual(['tense', 'article']);
  });

  it("départage les égalités par l'ordre canonique des étiquettes", () => {
    expect(topWeakTags([['idiom', 'tense']])).toEqual(['tense', 'idiom']);
  });

  it('respecte une limite explicite', () => {
    expect(topWeakTags([['tense', 'article', 'idiom']], 1)).toEqual(['tense']);
  });
});
