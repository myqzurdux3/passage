import { migrate } from '../migrations';
import { makeTestDb } from './testDb';

describe('migrate', () => {
  it('crée les cinq tables', () => {
    const db = makeTestDb();
    migrate(db);
    const names = db
      .all<{ name: string }>("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
      .map((r) => r.name);
    expect(names).toEqual(
      expect.arrayContaining(['answer', 'schema_version', 'sentence', 'series', 'settings']),
    );
  });

  it('est idempotente', () => {
    const db = makeTestDb();
    migrate(db);
    expect(() => migrate(db)).not.toThrow();
  });

  it('refuse un statut inconnu', () => {
    const db = makeTestDb();
    migrate(db);
    expect(() =>
      db.run(
        "INSERT INTO series (day, level, status, created_at) VALUES ('2026-01-01','B1','wat','x')",
      ),
    ).toThrow();
  });

  it('refuse deux séries pour le même jour', () => {
    const db = makeTestDb();
    migrate(db);
    const insert =
      "INSERT INTO series (day, level, status, created_at) VALUES ('2026-01-01','B1','pending','x')";
    db.run(insert);
    expect(() => db.run(insert)).toThrow();
  });

  it('refuse deux phrases à la même position dans une série', () => {
    const db = makeTestDb();
    migrate(db);
    db.run(
      "INSERT INTO series (id, day, level, status, created_at) VALUES (1,'2026-01-01','B1','pending','x')",
    );
    const insert =
      "INSERT INTO sentence (series_id, position, source_fr, reference_en) VALUES (1, 1, 'Bonjour.', 'Hello.')";
    db.run(insert);
    expect(() => db.run(insert)).toThrow();
  });

  it('supprime en cascade les phrases et les réponses', () => {
    const db = makeTestDb();
    migrate(db);
    db.run(
      "INSERT INTO series (id, day, level, status, created_at) VALUES (1,'2026-01-01','B1','pending','x')",
    );
    db.run(
      "INSERT INTO sentence (id, series_id, position, source_fr, reference_en) VALUES (1, 1, 1, 'Bonjour.', 'Hello.')",
    );
    db.run("INSERT INTO answer (sentence_id, user_en) VALUES (1, 'Hi.')");

    db.run('DELETE FROM series WHERE id = 1');

    expect(db.all('SELECT * FROM sentence')).toHaveLength(0);
    expect(db.all('SELECT * FROM answer')).toHaveLength(0);
  });

  it('enregistre la version du schéma', () => {
    const db = makeTestDb();
    migrate(db);
    const [row] = db.all<{ version: number }>('SELECT version FROM schema_version');
    expect(row.version).toBeGreaterThanOrEqual(1);
  });
});

describe('migrate — évolution du schéma', () => {
  it('ajoute la colonne overall sur une base créée en version 1', () => {
    const db = makeTestDb();
    // Base « ancienne » : le schéma v1 sans la colonne.
    db.exec(`
      CREATE TABLE schema_version (version INTEGER NOT NULL);
      CREATE TABLE series (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        day TEXT NOT NULL UNIQUE,
        level TEXT NOT NULL,
        status TEXT NOT NULL
          CHECK (status IN ('pending','in_progress','awaiting_correction','corrected')),
        created_at TEXT NOT NULL,
        corrected_at TEXT
      );
    `);
    db.run('INSERT INTO schema_version (version) VALUES (1)');

    migrate(db);

    const columns = db.all<{ name: string }>('PRAGMA table_info(series)').map((c) => c.name);
    expect(columns).toContain('overall');
    expect(db.all<{ version: number }>('SELECT version FROM schema_version')[0].version).toBe(2);
  });

  it("n'ajoute pas deux fois la colonne", () => {
    const db = makeTestDb();
    migrate(db);
    expect(() => migrate(db)).not.toThrow();
    const columns = db.all<{ name: string }>('PRAGMA table_info(series)').map((c) => c.name);
    expect(columns.filter((c) => c === 'overall')).toHaveLength(1);
  });
});
