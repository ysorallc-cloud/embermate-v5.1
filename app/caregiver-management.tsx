// ============================================================================
// CAREGIVER MANAGEMENT SCREEN
// Edit individual caregiver permissions and details
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Colors, Spacing, BorderRadius } from '../theme/theme-tokens';
import PageHeader from '../components/PageHeader';
import {
  getCaregivers,
  removeCaregiver,
  CaregiverProfile,
} from '../utils/collaborativeCare';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function CaregiverManagementScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const caregiverId = params.id as string;
  
  const [caregiver, setCaregiver] = useState<CaregiverProfile | null>(null);
  const [permissions, setPermissions] = useState({
    canView: true,
    canEdit: false,
    canMarkMedications: false,
    canScheduleAppointments: false,
    canAddNotes: true,
    canExport: false,
  });

  useEffect(() => {
    loadCaregiver();
  }, []);

  const loadCaregiver = async () => {
    const caregivers = await getCaregivers();
    const found = caregivers.find(c => c.id === caregiverId);
    if (found) {
      setCaregiver(found);
      setPermissions(found.permissions);
    }
  };

  const handleTogglePermission = async (key: keyof typeof permissions) => {
    const newPermissions = { ...permissions, [key]: !permissions[key] };
    setPermissions(newPermissions);
    
    // Save to storage
    if (caregiver) {
      const caregivers = await getCaregivers();
      const updated = caregivers.map(c => 
        c.id === caregiverId 
          ? { ...c, permissions: newPermissions }
          : c
      );
      await AsyncStorage.setItem('@embermate_caregivers', JSON.stringify(updated));
    }
  };

  const handleRemove = () => {
    if (!caregiver) return;
    
    Alert.alert(
      'Remove Caregiver?',
      `${caregiver.name} will lose all access to care information. This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            await removeCaregiver(caregiverId);
            router.back();
          },
        },
      ]
    );
  };

  if (!caregiver) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.loadingText}>Loading...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <LinearGradient
        colors={[Colors.backgroundGradientStart, Colors.backgroundGradientEnd]}
        style={styles.gradient}
      >
        <View style={styles.headerWrapper}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
            accessibilityLabel="Go back"
            accessibilityRole="button"
          >
            <Text style={styles.backIcon}>←</Text>
          </TouchableOpacity>
          
          <PageHeader 
            emoji="👤"
            label="Caregiver Settings"
            title={caregiver.name}
          />
        </View>

        <ScrollView style={styles.content}>
          {/* Caregiver Info */}
          <View style={styles.section}>
            <View style={styles.profileCard}>
              <View 
                style={[styles.avatar, { backgroundColor: caregiver.avatarColor }]}
              >
                <Text style={styles.avatarText}>
                  {caregiver.name.charAt(0).toUpperCase()}
                </Text>
              </View>
              
              <View style={styles.profileInfo}>
                <Text style={styles.profileName}>{caregiver.name}</Text>
                <Text style={styles.profileRole}>
                  {caregiver.role.charAt(0).toUpperCase() + caregiver.role.slice(1)} Caregiver
                </Text>
                {caregiver.email && (
                  <Text style={styles.profileDetail}>{caregiver.email}</Text>
                )}
                {caregiver.phone && (
                  <Text style={styles.profileDetail}>{caregiver.phone}</Text>
                )}
                <Text style={styles.profileJoined}>
                  Joined {new Date(caregiver.joinedAt).toLocaleDateString()}
                </Text>
              </View>
            </View>
          </View>

          {/* Permissions */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>PERMISSIONS</Text>
            <Text style={styles.sectionSubtitle}>
              Control what {caregiver.name} can do
            </Text>

            <View style={styles.permissionsCard}>
              {/* View Permission (always on) */}
              <View style={styles.permissionRow}>
                <View style={styles.permissionLeft}>
                  <Text style={styles.permissionIcon}>👁️</Text>
                  <View style={styles.permissionText}>
                    <Text style={styles.permissionTitle}>View Information</Text>
                    <Text style={styles.permissionDescription}>
                      See schedules, medications, and appointments
                    </Text>
                  </View>
                </View>
                <View style={styles.permissionLocked}>
                  <Text style={styles.permissionLockedText}>Required</Text>
                </View>
              </View>

              {/* Mark Medications */}
              <View style={styles.permissionRow}>
                <View style={styles.permissionLeft}>
                  <Text style={styles.permissionIcon}>💊</Text>
                  <View style={styles.permissionText}>
                    <Text style={styles.permissionTitle}>Mark Medications</Text>
                    <Text style={styles.permissionDescription}>
                      Log when medications are taken
                    </Text>
                  </View>
                </View>
                <Switch
                  value={permissions.canMarkMedications}
                  onValueChange={() => handleTogglePermission('canMarkMedications')}
                  trackColor={{ false: Colors.borderMedium, true: Colors.accent }}
                  thumbColor={Colors.surface}
                  accessibilityLabel="Mark Medications permission"
                  accessibilityRole="switch"
                  accessibilityState={{ checked: permissions.canMarkMedications }}
                />
              </View>

              {/* Add Notes */}
              <View style={styles.permissionRow}>
                <View style={styles.permissionLeft}>
                  <Text style={styles.permissionIcon}>📝</Text>
                  <View style={styles.permissionText}>
                    <Text style={styles.permissionTitle}>Add Notes</Text>
                    <Text style={styles.permissionDescription}>
                      Create care notes and observations
                    </Text>
                  </View>
                </View>
                <Switch
                  value={permissions.canAddNotes}
                  onValueChange={() => handleTogglePermission('canAddNotes')}
                  trackColor={{ false: Colors.borderMedium, true: Colors.accent }}
                  thumbColor={Colors.surface}
                  accessibilityLabel="Add Notes permission"
                  accessibilityRole="switch"
                  accessibilityState={{ checked: permissions.canAddNotes }}
                />
              </View>

              {/* Schedule Appointments */}
              <View style={styles.permissionRow}>
                <View style={styles.permissionLeft}>
                  <Text style={styles.permissionIcon}>📅</Text>
                  <View style={styles.permissionText}>
                    <Text style={styles.permissionTitle}>Schedule Appointments</Text>
                    <Text style={styles.permissionDescription}>
                      Create and modify appointments
                    </Text>
                  </View>
                </View>
                <Switch
                  value={permissions.canScheduleAppointments}
                  onValueChange={() => handleTogglePermission('canScheduleAppointments')}
                  trackColor={{ false: Colors.borderMedium, true: Colors.accent }}
                  thumbColor={Colors.surface}
                  accessibilityLabel="Schedule Appointments permission"
                  accessibilityRole="switch"
                  accessibilityState={{ checked: permissions.canScheduleAppointments }}
                />
              </View>

              {/* Edit Data */}
              <View style={styles.permissionRow}>
                <View style={styles.permissionLeft}>
                  <Text style={styles.permissionIcon}>✏️</Text>
                  <View style={styles.permissionText}>
                    <Text style={styles.permissionTitle}>Edit All Data</Text>
                    <Text style={styles.permissionDescription}>
                      Modify medications, patient info, and settings
                    </Text>
                  </View>
                </View>
                <Switch
                  value={permissions.canEdit}
                  onValueChange={() => handleTogglePermission('canEdit')}
                  trackColor={{ false: Colors.borderMedium, true: Colors.accent }}
                  thumbColor={Colors.surface}
                  accessibilityLabel="Edit All Data permission"
                  accessibilityRole="switch"
                  accessibilityState={{ checked: permissions.canEdit }}
                />
              </View>

              {/* Export Reports */}
              <View style={styles.permissionRow}>
                <View style={styles.permissionLeft}>
                  <Text style={styles.permissionIcon}>📤</Text>
                  <View style={styles.permissionText}>
                    <Text style={styles.permissionTitle}>Export Reports</Text>
                    <Text style={styles.permissionDescription}>
                      Download care briefs and data exports
                    </Text>
                  </View>
                </View>
                <Switch
                  value={permissions.canExport}
                  onValueChange={() => handleTogglePermission('canExport')}
                  trackColor={{ false: Colors.borderMedium, true: Colors.accent }}
                  thumbColor={Colors.surface}
                  accessibilityLabel="Export Reports permission"
                  accessibilityRole="switch"
                  accessibilityState={{ checked: permissions.canExport }}
                />
              </View>
            </View>
          </View>

          {/* Activity */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>ACTIVITY</Text>
            
            <View style={styles.activityCard}>
              <View style={styles.activityRow}>
                <Text style={styles.activityLabel}>Last Active</Text>
                <Text style={styles.activityValue}>
                  {caregiver.lastActive 
                    ? new Date(caregiver.lastActive).toLocaleString()
                    : 'Never'
                  }
                </Text>
              </View>
              
              <TouchableOpacity
                style={styles.viewActivityButton}
                onPress={() => router.push('/family-activity')}
                accessibilityLabel="View all activity"
                accessibilityRole="link"
              >
                <Text style={styles.viewActivityText}>View All Activity →</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Danger Zone */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>DANGER ZONE</Text>
            
            <TouchableOpacity
              style={styles.removeButton}
              onPress={handleRemove}
              accessibilityLabel={`Remove ${caregiver.name} as caregiver`}
              accessibilityRole="button"
            >
              <Text style={styles.removeButtonText}>Remove Caregiver</Text>
            </TouchableOpacity>
            
            <Text style={styles.warningText}>
              {caregiver.name} will immediately lose all access to care information. 
              They will need a new invite code to rejoin.
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
  headerWrapper: {
    position: 'relative',
  },
  backButton: {
    position: 'absolute',
    top: 16,
    left: 24,
    width: 44,
    height: 44,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100,
  },
  backIcon: {
    fontSize: 24,
    color: Colors.textPrimary,
  },
  content: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
  },
  loadingText: {
    fontSize: 16,
    color: Colors.textPrimary,
    textAlign: 'center',
    marginTop: 100,
  },
  section: {
    marginBottom: Spacing.xl,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.2,
    color: Colors.textSecondary,
    marginBottom: Spacing.xs,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginBottom: Spacing.md,
  },
  profileCard: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginTop: Spacing.md,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  avatarText: {
    fontSize: 28,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  profileInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  profileName: {
    fontSize: 20,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  profileRole: {
    fontSize: 14,
    color: Colors.accent,
    marginBottom: Spacing.xs,
  },
  profileDetail: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginBottom: 2,
  },
  profileJoined: {
    fontSize: 12,
    color: Colors.textTertiary,
    marginTop: Spacing.xs,
  },
  permissionsCard: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
  },
  permissionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  permissionLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  permissionIcon: {
    fontSize: 24,
    marginRight: Spacing.md,
  },
  permissionText: {
    flex: 1,
  },
  permissionTitle: {
    fontSize: 15,
    fontWeight: '500',
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  permissionDescription: {
    fontSize: 12,
    color: Colors.textSecondary,
    lineHeight: 16,
  },
  permissionLocked: {
    backgroundColor: Colors.accentLight,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
    borderRadius: 6,
  },
  permissionLockedText: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.accent,
  },
  activityCard: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
  },
  activityRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  activityLabel: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  activityValue: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.textPrimary,
  },
  viewActivityButton: {
    paddingVertical: Spacing.sm,
  },
  viewActivityText: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.accent,
  },
  removeButton: {
    backgroundColor: 'rgba(200, 90, 84, 0.1)',
    borderWidth: 2,
    borderColor: 'rgba(200, 90, 84, 0.3)',
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  removeButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#C85A54',
  },
  warningText: {
    fontSize: 12,
    color: Colors.textSecondary,
    lineHeight: 18,
    textAlign: 'center',
  },
});
