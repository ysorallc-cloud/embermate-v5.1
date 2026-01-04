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
}

const DEFAULT_SETTINGS: NotificationSettings = {
  enabled: true,
  reminderMinutesBefore: 0,
  soundEnabled: true,
  vibrationEnabled: true,
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
