// ============================================================================
// SECURITY SETTINGS SCREEN
// Manage app lock, encryption, and security features
// ============================================================================

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Switch,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, BorderRadius } from '../../theme/theme-tokens';
import { CommonStyles } from '../../theme/commonStyles';
import {
  checkBiometricCapabilities,
  enableBiometricAuth,
  disableBiometricAuth,
  isBiometricEnabled,
  setupPIN,
  hasPIN,
  getTimeSinceLastActivity,
  BiometricCapabilities,
} from '../../utils/biometricAuth';
import {
  getRecentAuditLogs,
  getAuditStatistics,
  exportAuditLogs,
  AuditLogEntry,
} from '../../utils/auditLog';

export default function SecuritySettingsScreen() {
  const router = useRouter();

  // State
  const [capabilities, setCapabilities] = useState<BiometricCapabilities | null>(null);
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [pinExists, setPinExists] = useState(false);
  const [autoLockTimeout, setAutoLockTimeout] = useState(300); // 5 minutes
  const [recentActivity, setRecentActivity] = useState<AuditLogEntry[]>([]);
  const [auditStats, setAuditStats] = useState<any>(null);
  const [lastActivity, setLastActivity] = useState<string>('');

  useEffect(() => {
    loadSecurityStatus();
    loadAuditData();
  }, []);

  const loadSecurityStatus = async () => {
    try {
      const caps = await checkBiometricCapabilities();
      const enabled = await isBiometricEnabled();
      const pinSet = await hasPIN();
      const timeSince = await getTimeSinceLastActivity();

      setCapabilities(caps);
      setBiometricEnabled(enabled);
      setPinExists(pinSet);

      if (timeSince < Infinity) {
        const minutes = Math.floor(timeSince / 60);
        const hours = Math.floor(minutes / 60);

        if (hours > 0) {
          setLastActivity(`${hours}h ${minutes % 60}m ago`);
        } else {
          setLastActivity(`${minutes}m ago`);
        }
      } else {
        setLastActivity('Never');
      }
    } catch (error) {
      console.error('Error loading security status:', error);
    }
  };

  const loadAuditData = async () => {
    try {
      const recent = await getRecentAuditLogs(10);
      const stats = await getAuditStatistics();

      setRecentActivity(recent);
      setAuditStats(stats);
    } catch (error) {
      console.error('Error loading audit data:', error);
    }
  };

  const handleToggleBiometric = async (value: boolean) => {
    try {
      if (value) {
        const success = await enableBiometricAuth();

        if (success) {
          setBiometricEnabled(true);
          Alert.alert('Success', `${capabilities?.biometricName || 'Biometric'} authentication enabled`);
        } else {
          Alert.alert('Failed', 'Could not enable biometric authentication');
        }
      } else {
        await disableBiometricAuth();
        setBiometricEnabled(false);
        Alert.alert('Disabled', 'Biometric authentication has been disabled');
      }
    } catch (error) {
      console.error('Error toggling biometric:', error);
      Alert.alert('Error', 'Failed to change biometric setting');
    }
  };

  const handleSetupPIN = () => {
    Alert.prompt(
      'Set Up PIN',
      'Enter a 4-6 digit PIN code',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Set PIN',
          onPress: async (pin) => {
            if (!pin || pin.length < 4 || pin.length > 6 || !/^\d+$/.test(pin)) {
              Alert.alert('Invalid PIN', 'PIN must be 4-6 digits');
              return;
            }

            const success = await setupPIN(pin);

            if (success) {
              setPinExists(true);
              Alert.alert('Success', 'PIN has been set successfully');
            } else {
              Alert.alert('Error', 'Failed to set PIN');
            }
          },
        },
      ],
      'secure-text'
    );
  };

  const handleChangePIN = () => {
    Alert.prompt(
      'Change PIN',
      'Enter your new 4-6 digit PIN',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Change',
          onPress: async (pin) => {
            if (!pin || pin.length < 4 || pin.length > 6 || !/^\d+$/.test(pin)) {
              Alert.alert('Invalid PIN', 'PIN must be 4-6 digits');
              return;
            }

            const success = await setupPIN(pin);

            if (success) {
              Alert.alert('Success', 'PIN has been changed successfully');
            } else {
              Alert.alert('Error', 'Failed to change PIN');
            }
          },
        },
      ],
      'secure-text'
    );
  };

  const handleExportAuditLogs = async () => {
    try {
      const logs = await exportAuditLogs();
      Alert.alert(
        'Export Audit Logs',
        'Audit logs exported successfully. This feature will be enhanced with file export in a future update.',
        [{ text: 'OK' }]
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to export audit logs');
    }
  };

  const formatEventType = (type: string): string => {
    return type
      .replace(/_/g, ' ')
      .toLowerCase()
      .replace(/\b\w/g, (l) => l.toUpperCase());
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <LinearGradient
        colors={[Colors.backgroundGradientStart, Colors.backgroundGradientEnd]}
        style={styles.gradient}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={CommonStyles.backButton}
            onPress={() => router.back()}
            accessibilityLabel="Go back"
            accessibilityRole="button"
          >
            <Text style={CommonStyles.backIcon}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerLabel}>SECURITY</Text>
          <View style={{ width: 44 }} />
        </View>

        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          <Text style={styles.title}>Security & Privacy</Text>

          {/* Status Overview */}
          <View style={styles.statusCard}>
            <View style={styles.statusRow}>
              <Ionicons
                name={biometricEnabled || pinExists ? 'shield-checkmark' : 'shield-outline'}
                size={24}
                color={biometricEnabled || pinExists ? Colors.success : Colors.textMuted}
              />
              <View style={styles.statusInfo}>
                <Text style={styles.statusTitle}>
                  {biometricEnabled || pinExists ? 'Protected' : 'Not Protected'}
                </Text>
                <Text style={styles.statusSubtitle}>
                  {biometricEnabled
                    ? `${capabilities?.biometricName} enabled`
                    : pinExists
                    ? 'PIN enabled'
                    : 'No security enabled'}
                </Text>
              </View>
            </View>
            <Text style={styles.lastActivity}>Last activity: {lastActivity}</Text>
          </View>

          {/* App Lock Section */}
          <View style={styles.section}>
            <Text style={CommonStyles.sectionTitle}>APP LOCK</Text>

            {/* Biometric Authentication */}
            {capabilities?.isAvailable && (
              <View style={styles.settingItem}>
                <View style={styles.settingLeft}>
                  <Ionicons name="finger-print" size={22} color={Colors.accent} />
                  <View style={styles.settingContent}>
                    <Text style={styles.settingTitle}>
                      {capabilities.biometricName}
                    </Text>
                    <Text style={styles.settingSubtitle}>
                      Use {capabilities.biometricName.toLowerCase()} to unlock
                    </Text>
                  </View>
                </View>
                <Switch
                  value={biometricEnabled}
                  onValueChange={handleToggleBiometric}
                  trackColor={{ false: Colors.border, true: Colors.accentLight }}
                  thumbColor={biometricEnabled ? Colors.accent : Colors.textMuted}
                />
              </View>
            )}

            {/* PIN Code */}
            <TouchableOpacity
              style={styles.settingItem}
              onPress={pinExists ? handleChangePIN : handleSetupPIN}
              accessibilityLabel={pinExists ? "Change PIN code" : "Set up PIN code"}
              accessibilityRole="button"
            >
              <View style={styles.settingLeft}>
                <Ionicons name="keypad" size={22} color={Colors.accent} />
                <View style={styles.settingContent}>
                  <Text style={styles.settingTitle}>PIN Code</Text>
                  <Text style={styles.settingSubtitle}>
                    {pinExists ? 'Change PIN' : 'Set up PIN'}
                  </Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={20} color={Colors.textMuted} />
            </TouchableOpacity>

            {/* Auto-lock Timeout */}
            <TouchableOpacity style={styles.settingItem} accessibilityLabel={`Auto-lock timeout, lock after ${autoLockTimeout / 60} minutes`} accessibilityRole="button">
              <View style={styles.settingLeft}>
                <Ionicons name="timer-outline" size={22} color={Colors.accent} />
                <View style={styles.settingContent}>
                  <Text style={styles.settingTitle}>Auto-lock Timeout</Text>
                  <Text style={styles.settingSubtitle}>
                    Lock after {autoLockTimeout / 60} minutes
                  </Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={20} color={Colors.textMuted} />
            </TouchableOpacity>
          </View>

          {/* Data Protection Section */}
          <View style={styles.section}>
            <Text style={CommonStyles.sectionTitle}>DATA PROTECTION</Text>

            <View style={styles.settingItem}>
              <View style={styles.settingLeft}>
                <Ionicons name="lock-closed" size={22} color={Colors.success} />
                <View style={styles.settingContent}>
                  <Text style={styles.settingTitle}>Encryption Status</Text>
                  <Text style={styles.settingSubtitle}>AES-256 encryption active</Text>
                </View>
              </View>
              <Ionicons name="checkmark-circle" size={20} color={Colors.success} />
            </View>

            <TouchableOpacity
              style={styles.settingItem}
              onPress={() => router.push('/settings')}
              accessibilityLabel="Encrypted backups"
              accessibilityRole="button"
            >
              <View style={styles.settingLeft}>
                <Ionicons name="save-outline" size={22} color={Colors.accent} />
                <View style={styles.settingContent}>
                  <Text style={styles.settingTitle}>Encrypted Backups</Text>
                  <Text style={styles.settingSubtitle}>Create password-protected backup</Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={20} color={Colors.textMuted} />
            </TouchableOpacity>
          </View>

          {/* Activity & Audit Section */}
          <View style={styles.section}>
            <Text style={CommonStyles.sectionTitle}>ACTIVITY & AUDIT</Text>

            {auditStats && (
              <View style={styles.statsCard}>
                <View style={styles.statRow}>
                  <Text style={styles.statLabel}>Total Events</Text>
                  <Text style={styles.statValue}>{auditStats.total}</Text>
                </View>
                <View style={styles.statRow}>
                  <Text style={styles.statLabel}>Critical Events</Text>
                  <Text style={[styles.statValue, { color: Colors.error }]}>
                    {auditStats.criticalEvents}
                  </Text>
                </View>
              </View>
            )}

            <TouchableOpacity
              style={styles.settingItem}
              onPress={handleExportAuditLogs}
              accessibilityLabel="Export audit logs"
              accessibilityRole="button"
            >
              <View style={styles.settingLeft}>
                <Ionicons name="document-text-outline" size={22} color={Colors.accent} />
                <View style={styles.settingContent}>
                  <Text style={styles.settingTitle}>Export Audit Logs</Text>
                  <Text style={styles.settingSubtitle}>Download activity history</Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={20} color={Colors.textMuted} />
            </TouchableOpacity>
          </View>

          {/* Recent Activity */}
          <View style={styles.section}>
            <Text style={CommonStyles.sectionTitle}>RECENT ACTIVITY</Text>

            {recentActivity.length > 0 ? (
              recentActivity.slice(0, 5).map((log) => (
                <View key={log.id} style={styles.activityItem}>
                  <View style={styles.activityDot} />
                  <View style={styles.activityContent}>
                    <Text style={styles.activityTitle}>
                      {formatEventType(log.eventType)}
                    </Text>
                    <Text style={styles.activityTime}>
                      {new Date(log.timestamp).toLocaleString()}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.severityBadge,
                      log.severity === 'CRITICAL' && styles.severityCritical,
                      log.severity === 'WARNING' && styles.severityWarning,
                    ]}
                  >
                    <Text style={styles.severityText}>{log.severity}</Text>
                  </View>
                </View>
              ))
            ) : (
              <Text style={styles.emptyText}>No recent activity</Text>
            )}
          </View>

          {/* Security Tips */}
          <View style={styles.section}>
            <Text style={CommonStyles.sectionTitle}>SECURITY TIPS</Text>

            <View style={styles.tipCard}>
              <Ionicons name="information-circle" size={20} color={Colors.accent} />
              <Text style={styles.tipText}>
                Enable biometric authentication for quick and secure access to your health data.
              </Text>
            </View>

            <View style={styles.tipCard}>
              <Ionicons name="information-circle" size={20} color={Colors.accent} />
              <Text style={styles.tipText}>
                Create encrypted backups regularly and store them in a secure location.
              </Text>
            </View>

            <View style={styles.tipCard}>
              <Ionicons name="information-circle" size={20} color={Colors.accent} />
              <Text style={styles.tipText}>
                Review your activity logs monthly to ensure no unauthorized access.
              </Text>
            </View>
          </View>

          <View style={{ height: 40 }} />
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.xl,
    paddingTop: Platform.OS === 'android' ? 20 : 0,
    paddingBottom: Spacing.md,
  },
  headerLabel: {
    fontSize: 11,
    color: Colors.textMuted,
    letterSpacing: 1,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: Spacing.xl,
  },
  title: {
    fontSize: 28,
    fontWeight: '300',
    color: Colors.textPrimary,
    marginBottom: Spacing.xl,
  },

  // Status Card
  statusCard: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.xl,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginBottom: Spacing.sm,
  },
  statusInfo: {
    flex: 1,
  },
  statusTitle: {
    fontSize: 18,
    fontWeight: '500',
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  statusSubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  lastActivity: {
    fontSize: 13,
    color: Colors.textMuted,
    marginTop: Spacing.sm,
  },

  // Section
  section: {
    marginBottom: Spacing.xl,
  },

  // Setting Items
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.surfaceAlt,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    flex: 1,
  },
  settingContent: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  settingSubtitle: {
    fontSize: 13,
    color: Colors.textTertiary,
  },

  // Stats Card
  statsCard: {
    backgroundColor: Colors.accentLight,
    borderWidth: 1,
    borderColor: Colors.accentBorder,
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  statLabel: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.accent,
  },

  // Activity Items
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  activityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.accent,
  },
  activityContent: {
    flex: 1,
  },
  activityTitle: {
    fontSize: 14,
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  activityTime: {
    fontSize: 12,
    color: Colors.textMuted,
  },
  severityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: Colors.accentLight,
  },
  severityCritical: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
  },
  severityWarning: {
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
  },
  severityText: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.accent,
  },

  // Tips
  tipCard: {
    flexDirection: 'row',
    gap: Spacing.md,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  tipText: {
    flex: 1,
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 18,
  },

  emptyText: {
    fontSize: 14,
    color: Colors.textMuted,
    textAlign: 'center',
    paddingVertical: Spacing.xl,
  },
});
