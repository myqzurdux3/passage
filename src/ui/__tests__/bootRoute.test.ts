import { resolveBootRoute } from '../bootRoute';

const route = (ready: boolean, hasApiKey: boolean, onOnboarding: boolean) =>
  resolveBootRoute({ ready, hasApiKey, onOnboarding });

describe('resolveBootRoute', () => {
  it('ne décide rien tant que la clé n’a pas été lue', () => {
    expect(route(false, false, false)).toBeNull();
    expect(route(false, false, true)).toBeNull();
    expect(route(false, true, false)).toBeNull();
    expect(route(false, true, true)).toBeNull();
  });

  it('envoie vers l’amorçage sans clé enregistrée', () => {
    expect(route(true, false, false)).toBe('/onboarding');
  });

  it('laisse en place celui qui est déjà sur l’amorçage', () => {
    // Sans ce cas, la redirection se relancerait à chaque rendu.
    expect(route(true, false, true)).toBeNull();
  });

  it('sort de l’amorçage dès qu’une clé existe', () => {
    expect(route(true, true, true)).toBe('/');
  });

  it('ne bouge pas quand tout est en ordre', () => {
    expect(route(true, true, false)).toBeNull();
  });

  it('ne renvoie jamais la route où l’on se trouve déjà', () => {
    // Garantie anti-boucle : les quatre états stables tiennent.
    for (const hasApiKey of [true, false]) {
      const onOnboarding = !hasApiKey;
      expect(route(true, hasApiKey, onOnboarding)).toBeNull();
    }
  });
});
