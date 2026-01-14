// ============================================================================
// FAMILY TAB - Mindful Redesign
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
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { Colors, Spacing, BorderRadius } from '../_theme/theme-tokens';
import {
  getCaregivers,
  getCareActivities,
  CaregiverProfile,
  CareActivity,
} from '../../utils/collaborativeCare';
import CareCircleIcon from '../../components/CareCircleIcon';

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

  const activeCount = caregivers.filter(c => 
    c.lastActive && new Date(c.lastActive).getTime() > Date.now() - 24 * 60 * 60 * 1000
  ).length + 1; // +1 for current user

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <LinearGradient
        colors={[Colors.backgroundGradientStart, Colors.backgroundGradientEnd]}
        style={styles.gradient}
      >
        {/* Tinted Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Care Circle 🧶</Text>
            <Text style={styles.dateSubtitle}>{activeCount} active members</Text>
          </View>
          <TouchableOpacity style={styles.coffeeButton} onPress={() => router.push('/coffee')}>
            <Text style={styles.coffeeIcon}>☕</Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.contentContainer}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={Colors.accent}
            />
          }
        >
          {/* Support Message */}
          <View style={styles.supportMessage}>
            <Text style={styles.supportText}>
              Caregiving is a shared journey. Your team is here with you.
            </Text>
          </View>

          {/* Primary Caregiver */}
          <Text style={styles.sectionLabel}>PRIMARY CAREGIVER</Text>
          <TouchableOpacity 
            style={[styles.memberCard, styles.memberCardPrimary]}
            onPress={() => router.push('/settings')}
          >
            <View style={[styles.memberAvatar, styles.avatarPrimary]}>
              <Text style={styles.avatarIcon}>👤</Text>
            </View>
            <View style={styles.memberInfo}>
              <Text style={styles.memberName}>You (Amber)</Text>
              <Text style={styles.memberRole}>Primary Caregiver</Text>
              <Text style={styles.memberStatus}>Active now</Text>
            </View>
            <Text style={styles.memberBadge}>⭐</Text>
          </TouchableOpacity>

          {/* Quick Actions */}
          <Text style={styles.sectionLabel}>QUICK ACTIONS</Text>
          <View style={styles.quickActions}>
            <TouchableOpacity 
              style={styles.quickAction}
              onPress={() => router.push('/family-sharing')}
            >
              <Text style={styles.quickActionIcon}>✉️</Text>
              <Text style={styles.quickActionLabel}>Send Update</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.quickAction}
              onPress={() => router.push('/care-summary-export')}
            >
              <Text style={styles.quickActionIcon}>📋</Text>
              <Text style={styles.quickActionLabel}>Share Report</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.quickAction}
              onPress={() => router.push('/emergency')}
            >
              <Text style={styles.quickActionIcon}>📞</Text>
              <Text style={styles.quickActionLabel}>Request Help</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.quickAction}
              onPress={() => router.push('/appointments')}
            >
              <Text style={styles.quickActionIcon}>📅</Text>
              <Text style={styles.quickActionLabel}>Schedule Visit</Text>
            </TouchableOpacity>
          </View>

          {/* Care Team */}
          {caregivers.length > 0 && (
            <>
              <Text style={styles.sectionLabel}>CARE TEAM</Text>
              {caregivers.slice(0, 3).map((caregiver) => (
                <TouchableOpacity 
                  key={caregiver.id}
                  style={styles.memberCard}
                  onPress={() => router.push('/caregiver-management')}
                >
                  <View style={[styles.memberAvatar, { backgroundColor: caregiver.avatarColor || 'rgba(187, 134, 252, 0.2)' }]}>
                    <Text style={styles.avatarIcon}>👤</Text>
                  </View>
                  <View style={styles.memberInfo}>
                    <Text style={styles.memberName}>{caregiver.name}</Text>
                    <Text style={styles.memberRole}>
                      {caregiver.role === 'family' ? 'Family Member' : 
                       caregiver.role === 'healthcare' ? 'Healthcare Provider' : 
                       'Care Team Member'}
                    </Text>
                    <Text style={styles.memberStatus}>
                      {caregiver.lastActive ? 
                        `Last active: ${getRelativeTime(caregiver.lastActive)}` : 
                        'Invited'}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </>
          )}

          {/* Invite Section */}
          <View style={styles.inviteCard}>
            <Text style={styles.inviteLabel}>GROW YOUR CIRCLE</Text>
            <Text style={styles.inviteText}>
              Invite family members or healthcare providers to help coordinate Mom's care.
            </Text>
            <TouchableOpacity 
              style={styles.inviteButton}
              onPress={() => router.push('/caregiver-management')}
            >
              <Text style={styles.inviteButtonText}>+ Invite Member</Text>
            </TouchableOpacity>
          </View>

          {/* Activity */}
          {activities.length > 0 && (
            <>
              <Text style={styles.sectionLabel}>RECENT ACTIVITY</Text>
              <TouchableOpacity 
                style={styles.activityToggle}
                onPress={() => router.push('/family-activity')}
              >
                <Text style={styles.activityIcon}>📊</Text>
                <View style={styles.activityInfo}>
                  <Text style={styles.activityTitle}>Team Activity</Text>
                  <Text style={styles.activityCount}>{activities.length} updates this week</Text>
                </View>
                <Text style={styles.activityChevron}>›</Text>
              </TouchableOpacity>
            </>
          )}

          <View style={{ height: 40 }} />
        </ScrollView>
      </LinearGradient>
    </SafeAreaView>
  );
}

function getRelativeTime(timestamp: string): string {
  const now = new Date();
  const time = new Date(timestamp);
  const diffMs = now.getTime() - time.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffHours / 24);
  
  if (diffHours < 1) return 'Just now';
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  return time.toLocaleDateString();
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  gradient: {
    flex: 1,
  },

  // Tinted Header
  header: {
    backgroundColor: 'rgba(139, 168, 136, 0.03)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(139, 168, 136, 0.15)',
    paddingTop: 56,
    paddingBottom: 20,
    paddingHorizontal: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  greeting: {
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
    fontSize: 24,
    color: Colors.textPrimary,
  },
  dateSubtitle: {
    fontSize: 14,
    color: Colors.textMuted,
    marginTop: 6,
  },
  coffeeButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(139, 90, 43, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(139, 90, 43, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  coffeeIcon: {
    fontSize: 22,
  },

  // Content
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: Platform.OS === 'web' ? 32 : 24,
    paddingBottom: Platform.OS === 'web' ? 120 : 100,
  },
  
  // Section Labels
  sectionLabel: {
    fontSize: 10,
    letterSpacing: 2,
    color: Colors.textMuted,
    marginBottom: 12,
    marginTop: 4,
    fontWeight: '800',
  },
  
  // Support Message
  supportMessage: {
    backgroundColor: 'rgba(79, 209, 197, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(79, 209, 197, 0.2)',
    borderRadius: 16,
    padding: 18,
    marginBottom: 24,
    alignItems: 'center',
  },
  supportText: {
    fontSize: 15,
    lineHeight: 24,
    color: Colors.textSecondary,
    fontStyle: 'italic',
    textAlign: 'center',
  },
  
  // Member Cards
  memberCard: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  memberCardPrimary: {
    backgroundColor: 'rgba(79, 209, 197, 0.12)',
    borderColor: 'rgba(79, 209, 197, 0.25)',
  },
  memberAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarPrimary: {
    backgroundColor: 'rgba(90, 154, 154, 0.3)',
  },
  avatarIcon: {
    fontSize: 24,
  },
  memberInfo: {
    flex: 1,
  },
  memberName: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.textSecondary,
    marginBottom: 3,
  },
  memberRole: {
    fontSize: 12,
    color: Colors.textMuted,
    marginBottom: 2,
  },
  memberStatus: {
    fontSize: 11,
    color: Colors.accent,
  },
  memberBadge: {
    fontSize: 18,
  },
  
  // Quick Actions
  quickActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
  },
  quickAction: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 14,
    padding: 18,
    width: '48%',
    alignItems: 'center',
    gap: 10,
  },
  quickActionIcon: {
    fontSize: 32,
  },
  quickActionLabel: {
    fontSize: 13,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  
  // Invite Card
  inviteCard: {
    backgroundColor: 'rgba(232, 155, 95, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(232, 155, 95, 0.15)',
    borderRadius: 14,
    padding: 18,
    marginBottom: 20,
  },
  inviteLabel: {
    fontSize: 10,
    letterSpacing: 2,
    color: 'rgba(232, 155, 95, 0.8)',
    marginBottom: 10,
    fontWeight: '800',
  },
  inviteText: {
    fontSize: 14,
    lineHeight: 21,
    color: Colors.textSecondary,
    marginBottom: 12,
  },
  inviteButton: {
    backgroundColor: 'rgba(232, 155, 95, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(232, 155, 95, 0.3)',
    padding: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    alignItems: 'center',
  },
  inviteButtonText: {
    fontSize: 13,
    color: '#e89b5f',
    fontWeight: '500',
  },
  
  // Activity
  activityToggle: {
    backgroundColor: Colors.surfaceAlt,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    padding: 14,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  activityIcon: {
    fontSize: 20,
  },
  activityInfo: {
    flex: 1,
  },
  activityTitle: {
    fontSize: 15,
    fontWeight: '500',
    color: Colors.textSecondary,
    marginBottom: 2,
  },
  activityCount: {
    fontSize: 12,
    color: Colors.textMuted,
  },
  activityChevron: {
    fontSize: 16,
    color: Colors.textMuted,
  },
});
