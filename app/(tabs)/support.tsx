// ============================================================================
// CARE TEAM PAGE (formerly Support)
// People first. Quick actions at top. Compact expandable rows.
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
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { navigate } from '../../lib/navigate';
import { useFocusEffect } from '@react-navigation/native';
import { useDataListener } from '../../lib/events';
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
import { ScreenHeader } from '../../components/ScreenHeader';

// Support Components
import { HandoffPrompt } from '../../components/support/HandoffPrompt';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export default function SupportScreen() {
  const router = useRouter();
  const [caregivers, setCaregivers] = useState<CaregiverProfile[]>([]);
  const [activities, setActivities] = useState<CareActivity[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [usingSample, setUsingSample] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  useDataListener(useCallback(() => { loadData(); }, []));

  const loadData = async () => {
    let team = await getCaregivers();
    let isSample = false;
    if (team.length === 0) {
      team = getSampleCaregivers() as CaregiverProfile[];
      isSample = true;
    }
    setCaregivers(team);
    setUsingSample(isSample);

    let acts = await getCareActivities(100);
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

  const getRoleLabel = (caregiver: CaregiverProfile): string => {
    const relationship = (caregiver as any).relationship;
    if (relationship) return relationship;
    switch (caregiver.role) {
      case 'family': return 'Family member';
      case 'healthcare': return 'Healthcare provider';
      case 'professional': return 'Professional caregiver';
      case 'friend': return 'Friend';
      default: return 'Care team';
    }
  };

  const getActivityIcon = (activity: CareActivity): string => {
    switch (activity.type) {
      case 'vital_logged': return '\uD83E\uDE7A';
      case 'symptom_logged': return '\uD83D\uDCDD';
      case 'medication_taken': return '\uD83D\uDC8A';
      case 'medication_missed': return '\u26A0\uFE0F';
      case 'note_added': return '\uD83D\uDCDD';
      case 'appointment_scheduled': return '\uD83D\uDCC5';
      case 'appointment_completed': return '\u2705';
      case 'caregiver_joined': return '\uD83D\uDC65';
      default: return '\uD83D\uDD18';
    }
  };

  const getActivityDescription = (activity: CareActivity): string => {
    switch (activity.type) {
      case 'vital_logged':
        return `updated ${activity.details?.vitalType || 'vitals'}`;
      case 'symptom_logged': return 'logged symptoms';
      case 'medication_taken': return 'logged medication';
      case 'medication_missed': return 'noted missed medication';
      case 'note_added':
        if (activity.details?.action?.includes('shared')) {
          return `${activity.details.action}${activity.details.recipient ? ` with ${activity.details.recipient}` : ''}`;
        }
        return activity.details?.action || 'added a note';
      case 'appointment_scheduled': return 'scheduled appointment';
      case 'appointment_completed': return 'completed appointment';
      case 'caregiver_joined': return 'joined the care team';
      default: return 'updated';
    }
  };

  const handleEmergencyAlert = () => {
    Alert.alert(
      'Alert Care Team?',
      'This will immediately notify all care team members that you need help.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Alert Everyone Now',
          style: 'destructive',
          onPress: () => router.push('/emergency'),
        },
      ]
    );
  };

  const toggleExpand = (id: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedId(expandedId === id ? null : id);
  };

  const getTrustedPermissions = (caregiver: CaregiverProfile): string[] => {
    const permissions: string[] = [];
    if (caregiver.permissions?.canMarkMedications) permissions.push('Meds');
    if (caregiver.permissions?.canEdit) permissions.push('Edit');
    if (caregiver.permissions?.canAddNotes) permissions.push('Notes');
    return permissions;
  };

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
          <ScreenHeader title="Team" subtitle="Your care team" />

          {/* Privacy Notice */}
          <View style={styles.privacyNotice}>
            <View style={styles.privacyAccent} />
            <View style={styles.privacyContent}>
              <Text style={styles.privacyIcon}>{'\uD83D\uDD12'}</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.privacyTitle}>Nothing is shared without you</Text>
                <Text style={styles.privacyText}>
                  Your care data stays on this device. You control what gets shared and with whom.
                </Text>
              </View>
            </View>
          </View>

          {/* Sample Data Banner */}
          {usingSample && (
            <View style={styles.sampleBanner}>
              <Text style={styles.sampleBannerText}>
                Showing sample team members. Invite real caregivers via Family Sharing.
              </Text>
            </View>
          )}

          {/* Quick Actions Row */}
          <View style={styles.quickActions}>
            <TouchableOpacity
              style={styles.quickActionPrimary}
              onPress={() => navigate('/care-summary-export')}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="Share Care Brief"
            >
              <Text style={styles.quickActionIcon}>{'\uD83D\uDCCB'}</Text>
              <Text style={styles.quickActionLabelPrimary}>Share Brief</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.quickAction}
              onPress={() => router.push('/family-sharing')}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="Add a person to your care team"
            >
              <Text style={styles.quickActionIcon}>{'\u2795'}</Text>
              <Text style={styles.quickActionLabel}>Add Person</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.quickActionEmergency}
              onPress={handleEmergencyAlert}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="Emergency alert"
            >
              <Text style={styles.quickActionIcon}>{'\uD83C\uDD98'}</Text>
              <Text style={styles.quickActionLabelEmergency}>Emergency</Text>
            </TouchableOpacity>
          </View>

          {/* Handoff Prompt (only shows when items need attention) */}
          <HandoffPrompt />

          {/* Care Team — compact expandable rows */}
          <View style={styles.section}>
            <Text style={styles.sectionHeader}>YOUR TEAM ({caregivers.length})</Text>

            <View style={styles.teamContainer}>
              {caregivers.slice(0, 6).map((caregiver) => {
                const isExpanded = expandedId === caregiver.id;
                const lastActive = getLastActiveTime(caregiver.id, caregiver.name);
                const trustedPermissions = getTrustedPermissions(caregiver);
                const isEmergencyContact = (caregiver as any).emergencyContact;
                const avatarColor = caregiver.avatarColor || Colors.accent;

                return (
                  <View key={caregiver.id} style={styles.memberWrapper}>
                    {/* Compact row */}
                    <TouchableOpacity
                      style={[
                        styles.memberRow,
                        isExpanded && { borderBottomLeftRadius: 0, borderBottomRightRadius: 0, borderBottomWidth: 0 },
                      ]}
                      onPress={() => toggleExpand(caregiver.id)}
                      activeOpacity={0.7}
                      accessibilityRole="button"
                      accessibilityLabel={`${caregiver.name}, ${getRoleLabel(caregiver)}. Tap to ${isExpanded ? 'collapse' : 'expand'}`}
                    >
                      <View style={[styles.memberAvatar, { backgroundColor: `${avatarColor}20` }]}>
                        <Text style={styles.memberAvatarText}>
                          {caregiver.name.charAt(0).toUpperCase()}
                        </Text>
                      </View>

                      <View style={styles.memberInfo}>
                        <View style={styles.memberNameRow}>
                          <Text style={styles.memberName}>{caregiver.name}</Text>
                          {isEmergencyContact && <Text style={styles.emergencyBadge}>{'\u26A0\uFE0F'}</Text>}
                        </View>
                        <Text style={styles.memberMeta}>
                          {getRoleLabel(caregiver)}
                          {' \u00B7 '}
                          {lastActive ? (
                            <Text style={styles.memberActiveTime}>{lastActive}</Text>
                          ) : (
                            <Text style={styles.memberInactive}>Not yet active</Text>
                          )}
                        </Text>
                      </View>

                      {/* Quick call button */}
                      <TouchableOpacity
                        style={styles.callButton}
                        onPress={(e) => {
                          e.stopPropagation();
                          const phone = (caregiver as any).phone || '';
                          if (phone) Linking.openURL(`tel:${phone}`);
                        }}
                        activeOpacity={0.7}
                        accessibilityRole="button"
                        accessibilityLabel={`Call ${caregiver.name}`}
                      >
                        <Text style={styles.callButtonIcon}>{'\uD83D\uDCDE'}</Text>
                      </TouchableOpacity>

                      <Text style={[styles.expandArrow, isExpanded && styles.expandArrowOpen]}>
                        {'\u203A'}
                      </Text>
                    </TouchableOpacity>

                    {/* Expanded detail */}
                    {isExpanded && (
                      <View style={styles.expandedPanel}>
                        <View style={styles.expandedDivider} />

                        {/* Permissions */}
                        {trustedPermissions.length > 0 && (
                          <>
                            <Text style={styles.expandedLabel}>CAN ACCESS</Text>
                            <View style={styles.permissionRow}>
                              {trustedPermissions.map((perm) => (
                                <View key={perm} style={styles.permissionTag}>
                                  <Text style={styles.permissionTagText}>{perm}</Text>
                                </View>
                              ))}
                              {isEmergencyContact && (
                                <View style={styles.emergencyTag}>
                                  <Text style={styles.emergencyTagText}>Emergency Contact</Text>
                                </View>
                              )}
                            </View>
                          </>
                        )}

                        {/* Action buttons */}
                        <View style={styles.expandedActions}>
                          <TouchableOpacity
                            style={styles.expandedAction}
                            onPress={() => {
                              const phone = (caregiver as any).phone || '';
                              if (phone) Linking.openURL(`sms:${phone}`);
                            }}
                            activeOpacity={0.7}
                          >
                            <Text style={styles.expandedActionText}>{'\uD83D\uDCAC'} Message</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={styles.expandedAction}
                            onPress={() => navigate('/care-summary-export')}
                            activeOpacity={0.7}
                          >
                            <Text style={styles.expandedActionText}>{'\uD83D\uDCCB'} Send Brief</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={styles.expandedActionSettings}
                            onPress={() => router.push(`/caregiver-management?id=${caregiver.id}`)}
                            activeOpacity={0.7}
                            accessibilityLabel={`Manage ${caregiver.name}'s settings`}
                          >
                            <Text style={styles.expandedActionText}>{'\u2699\uFE0F'}</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    )}
                  </View>
                );
              })}

              {/* Manage team link */}
              <TouchableOpacity
                style={styles.manageTeamLink}
                onPress={() => router.push('/family-sharing')}
                activeOpacity={0.7}
                accessibilityRole="link"
                accessibilityLabel="Manage access and roles"
              >
                <Text style={styles.manageTeamText}>Manage access & roles {'\u2192'}</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Recent Activity — inline rows */}
          {activities.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionHeader}>RECENT</Text>
              <View style={styles.activityContainer}>
                {activities.slice(0, 4).map((activity, i) => (
                  <View
                    key={activity.id || i}
                    style={[
                      styles.activityRow,
                      i < Math.min(activities.length - 1, 3) && styles.activityRowBorder,
                    ]}
                  >
                    <Text style={styles.activityIcon}>{getActivityIcon(activity)}</Text>
                    <View style={styles.activityContent}>
                      <Text style={styles.activityText}>
                        <Text style={styles.activityWho}>{activity.performedBy}</Text>
                        {' '}{getActivityDescription(activity)}
                      </Text>
                    </View>
                    <Text style={styles.activityTime}>
                      {getRelativeTime(activity.timestamp)}
                    </Text>
                  </View>
                ))}
              </View>

              <TouchableOpacity
                style={styles.viewAllLink}
                onPress={() => router.push('/family-activity')}
                activeOpacity={0.7}
                accessibilityRole="link"
                accessibilityLabel="View all team activity"
              >
                <Text style={styles.viewAllText}>View all activity {'\u2192'}</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Settings & Help */}
          <View style={styles.section}>
            <Text style={styles.sectionHeader}>SETTINGS & HELP</Text>
            <View style={styles.settingsContainer}>
              <TouchableOpacity
                style={styles.settingsRow}
                onPress={() => navigate('/settings')}
                activeOpacity={0.7}
                accessibilityRole="link"
              >
                <Text style={styles.settingsIcon}>{'\u2699\uFE0F'}</Text>
                <Text style={styles.settingsLabel}>App Settings</Text>
                <Text style={styles.settingsChevron}>{'\u203A'}</Text>
              </TouchableOpacity>
              <View style={styles.settingsRowBorder} />
              <TouchableOpacity
                style={styles.settingsRow}
                onPress={() => navigate('/data-privacy-settings')}
                activeOpacity={0.7}
                accessibilityRole="link"
              >
                <Text style={styles.settingsIcon}>{'\uD83D\uDD12'}</Text>
                <Text style={styles.settingsLabel}>Privacy & Data</Text>
                <Text style={styles.settingsChevron}>{'\u203A'}</Text>
              </TouchableOpacity>
              <View style={styles.settingsRowBorder} />
              <TouchableOpacity
                style={styles.settingsRow}
                onPress={() => navigate('/guide-hub')}
                activeOpacity={0.7}
                accessibilityRole="link"
              >
                <Text style={styles.settingsIcon}>{'\uD83D\uDCDA'}</Text>
                <Text style={styles.settingsLabel}>Learn & Explore</Text>
                <Text style={styles.settingsChevron}>{'\u203A'}</Text>
              </TouchableOpacity>
              <View style={styles.settingsRowBorder} />
              <TouchableOpacity
                style={styles.settingsRow}
                onPress={() => navigate('/guide-hub')}
                activeOpacity={0.7}
                accessibilityRole="link"
              >
                <Text style={styles.settingsIcon}>{'\u2753'}</Text>
                <Text style={styles.settingsLabel}>Help & Support</Text>
                <Text style={styles.settingsChevron}>{'\u203A'}</Text>
              </TouchableOpacity>
              <View style={styles.settingsRowBorder} />
              <TouchableOpacity
                style={styles.settingsRow}
                onPress={() => router.push('/coffee')}
                activeOpacity={0.7}
                accessibilityRole="link"
              >
                <Text style={styles.settingsIcon}>{'\u2615'}</Text>
                <Text style={styles.settingsLabel}>Take a Break</Text>
                <Text style={styles.settingsChevron}>{'\u203A'}</Text>
              </TouchableOpacity>
            </View>
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
  if (diffHours === 1) return '1h ago';
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return 'Yesterday';
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

  // Header uses ScreenHeader component

  // Privacy Notice
  sampleBanner: {
    backgroundColor: Colors.amberFaint,
    borderWidth: 1,
    borderColor: Colors.amberBorder,
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
  },
  sampleBannerText: {
    fontSize: 13,
    color: Colors.amber,
    textAlign: 'center',
  },
  privacyNotice: {
    backgroundColor: Colors.glassFaint,
    borderWidth: 1,
    borderColor: Colors.glassActive,
    borderRadius: 14,
    overflow: 'hidden',
    marginBottom: 16,
    position: 'relative',
  },
  privacyAccent: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 3,
    backgroundColor: Colors.accent,
  },
  privacyContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 14,
    paddingLeft: 16,
    gap: 10,
  },
  privacyIcon: {
    fontSize: 18,
    marginTop: 1,
  },
  privacyTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: 3,
  },
  privacyText: {
    fontSize: 12,
    color: Colors.textSecondary,
    lineHeight: 18,
  },

  // Quick Actions
  quickActions: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  quickActionPrimary: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: Colors.accentFaint,
    borderWidth: 1,
    borderColor: Colors.accentBorder,
  },
  quickAction: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: Colors.glassFaint,
    borderWidth: 1,
    borderColor: Colors.glassActive,
  },
  quickActionEmergency: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: Colors.redFaint,
    borderWidth: 1,
    borderColor: Colors.redBorder,
  },
  quickActionIcon: {
    fontSize: 18,
    marginBottom: 2,
  },
  quickActionLabelPrimary: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.accent,
  },
  quickActionLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.textBright,
  },
  quickActionLabelEmergency: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.redBright,
  },

  // Sections
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.textHalf,
    letterSpacing: 1,
    textTransform: 'uppercase',
    paddingHorizontal: 4,
    marginBottom: Spacing.sm,
  },

  // Team — compact expandable rows
  teamContainer: {
    gap: 8,
    marginTop: 4,
  },
  memberWrapper: {
    borderRadius: 14,
    overflow: 'hidden',
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 14,
    backgroundColor: Colors.glassFaint,
    borderWidth: 1,
    borderColor: Colors.glassActive,
  },
  memberAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  memberAvatarText: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  memberInfo: {
    flex: 1,
    minWidth: 0,
  },
  memberNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  memberName: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  emergencyBadge: {
    fontSize: 10,
  },
  memberMeta: {
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 2,
  },
  memberActiveTime: {
    color: Colors.sage,
  },
  memberInactive: {
    color: Colors.textPlaceholder,
  },
  callButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: Colors.accentFaint,
    borderWidth: 1,
    borderColor: Colors.accentBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  callButtonIcon: {
    fontSize: 14,
  },
  expandArrow: {
    fontSize: 18,
    color: Colors.textMuted,
    marginLeft: 2,
  },
  expandArrowOpen: {
    transform: [{ rotate: '90deg' }],
  },

  // Expanded panel
  expandedPanel: {
    backgroundColor: Colors.glassFaint,
    borderWidth: 1,
    borderTopWidth: 0,
    borderColor: Colors.glassActive,
    borderBottomLeftRadius: 14,
    borderBottomRightRadius: 14,
    paddingHorizontal: 14,
    paddingBottom: 14,
  },
  expandedDivider: {
    height: 1,
    backgroundColor: Colors.glassHover,
    marginBottom: 12,
  },
  expandedLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: Colors.textMuted,
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  permissionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 14,
  },
  permissionTag: {
    backgroundColor: Colors.accentFaint,
    borderWidth: 1,
    borderColor: Colors.accentBorder,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  permissionTagText: {
    fontSize: 11,
    color: Colors.accent,
  },
  emergencyTag: {
    backgroundColor: Colors.redFaint,
    borderWidth: 1,
    borderColor: Colors.redBorder,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  emergencyTagText: {
    fontSize: 11,
    color: Colors.redBright,
  },
  expandedActions: {
    flexDirection: 'row',
    gap: 8,
  },
  expandedAction: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: Colors.glassFaint,
    borderWidth: 1,
    borderColor: Colors.glassActive,
  },
  expandedActionSettings: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: Colors.glassFaint,
    borderWidth: 1,
    borderColor: Colors.glassActive,
  },
  expandedActionText: {
    fontSize: 12,
    fontWeight: '500',
    color: Colors.textBright,
  },

  manageTeamLink: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  manageTeamText: {
    fontSize: 12,
    color: Colors.sageStrong,
    fontWeight: '500',
  },

  // Activity — inline rows
  activityContainer: {
    backgroundColor: Colors.glassFaint,
    borderWidth: 1,
    borderColor: Colors.glassActive,
    borderRadius: 12,
    overflow: 'hidden',
  },
  activityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  activityRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.glassHover,
  },
  activityIcon: {
    fontSize: 14,
  },
  activityContent: {
    flex: 1,
  },
  activityText: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  activityWho: {
    fontWeight: '500',
    color: Colors.textBright,
  },
  activityTime: {
    fontSize: 10,
    color: Colors.textMuted,
  },
  viewAllLink: {
    paddingVertical: 10,
    alignItems: 'center',
  },
  viewAllText: {
    fontSize: 12,
    color: Colors.sageSoft,
  },

  // Settings & Help
  settingsContainer: {
    backgroundColor: Colors.glassFaint,
    borderWidth: 1,
    borderColor: Colors.glassActive,
    borderRadius: 14,
    overflow: 'hidden',
  },
  settingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 13,
    paddingHorizontal: 14,
    gap: 10,
  },
  settingsRowBorder: {
    height: 1,
    backgroundColor: Colors.glassHover,
    marginHorizontal: 14,
  },
  settingsIcon: {
    fontSize: 16,
    width: 24,
    textAlign: 'center',
  },
  settingsLabel: {
    fontSize: 14,
    color: Colors.textBright,
    flex: 1,
  },
  settingsChevron: {
    fontSize: 18,
    color: Colors.textMuted,
  },
});
