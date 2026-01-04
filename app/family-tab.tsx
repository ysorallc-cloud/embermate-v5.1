// ============================================================================
// FAMILY TAB - Consolidated View
// Shows caregivers with inline recent activity
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
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { Colors, Spacing, BorderRadius } from './_theme/theme-tokens';
import PageHeader from '../components/PageHeader';
import {
  getCaregivers,
  getCareActivities,
  CaregiverProfile,
  CareActivity,
} from '../utils/collaborativeCare';

export default function FamilyTabScreen() {
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

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const getActivitiesForCaregiver = (caregiverId: string) => {
    return activities
      .filter(a => a.performedById === caregiverId)
      .slice(0, 3);
  };

  const getActivityIcon = (type: CareActivity['type']): string => {
    switch (type) {
      case 'medication_taken': return '💊';
      case 'medication_missed': return '⚠️';
      case 'appointment_scheduled': return '📅';
      case 'appointment_completed': return '✅';
      case 'note_added': return '📝';
      case 'vital_logged': return '❤️';
      case 'symptom_logged': return '🤕';
      case 'photo_added': return '📷';
      default: return '📋';
    }
  };

  const getTimeAgo = (timestamp: string): string => {
    const now = new Date();
    const then = new Date(timestamp);
    const diffMs = now.getTime() - then.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'now';
    if (diffMins < 60) return `${diffMins}m`;
    if (diffHours < 24) return `${diffHours}h`;
    return `${diffDays}d`;
  };

  const isActive = (caregiver: CaregiverProfile): boolean => {
    if (!caregiver.lastActive) return false;
    const twoHoursAgo = new Date().getTime() - 2 * 60 * 60 * 1000;
    return new Date(caregiver.lastActive).getTime() > twoHoursAgo;
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <LinearGradient
        colors={[Colors.backgroundGradientStart, Colors.backgroundGradientEnd]}
        style={styles.gradient}
      >
        <PageHeader 
          emoji="👥"
          label="Collaborative Care"
          title="Family"
        />

        <ScrollView
          style={styles.content}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={Colors.accent}
            />
          }
        >
          {/* Invite CTA */}
          <TouchableOpacity
            style={styles.inviteCta}
            onPress={() => router.push('/family-sharing')}
            activeOpacity={0.8}
          >
            <Text style={styles.inviteText}>Invite Family Member</Text>
            <Text style={styles.inviteIcon}>+</Text>
          </TouchableOpacity>

          {/* Caregiver Cards with Inline Activity */}
          {caregivers.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>👥</Text>
              <Text style={styles.emptyText}>No caregivers yet</Text>
              <Text style={styles.emptySubtext}>
                Tap above to invite family members
              </Text>
            </View>
          ) : (
            caregivers.map(caregiver => {
              const caregiverActivities = getActivitiesForCaregiver(caregiver.id);
              const active = isActive(caregiver);

              return (
                <TouchableOpacity
                  key={caregiver.id}
                  style={styles.personCard}
                  onPress={() => router.push(`/caregiver-management?id=${caregiver.id}`)}
                  activeOpacity={0.7}
                >
                  {/* Person Header */}
                  <View style={styles.personTop}>
                    <View 
                      style={[
                        styles.avatarLarge, 
                        { backgroundColor: caregiver.avatarColor }
                      ]}
                    >
                      <Text style={styles.avatarText}>
                        {caregiver.name.charAt(0).toUpperCase()}
                      </Text>
                      {active && <View style={styles.presence} />}
                    </View>

                    <View style={styles.personInfo}>
                      <Text style={styles.personName}>{caregiver.name}</Text>
                      <Text style={styles.personStatus}>
                        {caregiver.role === 'primary' ? 'Primary • ' : ''}
                        {active ? 'Active now' : caregiver.lastActive 
                          ? `${getTimeAgo(caregiver.lastActive)} ago`
                          : 'Never active'
                        }
                      </Text>
                    </View>

                    {caregiver.role === 'primary' ? (
                      <Text style={styles.starIcon}>⭐</Text>
                    ) : (
                      <Text style={styles.chevron}>›</Text>
                    )}
                  </View>

                  {/* Inline Activity */}
                  {caregiverActivities.length > 0 && (
                    <View style={styles.activityMini}>
                      {caregiverActivities.map((activity, index) => (
                        <View key={activity.id} style={styles.activityRow}>
                          <Text style={styles.activityIcon}>
                            {getActivityIcon(activity.type)}
                          </Text>
                          <Text style={styles.activityText} numberOfLines={1}>
                            {activity.details?.medicationName || 
                             activity.details?.preview ||
                             activity.type.replace(/_/g, ' ')}
                          </Text>
                          <Text style={styles.activityTime}>
                            {getTimeAgo(activity.timestamp)}
                          </Text>
                        </View>
                      ))}
                    </View>
                  )}
                </TouchableOpacity>
              );
            })
          )}

          <View style={{ height: 100 }} />
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
  inviteCta: {
    backgroundColor: Colors.accent,
    borderRadius: 16,
    padding: 20,
    marginBottom: 28,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  inviteText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.background,
  },
  inviteIcon: {
    fontSize: 24,
    color: Colors.background,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: Spacing.md,
    opacity: 0.3,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '500',
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
  },
  emptySubtext: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  personCard: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  personTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 12,
  },
  avatarLarge: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  avatarText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  presence: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#4ade80',
    borderWidth: 2,
    borderColor: Colors.background,
  },
  personInfo: {
    flex: 1,
  },
  personName: {
    fontSize: 17,
    fontWeight: '500',
    color: Colors.textPrimary,
    marginBottom: 3,
  },
  personStatus: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.5)',
  },
  starIcon: {
    fontSize: 18,
  },
  chevron: {
    fontSize: 20,
    color: 'rgba(255,255,255,0.2)',
  },
  activityMini: {
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.05)',
  },
  activityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 6,
  },
  activityIcon: {
    fontSize: 14,
  },
  activityText: {
    flex: 1,
    fontSize: 13,
    color: 'rgba(255,255,255,0.6)',
  },
  activityTime: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.4)',
  },
});
