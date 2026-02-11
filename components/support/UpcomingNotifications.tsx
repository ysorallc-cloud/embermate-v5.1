// ============================================================================
// UPCOMING NOTIFICATIONS COMPONENT
// Shows scheduled notifications in the Support page
// ============================================================================

import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { Colors, Spacing, Typography } from '../../theme/theme-tokens';
import { SubCard, SubCardIcon, SubCardContent, SubCardArrow } from '../common/SubCard';
import {
  getUpcomingNotifications,
  snoozeNotification,
  dismissNotification,
} from '../../storage/notificationRegistry';
import type { ScheduledNotificationV2 } from '../../types/notifications';
import type { CarePlanItemType } from '../../types/carePlan';

// ============================================================================
// TYPES
// ============================================================================

interface UpcomingNotificationsProps {
  patientId?: string;
  maxItems?: number;
  onRefresh?: () => void;
}

// ============================================================================
// HELPERS
// ============================================================================

const ITEM_EMOJIS: Record<CarePlanItemType, string> = {
  medication: '💊',
  vitals: '❤️',
  mood: '😊',
  nutrition: '🍽️',
  hydration: '💧',
  activity: '🚶',
  sleep: '😴',
  appointment: '📅',
  wellness: '🌅',
  custom: '📋',
};

function formatTimeUntil(scheduledFor: string): string {
  const now = new Date();
  const scheduled = new Date(scheduledFor);
  const diffMs = scheduled.getTime() - now.getTime();

  if (diffMs < 0) {
    return 'Now';
  }

  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMinutes / 60);

  if (diffMinutes < 1) {
    return 'Now';
  }
  if (diffMinutes < 60) {
    return `in ${diffMinutes}m`;
  }
  if (diffHours < 24) {
    const mins = diffMinutes % 60;
    if (mins === 0) {
      return `in ${diffHours}h`;
    }
    return `in ${diffHours}h ${mins}m`;
  }
  return 'Tomorrow';
}

function formatScheduledTime(scheduledFor: string): string {
  const date = new Date(scheduledFor);
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

// ============================================================================
// NOTIFICATION ITEM COMPONENT
// ============================================================================

interface NotificationItemProps {
  notification: ScheduledNotificationV2;
  onSnooze: (id: string) => void;
  onDismiss: (id: string) => void;
}

const NotificationItem: React.FC<NotificationItemProps> = ({
  notification,
  onSnooze,
  onDismiss,
}) => {
  const emoji = ITEM_EMOJIS[notification.itemType] || '📋';
  const timeDisplay = formatScheduledTime(notification.scheduledFor);
  const timeUntil = formatTimeUntil(notification.scheduledFor);

  return (
    <SubCard
      __role="display"
      variant="compact"
      leading={<SubCardIcon emoji={emoji} />}
      content={
        <SubCardContent
          title={notification.itemName}
          subtitle={`${timeDisplay} · ${timeUntil}`}
        />
      }
      trailing={
        <View style={styles.itemActions}>
          <TouchableOpacity
            onPress={() => onSnooze(notification.id)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            accessibilityLabel={`Snooze ${notification.itemName} 15 minutes`}
            accessibilityRole="button"
          >
            <Text style={styles.snoozeButton}>💤</Text>
          </TouchableOpacity>
        </View>
      }
      accessibilityLabel={`${notification.itemName} scheduled for ${timeDisplay}, ${timeUntil}`}
    />
  );
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const UpcomingNotifications: React.FC<UpcomingNotificationsProps> = ({
  patientId = 'default',
  maxItems = 5,
  onRefresh,
}) => {
  const [notifications, setNotifications] = useState<ScheduledNotificationV2[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadNotifications = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const upcoming = await getUpcomingNotifications(patientId, maxItems);
      setNotifications(upcoming);
    } catch (err) {
      console.error('Failed to load notifications:', err);
      setError('Could not load notifications');
    } finally {
      setLoading(false);
    }
  }, [patientId, maxItems]);

  useEffect(() => {
    loadNotifications();

    // Refresh every minute to update "time until" displays
    const interval = setInterval(loadNotifications, 60000);
    return () => clearInterval(interval);
  }, [loadNotifications]);

  const handleSnooze = useCallback(async (id: string) => {
    try {
      await snoozeNotification(patientId, id, 15);
      await loadNotifications();
      onRefresh?.();
    } catch (err) {
      console.error('Failed to snooze notification:', err);
    }
  }, [patientId, loadNotifications, onRefresh]);

  const handleDismiss = useCallback(async (id: string) => {
    try {
      await dismissNotification(patientId, id);
      await loadNotifications();
      onRefresh?.();
    } catch (err) {
      console.error('Failed to dismiss notification:', err);
    }
  }, [patientId, loadNotifications, onRefresh]);

  const handleManagePress = useCallback(() => {
    router.push('/notification-settings');
  }, []);

  // Loading state
  if (loading && notifications.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Notifications</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color={Colors.accent} />
        </View>
      </View>
    );
  }

  // Error state
  if (error) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Notifications</Text>
        </View>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity
            onPress={loadNotifications}
            accessibilityLabel="Retry loading notifications"
            accessibilityRole="button"
          >
            <Text style={styles.retryText}>Tap to retry</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Empty state
  if (notifications.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Notifications</Text>
        </View>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyEmoji}>🔔</Text>
          <Text style={styles.emptyText}>No upcoming reminders</Text>
          <Text style={styles.emptySubtext}>
            Reminders are set per item in your Care Plan
          </Text>
        </View>
        <TouchableOpacity
          style={styles.manageButton}
          onPress={handleManagePress}
          accessibilityLabel="Manage notifications in Settings"
          accessibilityRole="link"
        >
          <Text style={styles.manageButtonText}>Manage in Settings</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Normal state with notifications
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Notifications</Text>
        <Text style={styles.headerSubtitle}>Upcoming</Text>
      </View>

      <View style={styles.list}>
        {notifications.map((notification) => (
          <NotificationItem
            key={notification.id}
            notification={notification}
            onSnooze={handleSnooze}
            onDismiss={handleDismiss}
          />
        ))}
      </View>

      <TouchableOpacity
        style={styles.manageButton}
        onPress={handleManagePress}
        accessibilityLabel="Manage notifications in Settings"
        accessibilityRole="link"
      >
        <Text style={styles.manageButtonText}>Manage in Settings</Text>
      </TouchableOpacity>
    </View>
  );
};

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.glass,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  headerSubtitle: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  list: {
    paddingHorizontal: 12,
    gap: 8,
  },
  loadingContainer: {
    paddingVertical: 32,
    alignItems: 'center',
  },
  errorContainer: {
    paddingVertical: 24,
    alignItems: 'center',
  },
  errorText: {
    fontSize: 14,
    color: Colors.amber,
    marginBottom: 8,
  },
  retryText: {
    fontSize: 14,
    color: Colors.accent,
  },
  emptyContainer: {
    paddingVertical: 24,
    alignItems: 'center',
  },
  emptyEmoji: {
    fontSize: 32,
    marginBottom: 8,
    opacity: 0.5,
  },
  emptyText: {
    fontSize: 15,
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  emptySubtext: {
    fontSize: 13,
    color: Colors.textMuted,
    textAlign: 'center',
    paddingHorizontal: 24,
  },
  manageButton: {
    paddingVertical: 14,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: Colors.glassBorder,
    marginTop: 12,
  },
  manageButtonText: {
    fontSize: 14,
    color: Colors.accent,
    fontWeight: '500',
  },
  itemActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  snoozeButton: {
    fontSize: 18,
    opacity: 0.7,
  },
});

export default UpcomingNotifications;
