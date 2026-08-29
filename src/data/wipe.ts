import type { Db } from './db';

/**
 * Efface toutes les données locales.
 *
 * Les suppressions sont explicites et ordonnées, sans s'en remettre au
 * `ON DELETE CASCADE` : celui-ci n'agit que si `PRAGMA foreign_keys` est actif
 * sur la connexion, ce qui est vrai aujourd'hui mais reste une hypothèse
 * invérifiable depuis l'extérieur d'un binaire de production. Un effacement
 * annoncé irréversible ne doit pas laisser de phrases ni de réponses derrière
 * lui parce qu'un pragma a sauté.
 */
export function wipeAllData(db: Db): void {
  db.transaction(() => {
    db.run('DELETE FROM answer');
    db.run('DELETE FROM sentence');
    db.run('DELETE FROM series');
    db.run('DELETE FROM settings');
  });
}
