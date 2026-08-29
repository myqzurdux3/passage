export type DiffOp = { op: 'keep' | 'del' | 'ins'; text: string };

/** Mots et ponctuation séparés : la ponctuation est un jeton à part entière. */
const tokenize = (s: string): string[] => s.match(/[\p{L}\p{N}']+|[^\s\p{L}\p{N}]/gu) ?? [];

const same = (a: string, b: string) => a.toLowerCase() === b.toLowerCase();

/**
 * Diff mot à mot entre la réponse de l'apprenant et la correction.
 * Calculé localement plutôt que demandé au modèle : déterministe et gratuit.
 */
export function wordDiff(from: string, to: string): DiffOp[] {
  const a = tokenize(from);
  const b = tokenize(to);

  // lcs[i][j] = longueur de la plus longue sous-séquence commune de a[i..] et b[j..].
  const lcs: number[][] = Array.from({ length: a.length + 1 }, () =>
    new Array<number>(b.length + 1).fill(0),
  );
  for (let i = a.length - 1; i >= 0; i--) {
    for (let j = b.length - 1; j >= 0; j--) {
      lcs[i][j] = same(a[i], b[j])
        ? lcs[i + 1][j + 1] + 1
        : Math.max(lcs[i + 1][j], lcs[i][j + 1]);
    }
  }

  const ops: DiffOp[] = [];
  let i = 0;
  let j = 0;
  while (i < a.length && j < b.length) {
    if (same(a[i], b[j])) {
      // On affiche la forme de la correction : une différence de casse seule
      // ne mérite pas d'être signalée, mais la bonne graphie doit être lue.
      ops.push({ op: 'keep', text: b[j] });
      i++;
      j++;
    } else if (lcs[i + 1][j] >= lcs[i][j + 1]) {
      ops.push({ op: 'del', text: a[i++] });
    } else {
      ops.push({ op: 'ins', text: b[j++] });
    }
  }
  while (i < a.length) ops.push({ op: 'del', text: a[i++] });
  while (j < b.length) ops.push({ op: 'ins', text: b[j++] });

  return ops;
}
