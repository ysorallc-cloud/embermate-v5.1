// ============================================================================
// FAMILY PAGE - Aurora Redesign
// Care circle collaboration view
// ============================================================================

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { Colors, Spacing, Typography, BorderRadius } from '../_theme/theme-tokens';
import {
  getCaregivers,
  getCareActivities,
  CaregiverProfile,
  CareActivity,
} from '../../utils/collaborativeCare';

// Aurora Components
import { AuroraBackground } from '../../components/aurora/AuroraBackground';
import { GlassCard } from '../../components/aurora/GlassCard';
import { SectionHeader } from '../../components/aurora/SectionHeader';

export default function FamilyScreen() {
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
    const team = await getCaregivers();
    setCaregivers(team);

    const acts = await getCareActivities(100);
    setActivities(acts);
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, []);

  const activeCount = caregivers.filter(c =>
    c.lastActive && new Date(c.lastActive).getTime() > Date.now() - 24 * 60 * 60 * 1000
  ).length + 1; // +1 for current user

  const hasOtherCaregivers = caregivers.length > 0;

  // Quick share actions
  const quickShareActions = [
    {
      icon: '✉️',
      label: 'Send Update',
      onPress: () => router.push('/family-sharing'),
    },
    {
      icon: '📋',
      label: 'Share Report',
      onPress: () => router.push('/care-summary-export'),
    },
    {
      icon: '📞',
      label: 'Request Help',
      onPress: () => router.push('/emergency'),
    },
  ];

  return (
    <View style={styles.container}>
      <AuroraBackground variant="family" />

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
            <View>
              <Text style={styles.headerLabel}>CARE CIRCLE</Text>
              <Text style={styles.headerTitle}>Caring together</Text>
            </View>
            <TouchableOpacity
              style={styles.notifButton}
              onPress={() => router.push('/notification-settings')}
            >
              <Text style={styles.notifIcon}>🔔</Text>
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

          {/* Care Circle Visual - Simplified connection */}
          <View style={styles.circleContainer}>
            {/* Center - Care Recipient */}
            <View style={styles.centerAvatar}>
              <Text style={styles.centerAvatarText}>👵</Text>
              <Text style={styles.centerAvatarLabel}>Mom</Text>
            </View>

            {/* Orbiting avatars - just visual representation */}
            {[
              { icon: '👤', color: Colors.accent, angle: 0 },
              { icon: '👤', color: Colors.purple, angle: 120 },
              { icon: '👤', color: Colors.rose, angle: 240 },
            ].slice(0, Math.min(3, caregivers.length + 1)).map((member, i) => {
              const angle = ((member.angle - 90) * Math.PI) / 180;
              const radius = 60;
              const x = Math.cos(angle) * radius;
              const y = Math.sin(angle) * radius;

              return (
                <View
                  key={i}
                  style={[
                    styles.orbitAvatar,
                    {
                      left: `${50 + (x / 80) * 30}%`,
                      top: `${50 + (y / 80) * 30}%`,
                      backgroundColor: `${member.color}20`,
                      borderColor: `${member.color}50`,
                    },
                  ]}
                >
                  <Text style={styles.orbitAvatarText}>{member.icon}</Text>
                </View>
              );
            })}
          </View>

          {/* Care Team */}
          <View style={styles.section}>
            <SectionHeader
              title="Care Team"
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
                <View style={[
                  styles.memberAvatar,
                  {
                    backgroundColor: `${Colors.accent}20`,
                    borderColor: `${Colors.accent}50`,
                  },
                ]}>
                  <Text style={styles.memberAvatarText}>👤</Text>
                </View>
                <View style={styles.memberContent}>
                  <View style={styles.memberNameRow}>
                    <Text style={styles.memberName}>You (Amber)</Text>
                    <Text style={styles.memberRole}>Primary</Text>
                  </View>
                  <Text style={styles.memberStatus}>Active now ⭐</Text>
                </View>
                <View style={[
                  styles.memberIndicator,
                  { backgroundColor: Colors.green },
                ]} />
              </TouchableOpacity>

              {/* Other Caregivers */}
              {caregivers.slice(0, 3).map((caregiver, i) => (
                <TouchableOpacity
                  key={caregiver.id}
                  style={[
                    styles.memberRow,
                    i < Math.min(2, caregivers.length - 1) && styles.memberRowBorder,
                  ]}
                  onPress={() => router.push('/caregiver-management')}
                  activeOpacity={0.7}
                >
                  <View style={[
                    styles.memberAvatar,
                    {
                      backgroundColor: caregiver.avatarColor || Colors.purpleLight,
                      borderColor: `${caregiver.avatarColor || Colors.purple}50`,
                    },
                  ]}>
                    <Text style={styles.memberAvatarText}>👤</Text>
                  </View>
                  <View style={styles.memberContent}>
                    <View style={styles.memberNameRow}>
                      <Text style={styles.memberName}>{caregiver.name}</Text>
                      <Text style={styles.memberRole}>
                        {caregiver.role === 'family' ? 'Family' :
                         caregiver.role === 'healthcare' ? 'Healthcare' :
                         'Team'}
                      </Text>
                    </View>
                    <Text style={styles.memberStatus}>
                      {caregiver.lastActive ?
                        `Last active: ${getRelativeTime(caregiver.lastActive)}` :
                        'Invited'}
                    </Text>
                  </View>
                  <View style={[
                    styles.memberIndicator,
                    {
                      backgroundColor: caregiver.lastActive &&
                        new Date(caregiver.lastActive).getTime() > Date.now() - 24 * 60 * 60 * 1000
                        ? Colors.green : Colors.textMuted
                    },
                  ]} />
                </TouchableOpacity>
              ))}
            </GlassCard>
          </View>

          {/* Recent Activity */}
          {activities.length > 0 && (
            <View style={styles.section}>
              <SectionHeader title="Recent Activity" />

              <GlassCard>
                {activities.slice(0, 3).map((activity, i) => (
                  <View
                    key={i}
                    style={[
                      styles.activityRow,
                      i < Math.min(2, activities.length - 1) && styles.activityRowBorder,
                    ]}
                  >
                    <Text style={styles.activityIcon}>
                      {activity.type === 'log' ? '📝' :
                       activity.type === 'update' ? '✉️' :
                       activity.type === 'checkin' ? '✓' : '📊'}
                    </Text>
                    <View style={styles.activityContent}>
                      <Text style={styles.activityText}>
                        <Text style={styles.activityWho}>{activity.caregiverName || 'Someone'}</Text>
                        {' '}{activity.description || 'updated'}
                      </Text>
                      <Text style={styles.activityTime}>
                        {activity.timestamp ? getRelativeTime(activity.timestamp) : 'Recently'}
                      </Text>
                    </View>
                  </View>
                ))}

                <TouchableOpacity
                  style={styles.viewAllButton}
                  onPress={() => router.push('/family-activity')}
                  activeOpacity={0.7}
                >
                  <Text style={styles.viewAllText}>View all activity →</Text>
                </TouchableOpacity>
              </GlassCard>
            </View>
          )}

          {/* Quick Share */}
          <View style={styles.section}>
            <SectionHeader title="Quick Share" />

            <View style={styles.quickShareRow}>
              {quickShareActions.map((action, i) => (
                <TouchableOpacity
                  key={i}
                  style={styles.quickShareButton}
                  onPress={action.onPress}
                  activeOpacity={0.7}
                >
                  <GlassCard style={styles.quickShareCard} padding={16}>
                    <Text style={styles.quickShareIcon}>{action.icon}</Text>
                    <Text style={styles.quickShareLabel}>{action.label}</Text>
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

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.xxl,
  },
  headerLabel: {
    ...Typography.caption,
    color: Colors.textMuted,
    marginBottom: Spacing.xs,
  },
  headerTitle: {
    ...Typography.displayMedium,
    color: Colors.textPrimary,
  },
  notifButton: {
    padding: Spacing.sm,
  },
  notifIcon: {
    fontSize: 20,
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
    alignItems: 'center',
    marginBottom: Spacing.xxl,
    height: 180,
    position: 'relative',
  },
  centerAvatar: {
    position: 'absolute',
    left: '50%',
    top: '50%',
    transform: [{ translateX: -35 }, { translateY: -40 }],
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
  orbitAvatar: {
    position: 'absolute',
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    transform: [{ translateX: -22 }, { translateY: -22 }],
  },
  orbitAvatarText: {
    fontSize: 20,
  },

  // Sections
  section: {
    marginBottom: Spacing.xxl,
  },

  // Members
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.lg,
    gap: Spacing.lg,
  },
  memberRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  memberAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  memberAvatarText: {
    fontSize: 24,
  },
  memberContent: {
    flex: 1,
  },
  memberNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: 2,
  },
  memberName: {
    ...Typography.body,
    color: Colors.textPrimary,
  },
  memberRole: {
    ...Typography.labelSmall,
    color: Colors.textMuted,
  },
  memberStatus: {
    ...Typography.labelSmall,
    color: Colors.textMuted,
  },
  memberIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 4,
  },

  // Activity
  activityRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: Spacing.md,
    gap: Spacing.md,
  },
  activityRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  activityIcon: {
    fontSize: 16,
  },
  activityContent: {
    flex: 1,
  },
  activityText: {
    ...Typography.bodySmall,
    color: Colors.textPrimary,
  },
  activityWho: {
    color: Colors.accent,
  },
  activityTime: {
    ...Typography.captionSmall,
    color: Colors.textMuted,
    marginTop: 2,
  },
  viewAllButton: {
    paddingVertical: Spacing.md,
    alignItems: 'center',
    marginTop: Spacing.sm,
  },
  viewAllText: {
    ...Typography.labelSmall,
    color: Colors.accent,
  },

  // Quick Share
  quickShareRow: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  quickShareButton: {
    flex: 1,
  },
  quickShareCard: {
    alignItems: 'center',
  },
  quickShareIcon: {
    fontSize: 24,
    marginBottom: Spacing.sm,
  },
  quickShareLabel: {
    ...Typography.captionSmall,
    color: Colors.textSecondary,
    textAlign: 'center',
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
