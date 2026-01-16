// ============================================================================
// NOTIFICATION TYPES
// Settings and data structures for push notifications
// ============================================================================

export interface NotificationSettings {
  // Master toggles
  medicationReminders: boolean;
  overdueAlerts: boolean;
  wellnessReminders: boolean;
  appointmentReminders: boolean;

  // Timing
  gracePeriodMinutes: number; // Default: 15
  overdueAlertMinutes: number; // Default: 30
  escalationMinutes: number; // Default: 60
  maxRemindersPerItem: number; // Default: 3

  // Quiet hours
  quietHoursEnabled: boolean;
  quietHoursStart: string; // "22:00"
  quietHoursEnd: string; // "07:00"

  // Sound & vibration
  soundEnabled: boolean;
  vibrationEnabled: boolean;
  criticalAlertsEnabled: boolean; // iOS only - bypass silent mode
}

export const DEFAULT_NOTIFICATION_SETTINGS: NotificationSettings = {
  medicationReminders: true,
  overdueAlerts: true,
  wellnessReminders: true,
  appointmentReminders: true,

  gracePeriodMinutes: 15,
  overdueAlertMinutes: 30,
  escalationMinutes: 60,
  maxRemindersPerItem: 3,

  quietHoursEnabled: true,
  quietHoursStart: '22:00',
  quietHoursEnd: '07:00',

  soundEnabled: true,
  vibrationEnabled: true,
  criticalAlertsEnabled: false,
};

export interface ScheduledNotification {
  id: string;
  type: 'scheduled' | 'overdue' | 'escalation';
  itemId: string;
  itemType: 'medication' | 'wellness' | 'appointment';
  scheduledFor: string; // ISO timestamp
  title: string;
  body: string;
  data: Record<string, any>;
  sent: boolean;
  dismissed: boolean;
  actioned: boolean;
}
