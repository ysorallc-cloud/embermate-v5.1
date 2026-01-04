// ============================================================================
// NOTIFICATION DEBUG SCREEN
// Testing and debugging notification functionality
// For development use - can be removed before production
// ============================================================================

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import * as Notifications from 'expo-notifications';
import { Colors, Spacing, BorderRadius } from './_theme/theme-tokens';
import {
  requestNotificationPermissions,
  hasNotificationPermissions,
  scheduleMedicationNotifications,
  getScheduledNotifications,
  cancelAllNotifications,
  scheduleOneTimeNotification,
} from '../utils/notificationService';
import { getMedications } from '../utils/medicationStorage';
import { scheduleAllAppointmentNotifications } from '../utils/appointmentStorage';
import PageHeader from '../components/PageHeader';

export default function NotificationDebugScreen() {
  const router = useRouter();
  const [hasPermission, setHasPermission] = useState(false);
  const [scheduledCount, setScheduledCount] = useState(0);
  const [scheduledNotifications, setScheduledNotifications] = useState<Notifications.NotificationRequest[]>([]);

  useEffect(() => {
    loadStatus();
  }, []);

  const loadStatus = async () => {
    const permission = await hasNotificationPermissions();
    setHasPermission(permission);
    
    const notifications = await getScheduledNotifications();
    setScheduledCount(notifications.length);
    setScheduledNotifications(notifications);
  };

  const handleRequestPermissions = async () => {
    const granted = await requestNotificationPermissions();
    setHasPermission(granted);
    Alert.alert(
      granted ? 'Success' : 'Denied',
      granted ? 'Notification permissions granted' : 'Notification permissions denied'
    );
  };

  const handleScheduleMedications = async () => {
    const medications = await getMedications();
    await scheduleMedicationNotifications(medications.filter(m => m.active));
    await loadStatus();
    Alert.alert('Success', 'Medication notifications scheduled');
  };

  const handleScheduleAppointments = async () => {
    await scheduleAllAppointmentNotifications();
    await loadStatus();
    Alert.alert('Success', 'Appointment notifications scheduled');
  };

  const handleScheduleTestNotification = async () => {
    // Schedule a notification 5 seconds from now with quick actions
    const triggerDate = new Date(Date.now() + 5000);
    const meds = await getMedications();
    const firstMed = meds.find(m => m.active);
    
    if (!firstMed) {
      Alert.alert('No Medications', 'Add a medication first to test quick actions');
      return;
    }

    await Notifications.scheduleNotificationAsync({
      content: {
        title: '💊 Test Medication Reminder',
        body: `Time to take ${firstMed.name} (${firstMed.dosage})`,
        data: {
          medicationId: firstMed.id,
          medicationName: firstMed.name,
          medicationDosage: firstMed.dosage,
          type: 'medication_reminder',
          title: '💊 Test Medication Reminder',
          body: `Time to take ${firstMed.name} (${firstMed.dosage})`,
        },
        categoryIdentifier: 'medication', // Enables "Mark Taken" and "Snooze" buttons
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: triggerDate,
      },
    });

    Alert.alert(
      'Scheduled', 
      'Test notification with quick actions will appear in 5 seconds. Long-press or swipe to see "Mark Taken" and "Snooze 15m" buttons.'
    );
  };

  const handleCancelAll = async () => {
    await cancelAllNotifications();
    await loadStatus();
    Alert.alert('Success', 'All notifications cancelled');
  };

  const handleViewScheduled = () => {
    if (scheduledNotifications.length === 0) {
      Alert.alert('No Notifications', 'No notifications are currently scheduled');
      return;
    }

    const details = scheduledNotifications.map((notif, idx) => {
      const trigger = notif.trigger as any;
      const timeStr = trigger.hour !== undefined 
        ? `Daily at ${trigger.hour}:${String(trigger.minute).padStart(2, '0')}`
        : trigger.date 
          ? new Date(trigger.date).toLocaleString()
          : 'Unknown';
      return `${idx + 1}. ${notif.content.title}\n   ${timeStr}`;
    }).join('\n\n');

    Alert.alert('Scheduled Notifications', details);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <LinearGradient
        colors={[Colors.backgroundGradientStart, Colors.backgroundGradientEnd]}
        style={styles.gradient}
      >
        <PageHeader
          emoji="🔔"
          label="Debug Tools"
          title="Notifications"
        />

        <ScrollView style={styles.content}>
          {/* Status */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Status</Text>
            <View style={styles.statusRow}>
              <Text style={styles.statusLabel}>Permissions:</Text>
              <Text style={[styles.statusValue, hasPermission ? styles.statusGood : styles.statusBad]}>
                {hasPermission ? 'Granted ✓' : 'Not granted ✗'}
              </Text>
            </View>
            <View style={styles.statusRow}>
              <Text style={styles.statusLabel}>Scheduled:</Text>
              <Text style={styles.statusValue}>{scheduledCount} notifications</Text>
            </View>
          </View>

          {/* Actions */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Actions</Text>
            
            <TouchableOpacity
              style={[styles.button, styles.buttonPrimary]}
              onPress={handleRequestPermissions}
              disabled={hasPermission}
            >
              <Text style={styles.buttonText}>
                {hasPermission ? '✓ Permissions Granted' : 'Request Permissions'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.button}
              onPress={handleScheduleMedications}
              disabled={!hasPermission}
            >
              <Text style={styles.buttonText}>Schedule Medication Reminders</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.button}
              onPress={handleScheduleAppointments}
              disabled={!hasPermission}
            >
              <Text style={styles.buttonText}>Schedule Appointment Reminders</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.button}
              onPress={handleScheduleTestNotification}
              disabled={!hasPermission}
            >
              <Text style={styles.buttonText}>Test Notification (5s)</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.button}
              onPress={handleViewScheduled}
            >
              <Text style={styles.buttonText}>View Scheduled ({scheduledCount})</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.buttonDanger]}
              onPress={handleCancelAll}
            >
              <Text style={styles.buttonText}>Cancel All Notifications</Text>
            </TouchableOpacity>
          </View>

          {/* Info */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Info</Text>
            <Text style={styles.infoText}>
              • Medication reminders repeat daily at scheduled times{'\n'}
              • Appointment reminders fire 1 day and 1 hour before{'\n'}
              • Notifications require permission from system settings{'\n'}
              • Test notifications help verify the system is working
            </Text>
          </View>
        </ScrollView>
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  gradient: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
  },
  section: {
    marginBottom: Spacing.xl,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: Spacing.md,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  statusLabel: {
    fontSize: 14,
    color: Colors.textPrimary,
  },
  statusValue: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  statusGood: {
    color: Colors.accent,
  },
  statusBad: {
    color: '#C85A54',
  },
  button: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.borderMedium,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    alignItems: 'center',
  },
  buttonPrimary: {
    backgroundColor: Colors.accentLight,
    borderColor: Colors.accentBorder,
  },
  buttonDanger: {
    backgroundColor: 'rgba(200, 90, 84, 0.1)',
    borderColor: 'rgba(200, 90, 84, 0.3)',
  },
  buttonText: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.textPrimary,
  },
  infoText: {
    fontSize: 13,
    lineHeight: 20,
    color: Colors.textSecondary,
  },
});
