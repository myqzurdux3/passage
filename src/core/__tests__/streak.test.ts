import { currentStreak } from '../streak';

describe('currentStreak', () => {
  it('rend 0 sans aucun jour corrigé', () => {
    expect(currentStreak([], '2026-08-29')).toBe(0);
  });

  it('compte le jour même', () => {
    expect(currentStreak(['2026-08-29'], '2026-08-29')).toBe(1);
  });

  it("compte les jours consécutifs jusqu'à aujourd'hui", () => {
    expect(currentStreak(['2026-08-27', '2026-08-28', '2026-08-29'], '2026-08-29')).toBe(3);
  });

  it("reste vivante si hier est fait mais pas encore aujourd'hui", () => {
    expect(currentStreak(['2026-08-27', '2026-08-28'], '2026-08-29')).toBe(2);
  });

  it('retombe à 0 après deux jours manqués', () => {
    expect(currentStreak(['2026-08-26', '2026-08-27'], '2026-08-29')).toBe(0);
  });

  it('s\'arrête au premier trou', () => {
    expect(currentStreak(['2026-08-20', '2026-08-28', '2026-08-29'], '2026-08-29')).toBe(2);
  });

  it('tolère un tableau désordonné et des doublons', () => {
    expect(currentStreak(['2026-08-29', '2026-08-28', '2026-08-29'], '2026-08-29')).toBe(2);
  });

  it("franchit une bascule d'heure d'été fixée à minuit", () => {
    expect(
      currentStreak(['2026-09-04', '2026-09-05', '2026-09-06'], '2026-09-06'),
    ).toBe(3);
    expect(currentStreak(['2026-03-28', '2026-03-29'], '2026-03-29')).toBe(2);
  });

  it('franchit un changement de mois', () => {
    expect(currentStreak(['2026-07-31', '2026-08-01'], '2026-08-01')).toBe(2);
  });
});
