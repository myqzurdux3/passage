/**
 * Les doublures sont créées *dans* la fabrique : `jest.mock` est remonté au-dessus
 * des imports, donc une variable déclarée à côté ne serait pas encore affectée
 * quand la fabrique s'exécute.
 */
jest.mock('expo-notifications', () => ({
  __esModule: true,
  cancelAllScheduledNotificationsAsync: jest.fn().mockResolvedValue(undefined),
  scheduleNotificationAsync: jest.fn().mockResolvedValue('notification-id'),
  getPermissionsAsync: jest.fn().mockResolvedValue({ granted: true }),
  requestPermissionsAsync: jest.fn().mockResolvedValue({ granted: true }),
  SchedulableTriggerInputTypes: { DAILY: 'daily' },
}));

import { cancelDailyReminder, scheduleDailyReminder } from '../reminders';

const notifications = jest.requireMock('expo-notifications') as {
  cancelAllScheduledNotificationsAsync: jest.Mock;
  scheduleNotificationAsync: jest.Mock;
  getPermissionsAsync: jest.Mock;
  requestPermissionsAsync: jest.Mock;
};

beforeEach(() => {
  notifications.cancelAllScheduledNotificationsAsync.mockClear();
  notifications.scheduleNotificationAsync.mockClear();
  notifications.getPermissionsAsync.mockClear().mockResolvedValue({ granted: true });
  notifications.requestPermissionsAsync.mockClear().mockResolvedValue({ granted: true });
});

describe('scheduleDailyReminder', () => {
  it("annule les rappels existants avant d'en planifier un nouveau", async () => {
    await scheduleDailyReminder(19, 30);

    expect(notifications.cancelAllScheduledNotificationsAsync).toHaveBeenCalledTimes(1);
    expect(notifications.scheduleNotificationAsync).toHaveBeenCalledTimes(1);
    expect(
      notifications.cancelAllScheduledNotificationsAsync.mock.invocationCallOrder[0],
    ).toBeLessThan(notifications.scheduleNotificationAsync.mock.invocationCallOrder[0]);
  });

  it("planifie un rappel quotidien à l'heure demandée", async () => {
    await scheduleDailyReminder(19, 30);

    expect(notifications.scheduleNotificationAsync.mock.calls[0][0].trigger).toEqual({
      type: 'daily',
      hour: 19,
      minute: 30,
    });
  });

  it("demande la permission si elle n'est pas encore accordée", async () => {
    notifications.getPermissionsAsync.mockResolvedValue({ granted: false });

    await scheduleDailyReminder(9, 0);

    expect(notifications.requestPermissionsAsync).toHaveBeenCalledTimes(1);
  });

  it('ne planifie rien si la permission est refusée', async () => {
    notifications.getPermissionsAsync.mockResolvedValue({ granted: false });
    notifications.requestPermissionsAsync.mockResolvedValue({ granted: false });

    await expect(scheduleDailyReminder(9, 0)).resolves.toBe(false);
    expect(notifications.scheduleNotificationAsync).not.toHaveBeenCalled();
  });

  it('refuse une heure hors des bornes sans rien planifier', async () => {
    await expect(scheduleDailyReminder(24, 0)).resolves.toBe(false);
    await expect(scheduleDailyReminder(-1, 0)).resolves.toBe(false);
    expect(notifications.scheduleNotificationAsync).not.toHaveBeenCalled();
  });
});

describe('cancelDailyReminder', () => {
  it('annule tout', async () => {
    await cancelDailyReminder();
    expect(notifications.cancelAllScheduledNotificationsAsync).toHaveBeenCalledTimes(1);
  });
});
