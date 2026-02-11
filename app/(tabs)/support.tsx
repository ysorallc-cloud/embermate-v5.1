// ============================================================================
// SUPPORT PAGE - Your Care Team
// Hierarchy: Privacy → Care Team → Activity → Emergency (isolated)
// ============================================================================

import React, { useState, useCallback } from 'react';
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
} from '../../utils/sampleDataGenerator';

// Aurora Components
import { AuroraBackground } from '../../components/aurora/AuroraBackground';
import { GlassCard } from '../../components/aurora/GlassCard';

// Support Components
import { UpcomingNotifications } from '../../components/support/UpcomingNotifications';

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

  // Get capability tag based on permissions and role
  const getCapabilityTag = (caregiver: CaregiverProfile): string => {
    const permissions = caregiver.permissions;
    const isEmergencyContact = (caregiver as any).emergencyContact;

    if (isEmergencyContact) {
      return 'Emergency contact';
    }

    // Check what they can do based on permissions
    if (permissions?.canMarkMedications) {
      return 'Can log meds';
    }
    if (permissions?.canEdit) {
      return 'Can edit';
    }
    if (permissions?.canView && !permissions?.canEdit) {
      return 'View only';
    }

    return 'Care coordination';
  };

  // Get activity description
  const getActivityDescription = (activity: CareActivity): string => {
    switch (activity.type) {
      case 'vital_logged':
        return `updated ${activity.details?.vitalType || 'vitals'}`;
      case 'symptom_logged':
        return 'logged symptoms';
      case 'medication_taken':
        return 'logged medication';
      case 'medication_missed':
        return 'noted missed medication';
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

  // Handle activity item tap - navigate to relevant log or timeline
  const handleActivityPress = (activity: CareActivity) => {
    switch (activity.type) {
      case 'vital_logged':
        router.push('/log-vitals');
        break;
      case 'medication_taken':
      case 'medication_missed':
        router.push('/medications');
        break;
      case 'note_added':
        router.push('/log-note');
        break;
      case 'appointment_scheduled':
      case 'appointment_completed':
        router.push('/appointments');
        break;
      default:
        // Default to Now page timeline
        router.push('/(tabs)/now');
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
          text: 'Alert Everyone Now',
          style: 'destructive',
          onPress: () => {
            // Navigate to emergency screen
            router.push('/emergency');
          },
        },
      ]
    );
  };

  // AI Insight for care coordination
  const getTeamInsight = (): { text: string; icon: string } | null => {
    // Check if any team member has recent activity
    const recentActivity = activities.find(a => {
      const activityTime = new Date(a.timestamp);
      const hoursSince = (Date.now() - activityTime.getTime()) / (1000 * 60 * 60);
      return hoursSince < 24;
    });

    if (recentActivity) {
      return {
        icon: '👥',
        text: `${recentActivity.performedBy} ${getActivityDescription(recentActivity)} recently. Review before sharing.`,
      };
    }

    // No recent activity
    if (activities.length > 0) {
      return {
        icon: '📋',
        text: "No recent updates from your care team. You're the primary coordinator today.",
      };
    }

    return null;
  };

  const careCircleCount = caregivers.length + 1; // +1 for current user
  const teamInsight = getTeamInsight();

  // Get last active time for a caregiver based on activities
  const getLastActiveTime = useCallback((caregiverId: string, caregiverName: string): string | null => {
    const caregiverActivity = activities.find(a =>
      a.performedBy.toLowerCase() === caregiverName.toLowerCase() ||
      (a as any).caregiverId === caregiverId
    );
    if (caregiverActivity) {
      return getRelativeTime(caregiverActivity.timestamp);
    }
    return null;
  }, [activities]);

  // Get trusted permissions as tags
  const getTrustedPermissions = (caregiver: CaregiverProfile): string[] => {
    const permissions: string[] = [];
    if (caregiver.permissions?.canMarkMedications) permissions.push('Meds');
    if (caregiver.permissions?.canEdit) permissions.push('Edit');
    if (caregiver.permissions?.canAddNotes) permissions.push('Notes');
    return permissions;
  };

  // Handle request update action
  const handleRequestUpdate = () => {
    Alert.alert(
      'Request Update',
      'Send a gentle reminder to your care circle asking for updates on their observations.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Send Request',
          onPress: () => {
            // In future: integrate with actual messaging/notification
            Alert.alert('Request Sent', 'Your care circle has been notified.');
          },
        },
      ]
    );
  };

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
              <Text style={styles.headerSubtitle}>Your care team</Text>
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

          {/* Privacy Reassurance - Moved higher (right after Quick Action) */}
          <TouchableOpacity
            style={styles.privacyCard}
            onPress={() => router.push('/data-privacy-settings' as any)}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Data privacy settings. Nothing is shared without you"
          >
            <Text style={styles.privacyIcon}>🔒</Text>
            <View style={styles.privacyContent}>
              <Text style={styles.privacyTitle}>Nothing is shared without you</Text>
              <Text style={styles.privacyText}>
                Each person sees only what you allow. You control all access.
              </Text>
            </View>
            <Text style={styles.privacyChevron}>›</Text>
          </TouchableOpacity>

          {/* Notifications Section */}
          <View style={styles.notificationsSection}>
            <UpcomingNotifications onRefresh={onRefresh} />
          </View>

          {/* AI Insight for care coordination (optional) */}
          {teamInsight && (
            <View style={styles.teamInsightCard}>
              <Text style={styles.teamInsightIcon}>{teamInsight.icon}</Text>
              <Text style={styles.teamInsightText}>{teamInsight.text}</Text>
            </View>
          )}

          {/* Care Team List with capability tags */}
          <View style={styles.section}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionHeader}>YOUR CARE CIRCLE ({careCircleCount})</Text>
              <TouchableOpacity onPress={handleRequestUpdate} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} accessibilityRole="button" accessibilityLabel="Request update from care circle">
                <Text style={styles.requestUpdateText}>{'\uD83D\uDCE5'} Request update</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.teamContainer}>
              {caregivers.slice(0, 4).map((caregiver) => {
                const lastActive = getLastActiveTime(caregiver.id, caregiver.name);
                const trustedPermissions = getTrustedPermissions(caregiver);
                const isEmergencyContact = (caregiver as any).emergencyContact;

                return (
                  <TouchableOpacity
                    key={caregiver.id}
                    onPress={() => router.push(`/caregiver-management?id=${caregiver.id}`)}
                    activeOpacity={0.7}
                    accessibilityRole="button"
                    accessibilityLabel={`${caregiver.name}, ${getRoleLabel(caregiver)}. ${getCapabilityTag(caregiver)}`}
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
                          <View style={styles.memberNameRow}>
                            <Text style={styles.memberName}>{caregiver.name}</Text>
                            {isEmergencyContact && (
                              <Text style={styles.emergencyBadge}>⚠️</Text>
                            )}
                          </View>
                          <Text style={styles.memberRole}>{getRoleLabel(caregiver)}</Text>

                          {/* Status indicators row */}
                          <View style={styles.statusRow}>
                            {/* Last active */}
                            {lastActive && (
                              <View style={styles.statusIndicator}>
                                <Text style={styles.statusDot}>●</Text>
                                <Text style={styles.statusText}>{lastActive}</Text>
                              </View>
                            )}
                            {!lastActive && (
                              <View style={styles.statusIndicator}>
                                <Text style={[styles.statusDot, styles.statusDotInactive]}>○</Text>
                                <Text style={styles.statusText}>Not yet active</Text>
                              </View>
                            )}
                          </View>

                          {/* Trusted permissions tags */}
                          {trustedPermissions.length > 0 && (
                            <View style={styles.permissionTags}>
                              {trustedPermissions.map((perm) => (
                                <View key={perm} style={styles.permissionTag}>
                                  <Text style={styles.permissionTagText}>{perm}</Text>
                                </View>
                              ))}
                            </View>
                          )}
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
                            accessibilityRole="button"
                            accessibilityLabel={`Call ${caregiver.name}`}
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
                            accessibilityRole="button"
                            accessibilityLabel={`Message ${caregiver.name}`}
                          >
                            <Text style={styles.actionButtonIcon}>💬</Text>
                          </TouchableOpacity>
                          <Text style={styles.editChevron}>›</Text>
                        </View>
                      </View>
                    </GlassCard>
                  </TouchableOpacity>
                );
              })}

              {/* Manage team link - clearer copy */}
              <TouchableOpacity
                style={styles.manageTeamLink}
                onPress={() => router.push('/caregiver-management')}
                activeOpacity={0.7}
                accessibilityRole="link"
                accessibilityLabel="Manage access and roles"
              >
                <Text style={styles.manageTeamText}>Manage access & roles →</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Team Activity (renamed from Recent Coordination) */}
          {activities.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionHeader}>TEAM ACTIVITY</Text>
              <Text style={styles.sectionSubtitle}>What others have done recently</Text>
              <View style={styles.activityContainer}>
                {activities.slice(0, 3).map((activity, i) => (
                  <View key={activity.id || i} style={styles.activityItem}>
                    <View style={styles.activityMain}>
                      <Text style={styles.activityTime}>
                        {getRelativeTime(activity.timestamp)}
                      </Text>
                      <Text style={styles.activityText}>
                        {activity.performedBy} {getActivityDescription(activity)}
                      </Text>
                    </View>
                    <TouchableOpacity
                      style={styles.reviewButton}
                      onPress={() => handleActivityPress(activity)}
                      activeOpacity={0.7}
                      accessibilityRole="button"
                      accessibilityLabel={`Review ${activity.performedBy} ${getActivityDescription(activity)}`}
                    >
                      <Text style={styles.reviewButtonText}>Review now</Text>
                    </TouchableOpacity>
                  </View>
                ))}

                <TouchableOpacity
                  style={styles.viewAllLink}
                  onPress={() => router.push('/family-activity')}
                  activeOpacity={0.7}
                  accessibilityRole="link"
                  accessibilityLabel="View all team activity"
                >
                  <Text style={styles.viewAllText}>View all activity →</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Spacer before Emergency */}
          <View style={styles.emergencySpacer} />

          {/* Emergency Section - Isolated at bottom with clear separation */}
          <View style={styles.emergencySection}>
            <Text style={styles.emergencyQualifier}>
              Use only if immediate medical or safety attention is needed.
            </Text>
            <Text style={styles.emergencyHeader}>⚠️ EMERGENCY ONLY</Text>
            <TouchableOpacity
              style={styles.emergencyButton}
              onPress={handleEmergencyAlert}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="Alert care team now. Emergency only"
            >
              <Text style={styles.emergencyButtonText}>🆘 Alert care team now</Text>
            </TouchableOpacity>
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

  // Privacy Reassurance - Moved higher, horizontal layout
  privacyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(94, 234, 212, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(94, 234, 212, 0.15)',
    borderRadius: 12,
    padding: 14,
    marginBottom: 20,
    gap: 12,
  },
  privacyContent: {
    flex: 1,
  },
  privacyIcon: {
    fontSize: 24,
  },
  privacyTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#5EEAD4',
    marginBottom: 2,
  },
  privacyText: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.6)',
    lineHeight: 15,
  },
  privacyChevron: {
    fontSize: 18,
    color: 'rgba(94, 234, 212, 0.5)',
    fontWeight: '600',
    marginLeft: 8,
  },

  // Notifications Section
  notificationsSection: {
    marginBottom: 20,
  },

  // Team Insight Card (AI)
  teamInsightCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(139, 92, 246, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.2)',
    borderRadius: 10,
    padding: 12,
    marginBottom: 20,
    gap: 10,
  },
  teamInsightIcon: {
    fontSize: 16,
    marginTop: 1,
  },
  teamInsightText: {
    flex: 1,
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.8)',
    lineHeight: 18,
  },

  // Sections
  section: {
    marginBottom: 24,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  sectionHeader: {
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.5)',
    letterSpacing: 1,
    textTransform: 'uppercase',
    paddingHorizontal: 4,
  },
  requestUpdateText: {
    fontSize: 12,
    fontWeight: '500',
    color: 'rgba(94, 234, 212, 0.7)',
  },
  sectionSubtitle: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.4)',
    marginBottom: 12,
    paddingHorizontal: 4,
  },

  // Care Team
  teamContainer: {
    gap: 10,
    marginTop: 8,
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
  memberNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  memberName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  emergencyBadge: {
    fontSize: 12,
  },
  memberRole: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.5)',
    marginBottom: 6,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  statusIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statusDot: {
    fontSize: 8,
    color: '#5EEAD4',
  },
  statusDotInactive: {
    color: 'rgba(255, 255, 255, 0.3)',
  },
  statusText: {
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.5)',
  },
  permissionTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  permissionTag: {
    backgroundColor: 'rgba(94, 234, 212, 0.12)',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  permissionTagText: {
    fontSize: 9,
    fontWeight: '600',
    color: 'rgba(94, 234, 212, 0.9)',
    letterSpacing: 0.3,
  },
  capabilityTag: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(94, 234, 212, 0.12)',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  capabilityTagText: {
    fontSize: 9,
    fontWeight: '600',
    color: 'rgba(94, 234, 212, 0.9)',
    letterSpacing: 0.3,
  },
  memberActions: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
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
    color: 'rgba(94, 234, 212, 0.8)',
    fontWeight: '500',
  },

  // Team Activity (renamed from Recent Coordination)
  activityContainer: {
    gap: 0,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderLeftWidth: 3,
    borderLeftColor: 'rgba(94, 234, 212, 0.3)',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  activityMain: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  activityTime: {
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.5)',
    width: 70,
  },
  activityText: {
    flex: 1,
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  reviewButton: {
    backgroundColor: 'rgba(94, 234, 212, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(94, 234, 212, 0.3)',
    borderRadius: 6,
    paddingVertical: 6,
    paddingHorizontal: 10,
    marginLeft: 8,
  },
  reviewButtonText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#5EEAD4',
  },
  activityChevron: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.3)',
    marginLeft: 8,
  },
  viewAllLink: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  viewAllText: {
    fontSize: 12,
    color: 'rgba(94, 234, 212, 0.7)',
  },

  // Emergency Section - Isolated with more separation
  emergencySpacer: {
    height: 32,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.06)',
    marginTop: 16,
  },
  emergencySection: {
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
    borderWidth: 2,
    borderColor: 'rgba(239, 68, 68, 0.25)',
    borderRadius: 14,
    padding: 20,
    marginTop: 8,
  },
  emergencyQualifier: {
    fontSize: 11,
    color: 'rgba(239, 68, 68, 0.7)',
    textAlign: 'center',
    marginBottom: 12,
    lineHeight: 15,
  },
  emergencyHeader: {
    fontSize: 12,
    fontWeight: '600',
    color: '#EF4444',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    textAlign: 'center',
    marginBottom: 14,
  },
  emergencyButton: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderWidth: 2,
    borderColor: 'rgba(239, 68, 68, 0.4)',
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
});
