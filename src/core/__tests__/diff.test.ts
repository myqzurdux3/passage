import { wordDiff } from '../diff';

const render = (ops: ReturnType<typeof wordDiff>) =>
  ops.map((o) => `${o.op}:${o.text}`).join(' ');

describe('wordDiff', () => {
  it('rend tout en keep quand les phrases sont identiques', () => {
    expect(render(wordDiff('I go home', 'I go home'))).toBe('keep:I keep:go keep:home');
  });

  it('marque un mot remplacé comme del puis ins', () => {
    expect(render(wordDiff('I goes home', 'I go home'))).toBe(
      'keep:I del:goes ins:go keep:home',
    );
  });

  it('marque un mot manquant comme ins', () => {
    expect(render(wordDiff('I go home', 'I go to home'))).toBe(
      'keep:I keep:go ins:to keep:home',
    );
  });

  it('marque un mot en trop comme del', () => {
    expect(render(wordDiff('I go to home', 'I go home'))).toBe(
      'keep:I keep:go del:to keep:home',
    );
  });

  it('sépare la ponctuation du mot', () => {
    expect(render(wordDiff('I go.', 'I went.'))).toBe('keep:I del:go ins:went keep:.');
  });

  it('gère une réponse vide', () => {
    expect(render(wordDiff('', 'I go'))).toBe('ins:I ins:go');
  });

  it('gère une correction vide', () => {
    expect(render(wordDiff('I go', ''))).toBe('del:I del:go');
  });

  it('ignore la casse pour la comparaison mais affiche la forme correcte', () => {
    expect(render(wordDiff('i go', 'I go'))).toBe('keep:I keep:go');
  });

  it("conserve l'apostrophe dans le mot", () => {
    expect(render(wordDiff("I don't go", "I don't go"))).toBe("keep:I keep:don't keep:go");
  });
});
