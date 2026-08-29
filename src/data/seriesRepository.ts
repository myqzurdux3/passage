import type { ErrorTag } from '../core/errorTags';
import type { Level } from '../core/levels';
import type { Db } from './db';

export type SeriesStatus = 'pending' | 'in_progress' | 'awaiting_correction' | 'corrected';

export type NewSentence = {
  source_fr: string;
  reference_en: string;
  targets_tag: ErrorTag | null;
};

export type StoredSentence = NewSentence & {
  id: number;
  position: number;
  user_en: string | null;
  score: number | null;
  corrected_en: string | null;
  explanation: string | null;
  error_tags: ErrorTag[];
};

export type StoredSeries = {
  id: number;
  day: string;
  level: Level;
  status: SeriesStatus;
  created_at: string;
  corrected_at: string | null;
  sentences: StoredSentence[];
};

export type CorrectionItem = {
  position: number;
  score: number;
  corrected_en: string;
  explanation: string;
  error_tags: ErrorTag[];
};

const STATUSES: readonly SeriesStatus[] = [
  'pending',
  'in_progress',
  'awaiting_correction',
  'corrected',
];

type SeriesRow = {
  id: number;
  day: string;
  level: Level;
  status: SeriesStatus;
  created_at: string;
  corrected_at: string | null;
};

type SentenceRow = {
  id: number;
  position: number;
  source_fr: string;
  reference_en: string;
  targets_tag: ErrorTag | null;
  user_en: string | null;
  score: number | null;
  corrected_en: string | null;
  explanation: string | null;
  error_tags: string | null;
};

export class SeriesRepository {
  constructor(
    private readonly db: Db,
    private readonly now: () => Date = () => new Date(),
  ) {}

  findById(id: number): StoredSeries | null {
    const [row] = this.db.all<SeriesRow>('SELECT * FROM series WHERE id = ?', [id]);
    return row ? this.hydrate(row) : null;
  }

  findByDay(day: string): StoredSeries | null {
    const [row] = this.db.all<SeriesRow>('SELECT * FROM series WHERE day = ?', [day]);
    return row ? this.hydrate(row) : null;
  }

  /** Toutes les séries d'un statut, de la plus ancienne à la plus récente. */
  findAllByStatus(...statuses: SeriesStatus[]): StoredSeries[] {
    const holes = statuses.map(() => '?').join(', ');
    return this.db
      .all<SeriesRow>(`SELECT * FROM series WHERE status IN (${holes}) ORDER BY day ASC`, statuses)
      .map((row) => this.hydrate(row));
  }

  insert(day: string, level: Level, sentences: NewSentence[]): StoredSeries {
    return this.db.transaction(() => {
      this.db.run(
        'INSERT INTO series (day, level, status, created_at) VALUES (?, ?, ?, ?)',
        [day, level, 'pending', this.now().toISOString()],
      );
      const [{ id }] = this.db.all<{ id: number }>('SELECT id FROM series WHERE day = ?', [day]);

      sentences.forEach((s, i) => {
        this.db.run(
          `INSERT INTO sentence (series_id, position, source_fr, reference_en, targets_tag)
           VALUES (?, ?, ?, ?, ?)`,
          [id, i + 1, s.source_fr, s.reference_en, s.targets_tag],
        );
      });

      return this.findByDayOrThrow(day);
    });
  }

  saveAnswers(seriesId: number, answers: { position: number; user_en: string }[]): void {
    this.db.transaction(() => {
      for (const { position, user_en } of answers) {
        this.db.run(
          `INSERT INTO answer (sentence_id, user_en)
           SELECT id, ? FROM sentence WHERE series_id = ? AND position = ?
           ON CONFLICT(sentence_id) DO UPDATE SET user_en = excluded.user_en`,
          [user_en, seriesId, position],
        );
      }
    });
  }

  setStatus(seriesId: number, status: SeriesStatus): void {
    if (!STATUSES.includes(status)) {
      throw new Error(`Statut de série inconnu : ${status}`);
    }
    this.db.run('UPDATE series SET status = ? WHERE id = ?', [status, seriesId]);
  }

  saveCorrections(seriesId: number, items: CorrectionItem[]): void {
    this.db.transaction(() => {
      for (const item of items) {
        this.db.run(
          `UPDATE answer
              SET score = ?, corrected_en = ?, explanation = ?, error_tags = ?
            WHERE sentence_id = (
              SELECT id FROM sentence WHERE series_id = ? AND position = ?
            )`,
          [
            item.score,
            item.corrected_en,
            item.explanation,
            JSON.stringify(item.error_tags),
            seriesId,
            item.position,
          ],
        );
      }
      this.db.run('UPDATE series SET status = ?, corrected_at = ? WHERE id = ?', [
        'corrected',
        this.now().toISOString(),
        seriesId,
      ]);
    });
  }

  /** Phrases françaises des `days` dernières séries, la plus récente en tête. */
  recentSources(days: number): string[] {
    return this.db
      .all<{ source_fr: string }>(
        `SELECT s.source_fr
           FROM sentence s
           JOIN series r ON r.id = s.series_id
          WHERE r.day IN (SELECT day FROM series ORDER BY day DESC LIMIT ?)
          ORDER BY r.day DESC, s.position ASC`,
        [days],
      )
      .map((r) => r.source_fr);
  }

  private findByDayOrThrow(day: string): StoredSeries {
    const found = this.findByDay(day);
    if (!found) throw new Error(`Série introuvable pour le jour ${day}`);
    return found;
  }

  private findByIdOrThrow(id: number): StoredSeries {
    const found = this.findById(id);
    if (!found) throw new Error(`Série introuvable : ${id}`);
    return found;
  }

  private hydrate(row: SeriesRow): StoredSeries {
    const sentences = this.db.all<SentenceRow>(
      `SELECT s.id, s.position, s.source_fr, s.reference_en, s.targets_tag,
              a.user_en, a.score, a.corrected_en, a.explanation, a.error_tags
         FROM sentence s
         LEFT JOIN answer a ON a.sentence_id = s.id
        WHERE s.series_id = ?
        ORDER BY s.position ASC`,
      [row.id],
    );

    return {
      id: row.id,
      day: row.day,
      level: row.level,
      status: row.status,
      created_at: row.created_at,
      corrected_at: row.corrected_at,
      sentences: sentences.map((s) => ({
        id: s.id,
        position: s.position,
        source_fr: s.source_fr,
        reference_en: s.reference_en,
        targets_tag: s.targets_tag,
        user_en: s.user_en,
        score: s.score,
        corrected_en: s.corrected_en,
        explanation: s.explanation,
        error_tags: parseTags(s.error_tags),
      })),
    };
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
