/**
 * Surface minimale partagée par les deux moteurs SQLite : `expo-sqlite` sur
 * l'appareil, `node:sqlite` dans les tests. Les dépôts ne connaissent que ça.
 */
export interface Db {
  exec(sql: string): void;
  all<T>(sql: string, params?: unknown[]): T[];
  run(sql: string, params?: unknown[]): void;
  transaction<T>(fn: () => T): T;
}

/** Ouverture réelle sur l'appareil. Jamais atteinte depuis les tests Node. */
export function openDeviceDb(): Db {
  // Import différé : `expo-sqlite` n'existe pas dans l'environnement Node.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const SQLite = require('expo-sqlite') as typeof import('expo-sqlite');
  const raw = SQLite.openDatabaseSync('passage.db');
  raw.execSync('PRAGMA foreign_keys = ON');

  return {
    exec: (sql) => raw.execSync(sql),
    all: <T,>(sql: string, params: unknown[] = []) =>
      raw.getAllSync(sql, params as never) as T[],
    run: (sql, params = []) => {
      raw.runSync(sql, params as never);
    },
    transaction: <T,>(fn: () => T): T => {
      let result!: T;
      raw.withTransactionSync(() => {
        result = fn();
      });
      return result;
    },
  };
}
