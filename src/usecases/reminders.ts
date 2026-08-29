/**
 * Sous Expo Go, `expo-notifications` n'a plus de module natif depuis le SDK 53 :
 * le charger lève, puis rejette en boucle. D'où le chargement à la demande et
 * la garde ci-dessous — un rappel qui ne se planifie pas ne doit jamais
 * empêcher de traduire ses phrases.
 */

type NotificationsModule = typeof import('expo-notifications');

function notificationsAvailable(): boolean {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const Constants = require('expo-constants').default as {
      executionEnvironment?: string;
    };
    return Constants.executionEnvironment !== 'storeClient';
  } catch {
    return true;
  }
}

function loadNotifications(): NotificationsModule | null {
  if (!notificationsAvailable()) return null;

  try {
    // `require` plutôt qu'`import()` : le chargement reste paresseux, et Metro
    // comme Jest passent par le même registre de modules.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('expo-notifications') as NotificationsModule;
  } catch {
    return null;
  }
}

/**
 * Lit une heure de rappel saisie à la main. Rend `null` pour « aucun rappel ».
 *
 * Écrite une seule fois : quand chaque écran la revalidait à sa façon,
 * l'amorçage acceptait une chaîne vide comme `0` et programmait un rappel à
 * minuit là où il était censé n'en programmer aucun.
 */
export function parseReminderHour(text: string): number | null {
  const trimmed = text.trim();
  if (trimmed === '') return null;
  if (!/^\d{1,2}$/.test(trimmed)) return null;

  const hour = Number(trimmed);
  return hour >= 0 && hour <= 23 ? hour : null;
}

/** Un seul rappel à la fois : on annule tout avant de replanifier. */
export async function scheduleDailyReminder(hour: number, minute = 0): Promise<boolean> {
  if (!Number.isInteger(hour) || hour < 0 || hour > 23) return false;
  if (!Number.isInteger(minute) || minute < 0 || minute > 59) return false;

  const notifications = loadNotifications();
  if (!notifications) return false;

  try {
    const existing = await notifications.getPermissionsAsync();
    const granted =
      existing.granted || (await notifications.requestPermissionsAsync()).granted;
    if (!granted) return false;

    await notifications.cancelAllScheduledNotificationsAsync();
    await notifications.scheduleNotificationAsync({
      content: {
        title: 'Passage',
        body: 'Tes cinq phrases du jour t’attendent.',
      },
      trigger: {
        type: notifications.SchedulableTriggerInputTypes.DAILY,
        hour,
        minute,
      },
    });

    return true;
  } catch {
    return false;
  }
}

export async function cancelDailyReminder(): Promise<void> {
  const notifications = loadNotifications();
  if (!notifications) return;

  try {
    await notifications.cancelAllScheduledNotificationsAsync();
  } catch {
    // Rien à annuler, ou module indisponible. Sans conséquence.
  }
}
