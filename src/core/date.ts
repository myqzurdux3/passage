/** Jours au format `AAAA-MM-JJ`, toujours en heure locale. */

const pad = (n: number): string => String(n).padStart(2, '0');

export function localDay(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function addDays(day: string, n: number): string {
  const [y, m, d] = day.split('-').map(Number);
  return localDay(new Date(y, m - 1, d + n));
}
