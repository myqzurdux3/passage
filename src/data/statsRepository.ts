import type { ErrorTag } from '../core/errorTags';
import type { Db } from './db';

const round1 = (n: number): number => Math.round(n * 10) / 10;

export class StatsRepository {
  constructor(private readonly db: Db) {}

  /** Moyenne par série corrigée, du plus ancien au plus récent. */
  recentAverages(limit: number): number[] {
    return this.db
      .all<{ average: number }>(
        `SELECT AVG(a.score) AS average
           FROM series r
           JOIN sentence s ON s.series_id = r.id
           JOIN answer a ON a.sentence_id = s.id
          WHERE r.status = 'corrected' AND a.score IS NOT NULL
          GROUP BY r.id
          ORDER BY r.day DESC
          LIMIT ?`,
        [limit],
      )
      .map((row) => round1(row.average))
      .reverse();
  }

  /** Étiquettes groupées par série corrigée, du plus ancien au plus récent. */
  recentTagsBySeries(limit: number): ErrorTag[][] {
    const days = this.db
      .all<{ day: string }>(
        `SELECT day FROM series WHERE status = 'corrected' ORDER BY day DESC LIMIT ?`,
        [limit],
      )
      .map((r) => r.day)
      .reverse();

    return days.map((day) => {
      const rows = this.db.all<{ error_tags: string | null }>(
        `SELECT a.error_tags
           FROM series r
           JOIN sentence s ON s.series_id = r.id
           JOIN answer a ON a.sentence_id = s.id
          WHERE r.day = ?
          ORDER BY s.position ASC`,
        [day],
      );
      return rows.flatMap((row) => parseTags(row.error_tags));
    });
  }

  correctedDays(): string[] {
    return this.db
      .all<{ day: string }>(`SELECT day FROM series WHERE status = 'corrected' ORDER BY day ASC`)
      .map((r) => r.day);
  }

  dailyScores(): { day: string; average: number }[] {
    return this.db
      .all<{ day: string; average: number }>(
        `SELECT r.day AS day, AVG(a.score) AS average
           FROM series r
           JOIN sentence s ON s.series_id = r.id
           JOIN answer a ON a.sentence_id = s.id
          WHERE r.status = 'corrected' AND a.score IS NOT NULL
          GROUP BY r.day
          ORDER BY r.day ASC`,
      )
      .map((row) => ({ day: row.day, average: round1(row.average) }));
  }
}

function parseTags(raw: string | null): ErrorTag[] {
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as ErrorTag[]) : [];
  } catch {
    return [];
  }
}
