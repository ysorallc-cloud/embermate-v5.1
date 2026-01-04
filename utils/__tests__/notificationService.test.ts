// ============================================================================
// NOTIFICATION SERVICE TESTS
// Validates medication reminder scheduling and notification management
// ============================================================================

import { scheduleMedicationNotifications, cancelAllNotifications, getScheduledNotifications } from '../notificationService';
import { Medication } from '../medicationStorage';
import * as Notifications from 'expo-notifications';

// Mock expo-notifications
jest.mock('expo-notifications');

describe('NotificationService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const mockMedication: Medication = {
    id: '1',
    name: 'Test Med',
    dosage: '10mg',
    time: '09:00',
    timeSlot: 'morning',
    taken: false,
    active: true,
    createdAt: '2025-01-01T00:00:00.000Z',
  };

  test('should schedule notification for active medication', async () => {
    const mockSchedule = jest.fn().mockResolvedValue('notification-id-1');
    (Notifications.scheduleNotificationAsync as jest.Mock) = mockSchedule;

    await scheduleMedicationNotifications([mockMedication]);

    expect(mockSchedule).toHaveBeenCalledWith(
      expect.objectContaining({
        content: expect.objectContaining({
          title: '💊 Medication Reminder',
          body: expect.stringContaining('Test Med'),
        }),
        trigger: expect.objectContaining({
          hour: 9,
          minute: 0,
          repeats: true,
        }),
      })
    );
  });

  test('should not schedule notification for inactive medication', async () => {
    const inactiveMed = { ...mockMedication, active: false };
    const mockSchedule = jest.fn();
    (Notifications.scheduleNotificationAsync as jest.Mock) = mockSchedule;

    await scheduleMedicationNotifications([inactiveMed]);

    expect(mockSchedule).not.toHaveBeenCalled();
  });

  test('should cancel all notifications', async () => {
    const mockCancel = jest.fn().mockResolvedValue(undefined);
    (Notifications.cancelAllScheduledNotificationsAsync as jest.Mock) = mockCancel;

    await cancelAllNotifications();

    expect(mockCancel).toHaveBeenCalled();
  });

  test('should retrieve scheduled notifications', async () => {
    const mockNotifications = [
      { identifier: 'id-1', content: {}, trigger: {} },
      { identifier: 'id-2', content: {}, trigger: {} },
    ];
    const mockGet = jest.fn().mockResolvedValue(mockNotifications);
    (Notifications.getAllScheduledNotificationsAsync as jest.Mock) = mockGet;

    const result = await getScheduledNotifications();

    expect(result).toHaveLength(2);
    expect(mockGet).toHaveBeenCalled();
  });

  test('should handle notification permission errors gracefully', async () => {
    const mockSchedule = jest.fn().mockRejectedValue(new Error('Permission denied'));
    (Notifications.scheduleNotificationAsync as jest.Mock) = mockSchedule;

    // Should not throw
    await expect(scheduleMedicationNotifications([mockMedication])).resolves.not.toThrow();
  });
});
