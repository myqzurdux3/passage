import type { Db } from './db';

const SCHEMA_VERSION = 2;

const SCHEMA = `
CREATE TABLE IF NOT EXISTS schema_version (
  version INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS settings (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS series (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  day          TEXT NOT NULL UNIQUE,
  level        TEXT NOT NULL,
  status       TEXT NOT NULL
               CHECK (status IN ('pending','in_progress','awaiting_correction','corrected')),
  created_at   TEXT NOT NULL,
  corrected_at TEXT,
  overall      TEXT
);

CREATE TABLE IF NOT EXISTS sentence (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  series_id    INTEGER NOT NULL REFERENCES series(id) ON DELETE CASCADE,
  position     INTEGER NOT NULL,
  source_fr    TEXT NOT NULL,
  reference_en TEXT NOT NULL,
  targets_tag  TEXT,
  UNIQUE (series_id, position)
);

CREATE TABLE IF NOT EXISTS answer (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  sentence_id  INTEGER NOT NULL UNIQUE REFERENCES sentence(id) ON DELETE CASCADE,
  user_en      TEXT NOT NULL,
  score        INTEGER,
  corrected_en TEXT,
  explanation  TEXT,
  error_tags   TEXT
);

CREATE INDEX IF NOT EXISTS idx_series_day ON series(day);
CREATE INDEX IF NOT EXISTS idx_sentence_series ON sentence(series_id, position);
`;

/** SQLite n'a pas d'`ADD COLUMN IF NOT EXISTS` : on interroge le schéma. */
function addColumnIfMissing(db: Db, table: string, column: string, type: string): void {
  const columns = db.all<{ name: string }>(`PRAGMA table_info(${table})`);
  if (!columns.some((c) => c.name === column)) {
    db.run(`ALTER TABLE ${table} ADD COLUMN ${column} ${type}`);
  }
}

export function migrate(db: Db): void {
  db.exec(SCHEMA);

  const [row] = db.all<{ version: number }>('SELECT version FROM schema_version LIMIT 1');
  if (!row) {
    db.run('INSERT INTO schema_version (version) VALUES (?)', [SCHEMA_VERSION]);
  } else if (row.version < SCHEMA_VERSION) {
    if (row.version < 2) addColumnIfMissing(db, 'series', 'overall', 'TEXT');
    db.run('UPDATE schema_version SET version = ?', [SCHEMA_VERSION]);
  }
}
