import { DatabaseSync } from 'node:sqlite';
import type { Db } from '../db';

/** Base en mémoire pour les tests. Même contrat que l'adaptateur `expo-sqlite`. */
export function makeTestDb(): Db {
  const raw = new DatabaseSync(':memory:');
  raw.exec('PRAGMA foreign_keys = ON');

  return {
    exec: (sql) => raw.exec(sql),
    all: <T,>(sql: string, params: unknown[] = []) =>
      raw.prepare(sql).all(...(params as never[])) as T[],
    run: (sql, params = []) => {
      raw.prepare(sql).run(...(params as never[]));
    },
    transaction: <T,>(fn: () => T): T => {
      raw.exec('BEGIN');
      try {
        const result = fn();
        raw.exec('COMMIT');
        return result;
      } catch (e) {
        raw.exec('ROLLBACK');
        throw e;
      }
    },
  };
}
