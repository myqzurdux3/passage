import { addDays, localDay } from '../date';

describe('localDay', () => {
  it('rend le jour local au format AAAA-MM-JJ', () => {
    expect(localDay(new Date(2026, 7, 29, 14, 30))).toBe('2026-08-29');
  });

  it('remplit les mois et les jours à deux chiffres', () => {
    expect(localDay(new Date(2026, 0, 5, 0, 0))).toBe('2026-01-05');
  });

  it("n'utilise pas UTC : 23h locales restent le même jour local", () => {
    expect(localDay(new Date(2026, 7, 29, 23, 59))).toBe('2026-08-29');
  });
});

describe('addDays', () => {
  it("avance d'un jour", () => {
    expect(addDays('2026-08-29', 1)).toBe('2026-08-30');
  });

  it('franchit une fin de mois', () => {
    expect(addDays('2026-08-31', 1)).toBe('2026-09-01');
  });

  it('franchit une fin d\'année', () => {
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
  });

  it('recule', () => {
    expect(addDays('2026-01-01', -1)).toBe('2025-12-31');
  });

  it('gère une année bissextile', () => {
    expect(addDays('2028-02-28', 1)).toBe('2028-02-29');
  });
});
