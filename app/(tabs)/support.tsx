// ============================================================================
// SUPPORT PAGE - Clear Modes Redesign
// "Who's with me, and how do I reach them?"
// Hierarchy: Primary Action → Care Team → Activity → Emergency → Privacy
// ============================================================================

import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Linking,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors, Spacing, Typography, BorderRadius } from '../../theme/theme-tokens';
import {
  getCaregivers,
  getCareActivities,
  CaregiverProfile,
  CareActivity,
  SharePermissions,
} from '../../utils/collaborativeCare';
import {
  getSampleCaregivers,
  getSampleActivities,
  initializeSampleData,
} from '../../utils/sampleDataGenerator';

// Storage key for last viewed activity timestamp
const LAST_VIEWED_KEY = '@embermate_care_last_viewed';

// Aurora Components
import { AuroraBackground } from '../../components/aurora/AuroraBackground';
import { GlassCard } from '../../components/aurora/GlassCard';

export default function SupportScreen() {
  const router = useRouter();
  const [caregivers, setCaregivers] = useState<CaregiverProfile[]>([]);
  const [activities, setActivities] = useState<CareActivity[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  const loadData = async () => {
    // Initialize sample data if needed
    await initializeSampleData();

    let team = await getCaregivers();

    // Use sample caregivers if the team is empty (for demo)
    if (team.length === 0) {
      team = getSampleCaregivers() as CaregiverProfile[];
    }

    setCaregivers(team);

    let acts = await getCareActivities(100);

    // Use sample activities if none exist (for demo)
    if (acts.length === 0 && team.length > 0) {
      acts = getSampleActivities() as CareActivity[];
    }

    setActivities(acts);
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, []);

  // Get role label with relationship
  const getRoleLabel = (caregiver: CaregiverProfile): string => {
    const relationship = (caregiver as any).relationship;
    if (relationship) {
      return relationship;
    }
    switch (caregiver.role) {
      case 'family':
        return 'Family member';
      case 'caregiver':
        return 'Caregiver';
      case 'healthcare':
        return 'Healthcare provider';
      default:
        return 'Care team';
    }
  };

  // Get activity description
  const getActivityDescription = (activity: CareActivity): string => {
    switch (activity.type) {
      case 'vital_logged':
        return `updated ${activity.details?.vitalType || 'vitals'}`;
      case 'symptom_logged':
        return 'logged symptoms';
      case 'medication_taken':
        return 'took medication';
      case 'medication_missed':
        return 'missed medication';
      case 'note_added':
        if (activity.details?.action?.includes('shared')) {
          return `${activity.details.action}${activity.details.recipient ? ` with ${activity.details.recipient}` : ''}`;
        }
        return activity.details?.action || 'added a note';
      case 'appointment_scheduled':
        return 'scheduled appointment';
      case 'appointment_completed':
        return 'completed appointment';
      case 'caregiver_joined':
        return 'joined the care team';
      default:
        return 'updated';
    }
  };

  // Handle emergency alert with confirmation
  const handleEmergencyAlert = () => {
    Alert.alert(
      'Alert Care Team?',
      'This will immediately notify all care team members that you need help.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Alert Now',
          style: 'destructive',
          onPress: () => {
            // Navigate to emergency screen
            router.push('/emergency');
          },
        },
      ]
    );
  };

  const careCircleCount = caregivers.length + 1; // +1 for current user

  return (
    <View style={styles.container}>
      <AuroraBackground variant="care" />

      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={Colors.accent}
            />
          }
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerText}>
              <Text style={styles.headerTitle}>Support</Text>
              <Text style={styles.headerSubtitle}>Who's with me, and how do I reach them</Text>
            </View>
            <TouchableOpacity
              style={styles.settingsButton}
              onPress={() => router.push('/notification-settings')}
              accessible={true}
              accessibilityRole="button"
              accessibilityLabel="Notifications"
            >
              <Text style={styles.settingsIcon}>🔔</Text>
            </TouchableOpacity>
          </View>

          {/* Primary Action (Dominant) */}
          <View style={styles.primaryAction}>
            <Text style={styles.primaryActionLabel}>QUICK ACTION</Text>
            <TouchableOpacity
              style={styles.primaryActionButton}
              onPress={() => router.push('/family-sharing')}
              activeOpacity={0.7}
            >
              <Text style={styles.primaryActionButtonText}>📢 Send an update</Text>
            </TouchableOpacity>
          </View>

          {/* Care Team List */}
          <View style={styles.section}>
            <Text style={styles.sectionHeader}>YOUR CARE CIRCLE ({careCircleCount})</Text>
            <View style={styles.teamContainer}>
              {caregivers.slice(0, 4).map((caregiver) => (
                <TouchableOpacity
                  key={caregiver.id}
                  onPress={() => router.push(`/caregiver-management?id=${caregiver.id}`)}
                  activeOpacity={0.7}
                >
                  <GlassCard style={styles.memberCard}>
                    <View style={styles.memberContent}>
                      <View
                        style={[
                          styles.memberAvatar,
                          { backgroundColor: `${caregiver.avatarColor || Colors.accent}20` },
                        ]}
                      >
                        <Text style={styles.memberAvatarText}>
                          {caregiver.name.charAt(0).toUpperCase()}
                        </Text>
                      </View>
                      <View style={styles.memberInfo}>
                        <Text style={styles.memberName}>{caregiver.name}</Text>
                        <Text style={styles.memberRole}>{getRoleLabel(caregiver)}</Text>
                      </View>
                      <View style={styles.memberActions}>
                        <TouchableOpacity
                          style={styles.actionButton}
                          onPress={(e) => {
                            e.stopPropagation();
                            const phone = (caregiver as any).phone || '';
                            if (phone) Linking.openURL(`tel:${phone}`);
                          }}
                          activeOpacity={0.7}
                        >
                          <Text style={styles.actionButtonIcon}>📞</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.actionButton}
                          onPress={(e) => {
                            e.stopPropagation();
                            const phone = (caregiver as any).phone || '';
                            if (phone) Linking.openURL(`sms:${phone}`);
                          }}
                          activeOpacity={0.7}
                        >
                          <Text style={styles.actionButtonIcon}>💬</Text>
                        </TouchableOpacity>
                        <Text style={styles.editChevron}>›</Text>
                      </View>
                    </View>
                  </GlassCard>
                </TouchableOpacity>
              ))}

              {/* Manage team link */}
              <TouchableOpacity
                style={styles.manageTeamLink}
                onPress={() => router.push('/caregiver-management')}
                activeOpacity={0.7}
              >
                <Text style={styles.manageTeamText}>Manage team →</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Recent Coordination (limited to 3) */}
          {activities.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionHeader}>RECENT COORDINATION</Text>
              <View style={styles.activityContainer}>
                {activities.slice(0, 3).map((activity, i) => (
                  <View key={activity.id || i} style={styles.activityItem}>
                    <Text style={styles.activityTime}>
                      {getRelativeTime(activity.timestamp)}
                    </Text>
                    <Text style={styles.activityText}>
                      {activity.performedBy} {getActivityDescription(activity)}
                    </Text>
                  </View>
                ))}

                <TouchableOpacity
                  style={styles.viewAllLink}
                  onPress={() => router.push('/family-activity')}
                  activeOpacity={0.7}
                >
                  <Text style={styles.viewAllText}>View all →</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Emergency Section (Visually Distinct) */}
          <View style={styles.emergencySection}>
            <Text style={styles.emergencyHeader}>⚠️ EMERGENCY ONLY</Text>
            <TouchableOpacity
              style={styles.emergencyButton}
              onPress={handleEmergencyAlert}
              activeOpacity={0.7}
            >
              <Text style={styles.emergencyButtonText}>🆘 Alert care team now</Text>
            </TouchableOpacity>
          </View>

          {/* Privacy Reassurance */}
          <View style={styles.privacyCard}>
            <Text style={styles.privacyIcon}>🔒</Text>
            <Text style={styles.privacyTitle}>Nothing is shared without you</Text>
            <Text style={styles.privacyText}>
              Each person sees only what you allow. You control all access.
            </Text>
          </View>

          {/* Bottom spacing */}
          <View style={{ height: 100 }} />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

function getRelativeTime(timestamp: string): string {
  const now = new Date();
  const time = new Date(timestamp);
  const diffMs = now.getTime() - time.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffHours / 24);

  if (diffHours < 1) return 'Just now';
  if (diffHours === 1) return '1 hour ago';
  if (diffHours < 24) return `${diffHours} hours ago`;
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  return time.toLocaleDateString();
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  safeArea: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.xl,
  },

  // Header
  header: {
    paddingTop: 60,
    paddingHorizontal: 0,
    paddingBottom: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  headerText: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 34,
    fontWeight: '300',
    color: '#FFFFFF',
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  headerSubtitle: {
    fontSize: 15,
    fontWeight: '400',
    color: 'rgba(255, 255, 255, 0.6)',
    letterSpacing: 0.3,
  },
  settingsButton: {
    width: 44,
    height: 44,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 16,
  },
  settingsIcon: {
    fontSize: 24,
  },

  // Primary Action (Dominant)
  primaryAction: {
    backgroundColor: 'rgba(94, 234, 212, 0.15)',
    borderWidth: 2,
    borderColor: 'rgba(94, 234, 212, 0.4)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    alignItems: 'center',
  },
  primaryActionLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.7)',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  primaryActionButton: {
    backgroundColor: 'rgba(94, 234, 212, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(94, 234, 212, 0.4)',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 24,
  },
  primaryActionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#5EEAD4',
  },

  // Sections
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.5)',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 12,
    paddingHorizontal: 4,
  },

  // Care Team
  teamContainer: {
    gap: 10,
  },
  memberCard: {
    padding: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  memberContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  memberAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  memberAvatarText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  memberInfo: {
    flex: 1,
  },
  memberName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  memberRole: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.5)',
  },
  memberActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    width: 32,
    height: 32,
    backgroundColor: 'rgba(94, 234, 212, 0.12)',
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionButtonIcon: {
    fontSize: 16,
  },
  editChevron: {
    fontSize: 18,
    color: 'rgba(255, 255, 255, 0.4)',
    marginLeft: 4,
  },
  manageTeamLink: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  manageTeamText: {
    fontSize: 12,
    color: 'rgba(94, 234, 212, 0.7)',
  },

  // Recent Coordination
  activityContainer: {
    gap: 0,
  },
  activityItem: {
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderLeftWidth: 3,
    borderLeftColor: 'rgba(94, 234, 212, 0.3)',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  activityTime: {
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.5)',
    marginBottom: 4,
  },
  activityText: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  viewAllLink: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  viewAllText: {
    fontSize: 12,
    color: 'rgba(94, 234, 212, 0.7)',
  },

  // Emergency Section (Visually Distinct - Red)
  emergencySection: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderWidth: 2,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    borderRadius: 14,
    padding: 16,
    marginTop: 8,
    marginBottom: 16,
  },
  emergencyHeader: {
    fontSize: 12,
    fontWeight: '600',
    color: '#EF4444',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    textAlign: 'center',
    marginBottom: 12,
  },
  emergencyButton: {
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    borderWidth: 2,
    borderColor: 'rgba(239, 68, 68, 0.5)',
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emergencyButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#EF4444',
  },

  // Privacy Reassurance
  privacyCard: {
    backgroundColor: 'rgba(94, 234, 212, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(94, 234, 212, 0.15)',
    borderRadius: 12,
    padding: 14,
    marginTop: 8,
  },
  privacyIcon: {
    fontSize: 20,
    marginBottom: 6,
  },
  privacyTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#5EEAD4',
    marginBottom: 4,
  },
  privacyText: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.7)',
    lineHeight: 16,
  },
});
