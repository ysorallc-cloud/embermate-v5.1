// ============================================================================
// FAMILY PAGE - Aurora Redesign
// Care circle collaboration view
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

// Storage key for last viewed activity timestamp
const LAST_VIEWED_KEY = '@embermate_care_last_viewed';

// Aurora Components
import { AuroraBackground } from '../../components/aurora/AuroraBackground';
import { GlassCard } from '../../components/aurora/GlassCard';
import { SectionHeader } from '../../components/aurora/SectionHeader';

interface RecentShare {
  id: string;
  reportName: string;
  sharedWith: string;
  date: string;
}

export default function SupportScreen() {
  const router = useRouter();
  const [caregivers, setCaregivers] = useState<CaregiverProfile[]>([]);
  const [activities, setActivities] = useState<CareActivity[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [recentShares, setRecentShares] = useState<RecentShare[]>([]);

  // Phase 1: Notification badge state
  const [hasNewNotifications, setHasNewNotifications] = useState(false);
  const [lastViewedTime, setLastViewedTime] = useState<number>(0);

  // Phase 2: Collapsible activity state
  const [activityExpanded, setActivityExpanded] = useState(true);

  // Phase 3: Activity filter state
  const [activityFilter, setActivityFilter] = useState<'all' | 'shares' | 'logs'>('all');

  useFocusEffect(
    useCallback(() => {
      loadData();
      checkNotifications();
    }, [])
  );

  // Check for new notifications
  const checkNotifications = async () => {
    try {
      const stored = await AsyncStorage.getItem(LAST_VIEWED_KEY);
      const lastViewed = stored ? parseInt(stored, 10) : 0;
      setLastViewedTime(lastViewed);
    } catch (error) {
      console.error('Error checking notifications:', error);
    }
  };

  // Mark notifications as read
  const markNotificationsRead = async () => {
    try {
      const now = Date.now();
      await AsyncStorage.setItem(LAST_VIEWED_KEY, now.toString());
      setLastViewedTime(now);
      setHasNewNotifications(false);
    } catch (error) {
      console.error('Error marking notifications read:', error);
    }
  };

  const loadData = async () => {
    let team = await getCaregivers();

    // Add sample caregivers if the team is empty (for demo)
    if (team.length === 0) {
      team = [
        {
          id: 'sarah-1',
          name: 'Sarah',
          role: 'family' as const,
          email: 'sarah@example.com',
          phone: '+1234567890',
          permissions: { canView: true, canEdit: true, canMarkMedications: true, canScheduleAppointments: false, canAddNotes: true, canExport: false },
          invitedAt: new Date().toISOString(),
          joinedAt: new Date().toISOString(),
          avatarColor: Colors.rose,
          lastActive: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
        },
        {
          id: 'dr-chen-1',
          name: 'Dr. Chen',
          role: 'healthcare' as const,
          email: 'dr.chen@example.com',
          phone: '+0987654321',
          permissions: { canView: true, canEdit: false, canMarkMedications: false, canScheduleAppointments: false, canAddNotes: true, canExport: false },
          invitedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days ago
          joinedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
          avatarColor: Colors.purple,
          lastActive: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
        },
      ];
    }

    setCaregivers(team);

    let acts = await getCareActivities(100);

    // Add sample activities if none exist (for demo)
    if (acts.length === 0 && team.length > 0) {
      acts = [
        {
          id: 'act-1',
          type: 'vital_logged' as const,
          performedBy: 'Sarah',
          performedById: 'sarah-1',
          timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
          details: { vitalType: 'evening vitals' },
        },
        {
          id: 'act-2',
          type: 'note_added' as const,
          performedBy: 'You',
          performedById: 'user',
          timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
          details: { action: 'shared weekly summary', recipient: 'Sarah' },
        },
        {
          id: 'act-3',
          type: 'note_added' as const,
          performedBy: 'You',
          performedById: 'user',
          timestamp: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
          details: { action: 'shared medication report', recipient: 'Dr. Chen' },
        },
      ];
    }

    setActivities(acts);

    // Check for new notifications (activities since last viewed)
    const stored = await AsyncStorage.getItem(LAST_VIEWED_KEY);
    const lastViewed = stored ? parseInt(stored, 10) : 0;
    const hasNew = acts.some(a => new Date(a.timestamp).getTime() > lastViewed);
    setHasNewNotifications(hasNew);

    // Keep recent shares for backwards compatibility (but we'll merge into activity)
    if (team.length > 0) {
      setRecentShares([
        {
          id: '1',
          reportName: 'Weekly Health Summary',
          sharedWith: 'Sarah',
          date: '2 days ago',
        },
        {
          id: '2',
          reportName: 'Medication Report',
          sharedWith: 'Dr. Chen',
          date: '1 week ago',
        },
      ]);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, []);

  // Team stats
  const activeCount = caregivers.filter(c =>
    c.lastActive && new Date(c.lastActive).getTime() > Date.now() - 24 * 60 * 60 * 1000
  ).length + 1; // +1 for current user

  const weeklyUpdates = useMemo(() => {
    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    return activities.filter(a => new Date(a.timestamp).getTime() > weekAgo).length;
  }, [activities]);

  const hasOtherCaregivers = caregivers.length > 0;

  // Get permission label for display
  const getPermissionLabel = (permissions: SharePermissions): string => {
    if (permissions.canEdit && permissions.canView) {
      return 'View & Edit';
    }
    if (permissions.canView) {
      return 'View only';
    }
    return 'Full access';
  };

  // Filter activities based on current filter
  const filteredActivities = useMemo(() => {
    if (activityFilter === 'all') return activities;
    if (activityFilter === 'shares') {
      return activities.filter(a => a.type === 'note_added' && a.details?.action?.includes('shared'));
    }
    if (activityFilter === 'logs') {
      return activities.filter(a =>
        a.type === 'vital_logged' || a.type === 'symptom_logged' ||
        a.type === 'medication_taken' || a.type === 'medication_missed'
      );
    }
    return activities;
  }, [activities, activityFilter]);

  // Get activity description for display
  const getActivityDescription = (activity: CareActivity): string => {
    switch (activity.type) {
      case 'vital_logged':
        return `logged ${activity.details?.vitalType || 'vitals'}`;
      case 'symptom_logged':
        return 'logged symptoms';
      case 'medication_taken':
        return 'took medication';
      case 'medication_missed':
        return 'missed medication';
      case 'note_added':
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

  // Get activity icon
  const getActivityIcon = (activity: CareActivity): string => {
    switch (activity.type) {
      case 'vital_logged':
        return '🫀';
      case 'symptom_logged':
        return '🩺';
      case 'medication_taken':
      case 'medication_missed':
        return '💊';
      case 'note_added':
        return activity.details?.action?.includes('shared') ? '📊' : '📝';
      case 'appointment_scheduled':
      case 'appointment_completed':
        return '📅';
      case 'caregiver_joined':
        return '👤';
      default:
        return '📝';
    }
  };

  // Get orbit member data with names
  const orbitMembers = useMemo(() => {
    const members = [
      { id: 'you', name: 'You', color: Colors.accent, angle: 180 },
    ];

    caregivers.slice(0, 2).forEach((cg, i) => {
      members.push({
        id: cg.id,
        name: cg.name.split(' ')[0], // First name only
        color: cg.avatarColor || (i === 0 ? Colors.rose : Colors.purple),
        angle: i === 0 ? 60 : 300,
      });
    });

    return members;
  }, [caregivers]);

  // Quick share actions with SOS badge
  const quickShareActions = [
    {
      icon: '✉️',
      label: 'Update',
      onPress: () => router.push('/family-sharing'),
      badge: null,
    },
    {
      icon: '📋',
      label: 'Report',
      onPress: () => router.push('/care-summary-export'),
      badge: null,
    },
    {
      icon: '📞',
      label: 'Help',
      onPress: () => router.push('/emergency'),
      badge: 'SOS',
    },
  ];

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
          {/* Header with Team Stats - Consistent with Today page */}
          <View style={styles.header}>
            <View style={styles.headerTextContainer}>
              <Text style={styles.headerDate}>
                {hasOtherCaregivers ? `${activeCount} active • ${weeklyUpdates} updates this week` : 'CARE CIRCLE'}
              </Text>
              <Text style={styles.headerTitle}>Support</Text>
              <Text style={styles.headerSubtitle}>Your care circle</Text>
            </View>
            <TouchableOpacity
              style={styles.notifButton}
              onPress={() => {
                markNotificationsRead();
                router.push('/notification-settings');
              }}
            >
              <Text style={styles.notifIcon}>🔔</Text>
              {hasNewNotifications && <View style={styles.notifBadge} />}
            </TouchableOpacity>
          </View>

          {/* Support Message */}
          {hasOtherCaregivers && (
            <GlassCard style={styles.supportCard}>
              <Text style={styles.supportText}>
                Caregiving is a shared journey. Your team is here with you.
              </Text>
            </GlassCard>
          )}

          {/* Care Circle Visual - Tappable with Names */}
          <View style={styles.circleContainer}>
            {/* Center - Care Recipient */}
            <View style={styles.centerAvatar}>
              <Text style={styles.centerAvatarText}>❤️</Text>
              <Text style={styles.centerAvatarLabel}>Loved One</Text>
            </View>

            {/* Orbiting avatars - tappable with names */}
            {orbitMembers.map((member) => {
              const angle = ((member.angle - 90) * Math.PI) / 180;
              const radius = 65;
              const x = Math.cos(angle) * radius;
              const y = Math.sin(angle) * radius;

              return (
                <TouchableOpacity
                  key={member.id}
                  style={[
                    styles.orbitAvatarWrapper,
                    {
                      left: `${50 + (x / 80) * 32}%`,
                      top: `${50 + (y / 80) * 32}%`,
                    },
                  ]}
                  onPress={() => {
                    if (member.id === 'you') {
                      router.push('/settings');
                    } else {
                      router.push('/caregiver-management');
                    }
                  }}
                  activeOpacity={0.7}
                >
                  <View
                    style={[
                      styles.orbitAvatar,
                      {
                        backgroundColor: `${member.color}20`,
                        borderColor: member.color,
                      },
                    ]}
                  >
                    <Text style={styles.orbitAvatarText}>👤</Text>
                  </View>
                  <Text style={styles.orbitName}>{member.name}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Care Team with Permissions */}
          <View style={styles.section}>
            <SectionHeader
              title={`Care Team (${caregivers.length + 1})`}
              action={{
                label: '+ Invite',
                onPress: () => router.push('/family-sharing'),
              }}
            />

            <GlassCard noPadding>
              {/* Primary Caregiver */}
              <TouchableOpacity
                style={[styles.memberRow, styles.memberRowBorder]}
                onPress={() => router.push('/settings')}
                activeOpacity={0.7}
              >
                <View style={styles.memberAvatarContainer}>
                  <View style={[
                    styles.memberAvatar,
                    {
                      backgroundColor: `${Colors.accent}20`,
                      borderColor: Colors.accent,
                    },
                  ]}>
                    <Text style={styles.memberAvatarText}>👤</Text>
                  </View>
                  <View style={[styles.memberIndicator, { backgroundColor: Colors.green }]} />
                </View>
                <View style={styles.memberContent}>
                  <View style={styles.memberNameRow}>
                    <Text style={styles.memberName}>You (Amber)</Text>
                    <View style={styles.memberRoleBadge}>
                      <Text style={styles.memberRole}>Primary</Text>
                    </View>
                  </View>
                  <Text style={styles.memberStatus}>Full access • Active now</Text>
                </View>
                <Text style={styles.memberChevron}>›</Text>
              </TouchableOpacity>

              {/* Other Caregivers with Permissions & Quick Contact */}
              {caregivers.slice(0, 3).map((caregiver, i) => {
                const isActive = caregiver.lastActive &&
                  new Date(caregiver.lastActive).getTime() > Date.now() - 24 * 60 * 60 * 1000;

                return (
                  <View
                    key={caregiver.id}
                    style={[
                      styles.memberRow,
                      i < Math.min(2, caregivers.length - 1) && styles.memberRowBorder,
                    ]}
                  >
                    <TouchableOpacity
                      style={styles.memberMainContent}
                      onPress={() => router.push('/caregiver-management')}
                      activeOpacity={0.7}
                    >
                      <View style={styles.memberAvatarContainer}>
                        <View style={[
                          styles.memberAvatar,
                          {
                            backgroundColor: `${caregiver.avatarColor || Colors.purple}20`,
                            borderColor: caregiver.avatarColor || Colors.purple,
                          },
                        ]}>
                          <Text style={styles.memberAvatarText}>👤</Text>
                        </View>
                        <View style={[
                          styles.memberIndicator,
                          { backgroundColor: isActive ? Colors.green : Colors.textMuted },
                        ]} />
                      </View>
                      <View style={styles.memberContent}>
                        <View style={styles.memberNameRow}>
                          <Text style={styles.memberName}>{caregiver.name}</Text>
                          <View style={styles.memberRoleBadge}>
                            <Text style={styles.memberRole}>
                              {caregiver.role === 'family' ? 'Family' :
                               caregiver.role === 'healthcare' ? 'Healthcare' :
                               'Team'}
                            </Text>
                          </View>
                        </View>
                        <Text style={styles.memberStatus}>
                          {getPermissionLabel(caregiver.permissions)} • {caregiver.lastActive ?
                            getRelativeTime(caregiver.lastActive) :
                            'Invited'}
                        </Text>
                      </View>
                    </TouchableOpacity>

                    {/* Quick Contact Buttons */}
                    <View style={styles.memberActions}>
                      <TouchableOpacity
                        style={styles.actionButton}
                        onPress={() => {
                          const phone = (caregiver as any).phone || '';
                          if (phone) Linking.openURL(`tel:${phone}`);
                        }}
                        activeOpacity={0.7}
                      >
                        <Text style={styles.actionButtonIcon}>📞</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.actionButton}
                        onPress={() => {
                          const phone = (caregiver as any).phone || '';
                          if (phone) Linking.openURL(`sms:${phone}`);
                        }}
                        activeOpacity={0.7}
                      >
                        <Text style={styles.actionButtonIcon}>💬</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })}
            </GlassCard>
          </View>

          {/* Recent Activity - Collapsible with Filters */}
          {activities.length > 0 && (
            <View style={styles.section}>
              <TouchableOpacity
                style={styles.collapsibleHeader}
                onPress={() => setActivityExpanded(!activityExpanded)}
                activeOpacity={0.7}
              >
                <Text style={styles.sectionTitle}>RECENT ACTIVITY</Text>
                <Text style={styles.collapseIcon}>{activityExpanded ? '▼' : '▶'}</Text>
              </TouchableOpacity>

              {activityExpanded && (
                <GlassCard>
                  {/* Activity Filters */}
                  <View style={styles.filterRow}>
                    {(['all', 'shares', 'logs'] as const).map((filter) => (
                      <TouchableOpacity
                        key={filter}
                        style={[
                          styles.filterButton,
                          activityFilter === filter && styles.filterButtonActive,
                        ]}
                        onPress={() => setActivityFilter(filter)}
                        activeOpacity={0.7}
                      >
                        <Text style={[
                          styles.filterButtonText,
                          activityFilter === filter && styles.filterButtonTextActive,
                        ]}>
                          {filter.charAt(0).toUpperCase() + filter.slice(1)}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  {/* Activity List */}
                  {filteredActivities.slice(0, 4).map((activity, i) => (
                    <View
                      key={activity.id || i}
                      style={[
                        styles.activityRow,
                        i < Math.min(3, filteredActivities.length - 1) && styles.activityRowBorder,
                      ]}
                    >
                      <Text style={styles.activityIcon}>
                        {getActivityIcon(activity)}
                      </Text>
                      <View style={styles.activityContent}>
                        <Text style={styles.activityText}>
                          <Text style={styles.activityWho}>{activity.performedBy || 'Someone'}</Text>
                          {' '}{getActivityDescription(activity)}
                        </Text>
                        <Text style={styles.activityTime}>
                          {activity.timestamp ? getRelativeTime(activity.timestamp) : 'Recently'}
                        </Text>
                      </View>
                    </View>
                  ))}

                  {filteredActivities.length === 0 && (
                    <View style={styles.emptyActivity}>
                      <Text style={styles.emptyActivityText}>No {activityFilter} activity yet</Text>
                    </View>
                  )}

                  <TouchableOpacity
                    style={styles.viewAllButton}
                    onPress={() => router.push('/family-activity')}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.viewAllText}>View all activity →</Text>
                  </TouchableOpacity>
                </GlassCard>
              )}
            </View>
          )}

          {/* Quick Actions */}
          <View style={styles.section}>
            <SectionHeader title="Quick Actions" />

            <View style={styles.quickShareRow}>
              {quickShareActions.map((action, i) => (
                <TouchableOpacity
                  key={i}
                  style={styles.quickShareButton}
                  onPress={action.onPress}
                  activeOpacity={0.7}
                >
                  <GlassCard style={styles.quickShareCard} padding={14}>
                    <Text style={styles.quickShareIcon}>{action.icon}</Text>
                    <Text style={styles.quickShareLabel}>{action.label}</Text>
                    {action.badge && (
                      <View style={styles.sosBadge}>
                        <Text style={styles.sosBadgeText}>{action.badge}</Text>
                      </View>
                    )}
                  </GlassCard>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Privacy Notice */}
          <GlassCard style={styles.privacyCard}>
            <View style={styles.privacyContent}>
              <Text style={styles.privacyIcon}>🔒</Text>
              <View style={styles.privacyText}>
                <Text style={styles.privacyTitle}>Privacy Protected</Text>
                <Text style={styles.privacyDescription}>
                  All data stays on device. You control what's shared.
                </Text>
              </View>
            </View>
          </GlassCard>

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
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
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

  // Header - Standardized per HEADER_IMPLEMENTATION_SUMMARY
  header: {
    paddingTop: 60, // Clears iPhone notch
    paddingHorizontal: 0, // Uses scrollContent padding
    paddingBottom: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  headerTextContainer: {
    flex: 1,
  },
  headerDate: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.5)',
    fontWeight: '500',
    letterSpacing: 0.5,
    marginBottom: 8,
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
  notifButton: {
    width: 44,
    height: 44,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 16,
    position: 'relative',
  },
  notifIcon: {
    fontSize: 24,
  },
  notifBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    backgroundColor: '#EF4444',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },

  // Support Message
  supportCard: {
    backgroundColor: `${Colors.accent}08`,
    borderColor: `${Colors.accent}20`,
    marginBottom: Spacing.xxl,
  },
  supportText: {
    ...Typography.body,
    color: Colors.textSecondary,
    textAlign: 'center',
    fontStyle: 'italic',
  },

  // Circle Visualization
  circleContainer: {
    alignItems: 'center',      // Center horizontally
    justifyContent: 'center',  // Center vertically
    marginBottom: Spacing.xxl,
    height: 200,
    position: 'relative',
    width: '100%',             // Take full width so centering works
    alignSelf: 'center',       // Center the whole component horizontally
  },
  centerAvatar: {
    position: 'absolute',
    left: '50%',
    top: '50%',
    transform: [{ translateX: -35 }, { translateY: -35 }],  // Proper centering
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: `${Colors.accent}20`,
    borderWidth: 2,
    borderColor: Colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerAvatarText: {
    fontSize: 28,
  },
  centerAvatarLabel: {
    ...Typography.captionSmall,
    color: Colors.textSecondary,
    position: 'absolute',
    bottom: -20,
  },
  orbitAvatarWrapper: {
    position: 'absolute',
    alignItems: 'center',
    transform: [{ translateX: -27 }, { translateY: -30 }],
  },
  orbitAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  orbitAvatarText: {
    fontSize: 22,
  },
  orbitName: {
    fontSize: 10,
    color: Colors.textMuted,
    fontWeight: '600',
    marginTop: 4,
    textAlign: 'center',
  },

  // Sections
  section: {
    marginBottom: Spacing.xxl,
  },

  // Members
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 12,
  },
  memberRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.glassBorder,
  },
  memberMainContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  memberAvatarContainer: {
    position: 'relative',
  },
  memberAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  memberAvatarText: {
    fontSize: 20,
    textAlign: 'center',
    includeFontPadding: false,
  },
  memberContent: {
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
    fontWeight: '500',
    color: Colors.textPrimary,
  },
  memberRoleBadge: {
    backgroundColor: `${Colors.accent}20`,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  memberRole: {
    fontSize: 10,
    color: Colors.accent,
    fontWeight: '500',
  },
  memberStatus: {
    fontSize: 11,
    color: Colors.textMuted,
  },
  memberIndicator: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: Colors.cardBackground || '#1a1f2e',
  },
  memberChevron: {
    fontSize: 16,
    color: Colors.textMuted,
  },
  memberActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: `${Colors.accent}15`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionButtonIcon: {
    fontSize: 14,
  },

  // Collapsible Section Header
  collapsibleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 11,
    letterSpacing: 2,
    color: Colors.textMuted,
    fontWeight: '600',
  },
  collapseIcon: {
    fontSize: 12,
    color: Colors.textMuted,
  },

  // Activity Filters
  filterRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  filterButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  filterButtonActive: {
    backgroundColor: `${Colors.accent}20`,
    borderWidth: 1,
    borderColor: Colors.accent,
  },
  filterButtonText: {
    fontSize: 11,
    color: Colors.textMuted,
    fontWeight: '500',
  },
  filterButtonTextActive: {
    color: Colors.accent,
  },

  // Activity
  activityRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 10,
    gap: 10,
  },
  activityRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.glassBorder,
  },
  activityIcon: {
    fontSize: 16,
  },
  activityContent: {
    flex: 1,
  },
  activityText: {
    fontSize: 12,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  activityWho: {
    color: Colors.accent,
    fontWeight: '600',
  },
  activityTime: {
    fontSize: 10,
    color: Colors.textMuted,
    marginTop: 2,
  },
  emptyActivity: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  emptyActivityText: {
    fontSize: 12,
    color: Colors.textMuted,
  },
  viewAllButton: {
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: Colors.glassBorder,
  },
  viewAllText: {
    fontSize: 12,
    color: Colors.accent,
    fontWeight: '500',
  },

  // Quick Actions
  quickShareRow: {
    flexDirection: 'row',
    gap: 10,
  },
  quickShareButton: {
    flex: 1,
  },
  quickShareCard: {
    alignItems: 'center',
    position: 'relative',
  },
  quickShareIcon: {
    fontSize: 24,
    marginBottom: 6,
  },
  quickShareLabel: {
    fontSize: 11,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  sosBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: Colors.red,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  sosBadgeText: {
    fontSize: 9,
    fontWeight: '600',
    color: '#fff',
  },

  // Privacy
  privacyCard: {
    backgroundColor: `${Colors.accent}05`,
    borderColor: `${Colors.accent}15`,
  },
  privacyContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  privacyIcon: {
    fontSize: 20,
  },
  privacyText: {
    flex: 1,
  },
  privacyTitle: {
    ...Typography.bodySmall,
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  privacyDescription: {
    ...Typography.captionSmall,
    color: Colors.textMuted,
  },
});
