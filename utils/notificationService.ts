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

    if (__DEV__) console.log('Notification categories configured');
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
      if (__DEV__) console.log('Notification permissions not granted');
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
      if (__DEV__) console.log('No notification permissions, skipping scheduling');
      return;
    }

    // Check if notifications are enabled
    const settings = await getNotificationSettings();
    if (!settings.enabled) {
      if (__DEV__) console.log('Notifications disabled in settings');
      return;
    }

    // Cancel existing medication notifications
    await cancelAllNotifications();

    // Schedule notifications for each active medication
    const activeMedications = medications.filter(m => m.active);
    
    for (const medication of activeMedications) {
      await scheduleMedicationNotification(medication, settings);
    }

    if (__DEV__) console.log(`Scheduled ${activeMedications.length} medication notifications`);
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
    if (__DEV__) {
      const nextTrigger = scheduleDate <= now
        ? new Date(now.getTime() + 24 * 60 * 60 * 1000)
        : scheduleDate;
      console.log(`Scheduled ${medication.name} for ${nextTrigger.toLocaleString()}`);
    }
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
      if (__DEV__) console.log('No notification permissions');
      return null;
    }

    const settings = await getNotificationSettings();
    if (!settings.enabled) {
      if (__DEV__) console.log('Notifications disabled');
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

// ============================================================================
// CARE PLAN-BASED SCHEDULING (NEW UNIFIED SYSTEM)
// ============================================================================

import type { CarePlanItem, DailyCareInstance } from '../types/carePlan';
import type {
  NotificationConfig,
  DeliveryPreferences,
  ScheduledNotificationV2,
} from '../types/notifications';
import {
  getDefaultNotificationConfig,
  timingToMinutes,
} from './notificationDefaults';
import {
  saveScheduledNotifications,
  clearAllScheduledNotifications,
  replaceNotificationsForItem,
  getScheduledNotifications as getRegistryNotifications,
} from '../storage/notificationRegistry';

/**
 * Schedule notifications for all Care Plan items
 * This is the NEW unified scheduling function that reads from CarePlanItems
 */
export async function scheduleCarePlanNotifications(
  patientId: string,
  items: CarePlanItem[],
  instances: DailyCareInstance[],
  deliveryPrefs: DeliveryPreferences
): Promise<ScheduledNotificationV2[]> {
  try {
    // Check permissions
    const hasPermission = await hasNotificationPermissions();
    if (!hasPermission) {
      if (__DEV__) console.log('No notification permissions, skipping scheduling');
      return [];
    }

    // Check master toggle
    if (!deliveryPrefs.masterEnabled) {
      if (__DEV__) console.log('Notifications disabled in delivery preferences');
      await clearAllScheduledNotifications(patientId);
      await cancelAllNotifications();
      return [];
    }

    // Cancel all existing Expo notifications
    await cancelAllNotifications();

    const scheduledNotifications: ScheduledNotificationV2[] = [];
    const now = new Date();
    const today = now.toISOString().split('T')[0];

    // Group instances by item ID
    const instancesByItem = new Map<string, DailyCareInstance[]>();
    for (const instance of instances) {
      if (instance.date !== today) continue;
      if (instance.status !== 'pending') continue;

      const existing = instancesByItem.get(instance.carePlanItemId) || [];
      existing.push(instance);
      instancesByItem.set(instance.carePlanItemId, existing);
    }

    // Schedule notifications for each item
    for (const item of items) {
      if (!item.active) continue;

      // Get notification config (use item-level or defaults)
      const config = item.notification || getDefaultNotificationConfig(item.type);
      if (!config.enabled) continue;

      // Get pending instances for this item
      const itemInstances = instancesByItem.get(item.id) || [];

      for (const instance of itemInstances) {
        const scheduled = await scheduleInstanceNotification(
          patientId,
          item,
          instance,
          config,
          deliveryPrefs
        );

        if (scheduled) {
          scheduledNotifications.push(scheduled);
        }
      }
    }

    // Save to registry
    await saveScheduledNotifications(patientId, scheduledNotifications);

    if (__DEV__) {
      console.log(`Scheduled ${scheduledNotifications.length} Care Plan notifications`);
    }

    return scheduledNotifications;
  } catch (error) {
    console.error('Error scheduling Care Plan notifications:', error);
    return [];
  }
}

/**
 * Schedule notification for a single daily instance
 */
async function scheduleInstanceNotification(
  patientId: string,
  item: CarePlanItem,
  instance: DailyCareInstance,
  config: NotificationConfig,
  deliveryPrefs: DeliveryPreferences
): Promise<ScheduledNotificationV2 | null> {
  try {
    // Calculate trigger time based on config timing
    const minutesBefore = timingToMinutes(config.timing, config.customMinutesBefore);
    const originalTime = parseScheduledTime(instance.scheduledTime, instance.date);
    const triggerTime = new Date(originalTime.getTime() - minutesBefore * 60 * 1000);

    // Skip if trigger time is in the past
    if (triggerTime <= new Date()) {
      return null;
    }

    // Check if in quiet hours
    if (await isTimeInQuietHours(triggerTime, deliveryPrefs)) {
      return null;
    }

    // Get emoji for item type
    const emoji = getItemEmoji(item.type);

    // Create notification content
    const title = `${emoji} ${getNotificationTitle(item.type)}`;
    const body = getNotificationBody(item, instance);

    // Schedule with Expo
    const expoNotificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data: {
          carePlanItemId: item.id,
          instanceId: instance.id,
          itemType: item.type,
          type: 'careplan_reminder',
          title,
          body,
        },
        sound: deliveryPrefs.soundEnabled ? 'default' : undefined,
        badge: 1,
        categoryIdentifier: item.type === 'medication' ? 'medication' : undefined,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: triggerTime,
        channelId: Platform.OS === 'android' ? 'medication-reminders' : undefined,
      },
    });

    // Create registry entry
    const notification: ScheduledNotificationV2 = {
      id: `${instance.id}_${Date.now()}`,
      carePlanItemId: item.id,
      itemType: item.type,
      itemName: item.name,
      scheduledFor: triggerTime.toISOString(),
      originalTime: originalTime.toISOString(),
      timing: config.timing,
      status: 'pending',
      expoNotificationId,
      followUpAttempt: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    return notification;
  } catch (error) {
    console.error(`Error scheduling notification for ${item.name}:`, error);
    return null;
  }
}

/**
 * Reschedule all notifications for a patient
 * Called when Care Plan changes
 */
export async function rescheduleAllNotifications(patientId: string): Promise<void> {
  try {
    // Import dynamically to avoid circular dependencies
    const { ensureDailyInstances } = await import('../services/carePlanGenerator');
    const { listCarePlanItems, getActiveCarePlan } = await import('../storage/carePlanRepo');
    const { getDeliveryPreferences } = await import('../storage/notificationRegistry');

    const carePlan = await getActiveCarePlan(patientId);
    if (!carePlan) {
      if (__DEV__) console.log('No active care plan, clearing notifications');
      await clearAllScheduledNotifications(patientId);
      await cancelAllNotifications();
      return;
    }

    const today = new Date().toISOString().split('T')[0];
    const items = await listCarePlanItems(carePlan.id, { activeOnly: true });
    const instances = await ensureDailyInstances(patientId, today);
    const deliveryPrefs = await getDeliveryPreferences();

    await scheduleCarePlanNotifications(patientId, items, instances, deliveryPrefs);
  } catch (error) {
    console.error('Error rescheduling notifications:', error);
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Parse scheduled time string to Date object
 */
function parseScheduledTime(scheduledTime: string, date: string): Date {
  // If it's already an ISO timestamp
  if (scheduledTime.includes('T')) {
    return new Date(scheduledTime);
  }

  // If it's HH:mm format
  const [hours, minutes] = scheduledTime.split(':').map(Number);
  const result = new Date(date);
  result.setHours(hours, minutes, 0, 0);
  return result;
}

/**
 * Check if a time is in quiet hours
 */
async function isTimeInQuietHours(time: Date, prefs: DeliveryPreferences): Promise<boolean> {
  if (!prefs.quietHours.enabled) return false;

  const timeMinutes = time.getHours() * 60 + time.getMinutes();

  const [startHour, startMin] = prefs.quietHours.start.split(':').map(Number);
  const [endHour, endMin] = prefs.quietHours.end.split(':').map(Number);

  const startMinutes = startHour * 60 + startMin;
  const endMinutes = endHour * 60 + endMin;

  // Handle overnight quiet hours (e.g., 22:00 to 07:00)
  if (startMinutes > endMinutes) {
    return timeMinutes >= startMinutes || timeMinutes < endMinutes;
  }

  return timeMinutes >= startMinutes && timeMinutes < endMinutes;
}

/**
 * Get emoji for item type
 */
function getItemEmoji(type: CarePlanItem['type']): string {
  const emojis: Record<string, string> = {
    medication: '💊',
    vitals: '❤️',
    mood: '😊',
    nutrition: '🍽️',
    hydration: '💧',
    activity: '🚶',
    sleep: '😴',
    appointment: '📅',
    custom: '📋',
  };
  return emojis[type] || '📋';
}

/**
 * Get notification title for item type
 */
function getNotificationTitle(type: CarePlanItem['type']): string {
  const titles: Record<string, string> = {
    medication: 'Medication Reminder',
    vitals: 'Time to Check Vitals',
    mood: 'How Are You Feeling?',
    nutrition: 'Meal Time',
    hydration: 'Stay Hydrated',
    activity: 'Activity Reminder',
    sleep: 'Sleep Reminder',
    appointment: 'Appointment Reminder',
    custom: 'Care Reminder',
  };
  return titles[type] || 'Care Reminder';
}

/**
 * Get notification body for an item and instance
 */
function getNotificationBody(item: CarePlanItem, instance: DailyCareInstance): string {
  switch (item.type) {
    case 'medication':
      const dose = item.medicationDetails?.dose || instance.itemDosage;
      return dose
        ? `Time to take ${item.name} (${dose})`
        : `Time to take ${item.name}`;

    case 'vitals':
      const vitalTypes = item.vitalsDetails?.vitalTypes || [];
      return vitalTypes.length > 0
        ? `Time to check: ${vitalTypes.join(', ')}`
        : 'Time to check your vitals';

    case 'mood':
      return 'Take a moment to check in with how you\'re feeling';

    case 'nutrition':
      const meal = item.nutritionDetails?.mealType || instance.itemName;
      return `Time for ${meal}`;

    case 'hydration':
      return 'Remember to drink water';

    case 'appointment':
      return item.instructions || `Upcoming: ${item.name}`;

    default:
      return item.instructions || `Time for: ${item.name}`;
  }
}
