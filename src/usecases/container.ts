import * as SecureStore from 'expo-secure-store';
import { makeAiClient } from '../ai/claude';
import { openDeviceDb, type Db } from '../data/db';
import { migrate } from '../data/migrations';
import { SeriesRepository } from '../data/seriesRepository';
import { SettingsRepository } from '../data/settingsRepository';
import { StatsRepository } from '../data/statsRepository';
import type { Deps } from './deps';

/**
 * La clé API ne quitte jamais le Keychain / Keystore : ni journal, ni base,
 * ni message d'erreur.
 */
const API_KEY_SLOT = 'anthropic_api_key';

export async function readApiKey(): Promise<string | null> {
  return SecureStore.getItemAsync(API_KEY_SLOT);
}

export async function writeApiKey(key: string): Promise<void> {
  await SecureStore.setItemAsync(API_KEY_SLOT, key.trim());
}

export async function clearApiKey(): Promise<void> {
  await SecureStore.deleteItemAsync(API_KEY_SLOT);
}

let db: Db | null = null;

/** Base ouverte et migrée une seule fois par lancement. */
export function getDb(): Db {
  if (!db) {
    db = openDeviceDb();
    migrate(db);
  }
  return db;
}

export function makeDepsWithKey(apiKey: string): Deps {
  const database = getDb();
  return {
    series: new SeriesRepository(database),
    settings: new SettingsRepository(database),
    stats: new StatsRepository(database),
    ai: makeAiClient(apiKey),
    now: () => new Date(),
  };
}

/** Efface toutes les données locales. La clé API est traitée à part. */
export function wipeLocalData(): void {
  const database = getDb();
  database.run('DELETE FROM series');
  database.run('DELETE FROM settings');
}
