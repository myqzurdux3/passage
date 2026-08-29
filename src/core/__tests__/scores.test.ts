import { averageScore, formatStreak, round1, scoreBand } from '../scores';

describe('round1', () => {
  it('arrondit au dixième', () => {
    expect(round1(5.64)).toBe(5.6);
    expect(round1(5.65)).toBe(5.7);
  });
});

describe('averageScore', () => {
  it('rend null sans aucune note', () => {
    expect(averageScore([])).toBeNull();
    expect(averageScore([null, null])).toBeNull();
  });

  it('ignore les notes absentes', () => {
    expect(averageScore([10, null, 8])).toBe(9);
  });

  it('arrondit au dixième', () => {
    expect(averageScore([6, 6, 6, 6, 4])).toBe(5.6);
  });
});

describe('scoreBand', () => {
  it('classe selon les seuils', () => {
    expect(scoreBand(10)).toBe('good');
    expect(scoreBand(8)).toBe('good');
    expect(scoreBand(7)).toBe('fair');
    expect(scoreBand(5)).toBe('fair');
    expect(scoreBand(4)).toBe('poor');
    expect(scoreBand(0)).toBe('poor');
  });
});

describe('formatStreak', () => {
  it('accorde le pluriel', () => {
    expect(formatStreak(0)).toBe('0 jour d’affilée');
    expect(formatStreak(1)).toBe('1 jour d’affilée');
    expect(formatStreak(2)).toBe('2 jours d’affilée');
  });
});
