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

  // `expo-sqlite` n'active pas les clés étrangères : sans cette ligne, les
  // suppressions en cascade seraient silencieusement inertes. Le pragma vaut
  // pour la connexion, et `getDb()` n'en ouvre qu'une par lancement.
  raw.execSync('PRAGMA foreign_keys = ON');

  // Vérifié plutôt que supposé : un pragma refusé rendrait les cascades
  // inopérantes sans le moindre signe.
  const [check] = raw.getAllSync('PRAGMA foreign_keys') as { foreign_keys?: number }[];
  if (check?.foreign_keys !== 1) {
    console.warn(
      '[passage] PRAGMA foreign_keys inactif : les suppressions en cascade ne le seront pas.',
    );
  }

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
