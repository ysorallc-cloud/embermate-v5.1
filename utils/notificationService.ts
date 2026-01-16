// ============================================================================
// NOTIFICATION SERVICE
// Local push notifications for medication reminders
// Handles scheduling, permissions, and notification management
// ============================================================================

import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Medication } from './medicationStorage';

const NOTIFICATION_SETTINGS_KEY = '@embermate_notification_settings';

export interface NotificationSettings {
  enabled: boolean;
  reminderMinutesBefore: number; // 0 = at scheduled time
  soundEnabled: boolean;
  vibrationEnabled: boolean;

  // Overdue alerts
  overdueAlertsEnabled: boolean;
  gracePeriodMinutes: number; // Default: 15
  overdueAlertMinutes: number; // Default: 30

  // Quiet hours
  quietHoursEnabled: boolean;
  quietHoursStart: string; // "22:00"
  quietHoursEnd: string; // "07:00"
}

const DEFAULT_SETTINGS: NotificationSettings = {
  enabled: true,
  reminderMinutesBefore: 0,
  soundEnabled: true,
  vibrationEnabled: true,

  overdueAlertsEnabled: true,
  gracePeriodMinutes: 15,
  overdueAlertMinutes: 30,

  quietHoursEnabled: true,
  quietHoursStart: '22:00',
  quietHoursEnd: '07:00',
};

// Configure notification handler (how notifications appear when app is foregrounded)
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

// ============================================================================
// PERMISSION MANAGEMENT
// ============================================================================

/**
 * Setup notification categories with quick actions
 * Must be called before scheduling notifications with actions
 */
export async function setupNotificationCategories(): Promise<void> {
  try {
    // iOS: Set up notification categories with action buttons
    await Notifications.setNotificationCategoryAsync('medication', [
      {
        identifier: 'mark-taken',
        buttonTitle: 'Mark Taken',
        options: {
          opensAppToForeground: false, // Handles in background
        },
      },
      {
        identifier: 'snooze',
        buttonTitle: 'Snooze 15m',
        options: {
          opensAppToForeground: false,
        },
      },
    ]);

    await Notifications.setNotificationCategoryAsync('appointment', [
      {
        identifier: 'view-details',
        buttonTitle: 'View Details',
        options: {
          opensAppToForeground: true,
        },
      },
      {
        identifier: 'snooze-appointment',
        buttonTitle: 'Remind Later',
        options: {
          opensAppToForeground: false,
        },
      },
    ]);

    console.log('✓ Notification categories configured');
  } catch (error) {
    console.error('Error setting up notification categories:', error);
  }
}

/**
 * Request notification permissions from the user
 */
export async function requestNotificationPermissions(): Promise<boolean> {
  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.log('Notification permissions not granted');
      return false;
    }

    // Configure notification channel for Android
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('medication-reminders', {
        name: 'Medication Reminders',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF8C94',
        sound: 'default',
        enableVibrate: true,
        showBadge: true,
      });
    }

    // Setup notification categories for quick actions (iOS primarily)
    await setupNotificationCategories();

    return true;
  } catch (error) {
    console.error('Error requesting notification permissions:', error);
    return false;
  }
}

/**
 * Check if notification permissions are granted
 */
export async function hasNotificationPermissions(): Promise<boolean> {
  try {
    const { status } = await Notifications.getPermissionsAsync();
    return status === 'granted';
  } catch (error) {
    console.error('Error checking notification permissions:', error);
    return false;
  }
}

// ============================================================================
// SETTINGS MANAGEMENT
// ============================================================================

/**
 * Get notification settings
 */
export async function getNotificationSettings(): Promise<NotificationSettings> {
  try {
    const data = await AsyncStorage.getItem(NOTIFICATION_SETTINGS_KEY);
    if (!data) return DEFAULT_SETTINGS;
    return JSON.parse(data);
  } catch (error) {
    console.error('Error getting notification settings:', error);
    return DEFAULT_SETTINGS;
  }
}

/**
 * Save notification settings
 */
export async function saveNotificationSettings(settings: NotificationSettings): Promise<void> {
  try {
    await AsyncStorage.setItem(NOTIFICATION_SETTINGS_KEY, JSON.stringify(settings));
  } catch (error) {
    console.error('Error saving notification settings:', error);
  }
}

// ============================================================================
// NOTIFICATION SCHEDULING
// ============================================================================

/**
 * Schedule daily medication reminders for all active medications
 */
export async function scheduleMedicationNotifications(medications: Medication[]): Promise<void> {
  try {
    // Check permissions
    const hasPermission = await hasNotificationPermissions();
    if (!hasPermission) {
      console.log('No notification permissions, skipping scheduling');
      return;
    }

    // Check if notifications are enabled
    const settings = await getNotificationSettings();
    if (!settings.enabled) {
      console.log('Notifications disabled in settings');
      return;
    }

    // Cancel existing medication notifications
    await cancelAllNotifications();

    // Schedule notifications for each active medication
    const activeMedications = medications.filter(m => m.active);
    
    for (const medication of activeMedications) {
      await scheduleMedicationNotification(medication, settings);
    }

    console.log(`Scheduled ${activeMedications.length} medication notifications`);
  } catch (error) {
    console.error('Error scheduling medication notifications:', error);
  }
}

/**
 * Schedule a single medication notification
 */
async function scheduleMedicationNotification(
  medication: Medication,
  settings: NotificationSettings
): Promise<void> {
  try {
    const [hours, minutes] = medication.time.split(':').map(Number);

    // Calculate trigger time (adjust for reminder minutes before)
    let triggerHour = hours;
    let triggerMinute = minutes - settings.reminderMinutesBefore;

    if (triggerMinute < 0) {
      triggerMinute += 60;
      triggerHour -= 1;
    }
    if (triggerHour < 0) {
      triggerHour += 24;
    }

    // Create a date for the trigger time
    const now = new Date();
    const scheduleDate = new Date();
    scheduleDate.setHours(triggerHour);
    scheduleDate.setMinutes(triggerMinute);
    scheduleDate.setSeconds(0);
    scheduleDate.setMilliseconds(0);

    // If the time has already passed today, schedule for tomorrow
    if (scheduleDate <= now) {
      scheduleDate.setDate(scheduleDate.getDate() + 1);
    }

    const notificationBody = `Time to take ${medication.name} (${medication.dosage})`;

    await Notifications.scheduleNotificationAsync({
      content: {
        title: '💊 Medication Reminder',
        body: notificationBody,
        data: {
          medicationId: medication.id,
          medicationName: medication.name,
          medicationDosage: medication.dosage,
          type: 'medication_reminder',
          // Store for snooze functionality
          title: '💊 Medication Reminder',
          body: notificationBody,
        },
        sound: settings.soundEnabled ? 'default' : undefined,
        badge: 1,
        categoryIdentifier: 'medication', // Enables quick actions on iOS
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.CALENDAR,
        hour: triggerHour,
        minute: triggerMinute,
        repeats: true,
        channelId: Platform.OS === 'android' ? 'medication-reminders' : undefined,
      },
    });

    // Also schedule overdue alert
    await scheduleOverdueAlert(medication, settings);

    // Log for debugging
    const nextTrigger = scheduleDate <= now
      ? new Date(now.getTime() + 24 * 60 * 60 * 1000)
      : scheduleDate;
    console.log(`✓ Scheduled ${medication.name} for ${nextTrigger.toLocaleString()}`);
  } catch (error) {
    console.error(`Error scheduling notification for ${medication.name}:`, error);
  }
}

/**
 * Schedule a single one-time notification (for appointments, etc.)
 */
export async function scheduleOneTimeNotification(
  title: string,
  body: string,
  triggerDate: Date,
  data?: Record<string, any>,
  categoryIdentifier?: string
): Promise<string | null> {
  try {
    const hasPermission = await hasNotificationPermissions();
    if (!hasPermission) {
      console.log('No notification permissions');
      return null;
    }

    const settings = await getNotificationSettings();
    if (!settings.enabled) {
      console.log('Notifications disabled');
      return null;
    }

    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data: {
          ...(data || {}),
          // Store for potential snooze/re-schedule
          title,
          body,
        },
        sound: settings.soundEnabled ? 'default' : undefined,
        badge: 1,
        categoryIdentifier: categoryIdentifier || undefined, // Enables quick actions
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: triggerDate,
        channelId: Platform.OS === 'android' ? 'medication-reminders' : undefined,
      },
    });

    return notificationId;
  } catch (error) {
    console.error('Error scheduling one-time notification:', error);
    return null;
  }
}

// ============================================================================
// NOTIFICATION MANAGEMENT
// ============================================================================

/**
 * Cancel all scheduled notifications
 */
export async function cancelAllNotifications(): Promise<void> {
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
  } catch (error) {
    console.error('Error canceling all notifications:', error);
  }
}

/**
 * Cancel a specific notification by ID
 */
export async function cancelNotification(notificationId: string): Promise<void> {
  try {
    await Notifications.cancelScheduledNotificationAsync(notificationId);
  } catch (error) {
    console.error('Error canceling notification:', error);
  }
}

/**
 * Get all scheduled notifications
 */
export async function getScheduledNotifications(): Promise<Notifications.NotificationRequest[]> {
  try {
    return await Notifications.getAllScheduledNotificationsAsync();
  } catch (error) {
    console.error('Error getting scheduled notifications:', error);
    return [];
  }
}

/**
 * Clear all delivered notifications from notification center
 */
export async function clearDeliveredNotifications(): Promise<void> {
  try {
    await Notifications.dismissAllNotificationsAsync();
  } catch (error) {
    console.error('Error clearing delivered notifications:', error);
  }
}

/**
 * Set up notification response listener (handles taps on notifications)
 */
export function addNotificationResponseListener(
  callback: (response: Notifications.NotificationResponse) => void
): Notifications.Subscription {
  return Notifications.addNotificationResponseReceivedListener(callback);
}

/**
 * Set up notification received listener (handles notifications while app is foregrounded)
 */
export function addNotificationReceivedListener(
  callback: (notification: Notifications.Notification) => void
): Notifications.Subscription {
  return Notifications.addNotificationReceivedListener(callback);
}

// ============================================================================
// OVERDUE ALERTS
// ============================================================================

/**
 * Schedule overdue alert for a medication
 */
async function scheduleOverdueAlert(
  medication: Medication,
  settings: NotificationSettings
): Promise<void> {
  try {
    if (!settings.overdueAlertsEnabled) return;

    const [hours, minutes] = medication.time.split(':').map(Number);

    // Calculate overdue time: scheduled + grace period + alert delay
    const totalDelayMinutes = settings.gracePeriodMinutes + settings.overdueAlertMinutes;
    let overdueHour = hours;
    let overdueMinute = minutes + totalDelayMinutes;

    while (overdueMinute >= 60) {
      overdueMinute -= 60;
      overdueHour += 1;
    }
    if (overdueHour >= 24) {
      overdueHour -= 24;
    }

    await Notifications.scheduleNotificationAsync({
      content: {
        title: '⚠️ Medication Overdue',
        body: `${medication.name} is ${settings.overdueAlertMinutes} minutes overdue`,
        data: {
          medicationId: medication.id,
          medicationName: medication.name,
          type: 'medication_overdue',
        },
        sound: 'default',
        badge: 1,
        categoryIdentifier: 'medication-overdue',
        priority: Notifications.AndroidNotificationPriority.HIGH,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.CALENDAR,
        hour: overdueHour,
        minute: overdueMinute,
        repeats: true,
        channelId: Platform.OS === 'android' ? 'medication-overdue' : undefined,
      },
    });
  } catch (error) {
    console.error('Error scheduling overdue alert:', error);
  }
}

/**
 * Setup notification categories with overdue actions
 */
export async function setupOverdueNotificationCategories(): Promise<void> {
  try {
    await Notifications.setNotificationCategoryAsync('medication-overdue', [
      {
        identifier: 'MARK_TAKEN',
        buttonTitle: 'Mark Taken',
        options: {
          opensAppToForeground: false,
        },
      },
      {
        identifier: 'SKIP_TODAY',
        buttonTitle: 'Skip Today',
        options: {
          opensAppToForeground: false,
          isDestructive: true,
        },
      },
    ]);
  } catch (error) {
    console.error('Error setting up overdue categories:', error);
  }
}

/**
 * Handle notification actions
 */
export async function handleNotificationAction(
  actionIdentifier: string,
  notification: Notifications.Notification
): Promise<void> {
  const data = notification.request.content.data;

  switch (actionIdentifier) {
    case 'MARK_TAKEN':
    case 'mark-taken':
      if (data.medicationId) {
        const { markMedicationTaken } = await import('./medicationStorage');
        await markMedicationTaken(data.medicationId);
        await Notifications.dismissNotificationAsync(notification.request.identifier);
      }
      break;

    case 'SNOOZE':
    case 'snooze':
      // Reschedule for 15 minutes later
      const snoozeTime = new Date(Date.now() + 15 * 60000);
      await Notifications.scheduleNotificationAsync({
        content: {
          title: data.title || '💊 Medication Reminder',
          body: data.body || 'Time to take medication',
          data,
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: snoozeTime,
        },
      });
      await Notifications.dismissNotificationAsync(notification.request.identifier);
      break;

    case 'SKIP_TODAY':
      // Just dismiss
      await Notifications.dismissNotificationAsync(notification.request.identifier);
      break;
  }
}

/**
 * Check if currently in quiet hours
 */
export async function isInQuietHours(): Promise<boolean> {
  const settings = await getNotificationSettings();

  if (!settings.quietHoursEnabled) return false;

  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  const [startHour, startMin] = settings.quietHoursStart.split(':').map(Number);
  const [endHour, endMin] = settings.quietHoursEnd.split(':').map(Number);

  const startMinutes = startHour * 60 + startMin;
  const endMinutes = endHour * 60 + endMin;

  // Handle overnight quiet hours (e.g., 22:00 to 07:00)
  if (startMinutes > endMinutes) {
    return currentMinutes >= startMinutes || currentMinutes < endMinutes;
  }

  return currentMinutes >= startMinutes && currentMinutes < endMinutes;
}
