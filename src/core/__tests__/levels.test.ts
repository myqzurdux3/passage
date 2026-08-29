import { effectiveLevel } from '../levels';

describe('effectiveLevel', () => {
  it('rend le niveau de base avec moins de trois séries', () => {
    expect(effectiveLevel('B1', [])).toBe('B1');
    expect(effectiveLevel('B1', [9.5, 9.8])).toBe('B1');
  });

  it("monte d'un cran au-dessus de 8.5 de moyenne", () => {
    expect(effectiveLevel('B1', [9, 9, 9])).toBe('B2');
  });

  it("descend d'un cran en dessous de 5.5 de moyenne", () => {
    expect(effectiveLevel('B2', [5, 5, 5])).toBe('B1');
  });

  it('reste au niveau de base entre les deux seuils', () => {
    expect(effectiveLevel('B2', [7, 7, 7])).toBe('B2');
  });

  it('ne dépasse jamais un cran, même avec un sans-faute', () => {
    expect(effectiveLevel('B1', [10, 10, 10, 10, 10])).toBe('B2');
  });

  it('ne considère que les cinq dernières séries', () => {
    expect(effectiveLevel('B1', [1, 1, 1, 9, 9, 9, 9, 9])).toBe('B2');
  });

  it('bute sur C2 par le haut', () => {
    expect(effectiveLevel('C2', [10, 10, 10])).toBe('C2');
  });

  it('bute sur A2 par le bas', () => {
    expect(effectiveLevel('A2', [1, 1, 1])).toBe('A2');
  });

  it('traite 8.5 comme une montée et 5.5 comme une descente', () => {
    expect(effectiveLevel('B1', [8.5, 8.5, 8.5])).toBe('B2');
    expect(effectiveLevel('B1', [5.5, 5.5, 5.5])).toBe('A2');
  });
});
