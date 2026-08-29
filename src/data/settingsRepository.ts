import type { Db } from './db';

export const SETTING_KEYS = {
  baseLevel: 'base_level',
  theme: 'theme',
  reminderHour: 'reminder_hour',
  reminderMinute: 'reminder_minute',
} as const;

export class SettingsRepository {
  constructor(private readonly db: Db) {}

  get(key: string): string | null {
    const [row] = this.db.all<{ value: string }>('SELECT value FROM settings WHERE key = ?', [key]);
    return row ? row.value : null;
  }

  set(key: string, value: string): void {
    this.db.run(
      `INSERT INTO settings (key, value) VALUES (?, ?)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
      [key, value],
    );
  }
}
