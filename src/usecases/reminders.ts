import {
  SchedulableTriggerInputTypes,
  cancelAllScheduledNotificationsAsync,
  getPermissionsAsync,
  requestPermissionsAsync,
  scheduleNotificationAsync,
} from 'expo-notifications';

/**
 * Un seul rappel à la fois : on annule tout avant de replanifier, plutôt que de
 * tenir un identifiant qui survivrait mal à une réinstallation.
 */
export async function scheduleDailyReminder(hour: number, minute = 0): Promise<boolean> {
  if (!Number.isInteger(hour) || hour < 0 || hour > 23) return false;
  if (!Number.isInteger(minute) || minute < 0 || minute > 59) return false;

  const existing = await getPermissionsAsync();
  const granted = existing.granted || (await requestPermissionsAsync()).granted;
  if (!granted) return false;

  await cancelAllScheduledNotificationsAsync();
  await scheduleNotificationAsync({
    content: {
      title: 'Passage',
      body: 'Tes cinq phrases du jour t’attendent.',
    },
    trigger: {
      type: SchedulableTriggerInputTypes.DAILY,
      hour,
      minute,
    },
  });

  return true;
}

export async function cancelDailyReminder(): Promise<void> {
  await cancelAllScheduledNotificationsAsync();
}
