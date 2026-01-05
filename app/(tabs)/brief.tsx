// ============================================================================
// COMMAND CENTER - Mindful Redesign (was Care Hub)
// Intelligence-focused view with health insights
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
import { getMedications, Medication } from '../../utils/medicationStorage';
import { getUpcomingAppointments, Appointment } from '../../utils/appointmentStorage';
import { getCaregivers } from '../../utils/collaborativeCare';

export default function CommandCenterScreen() {
  const router = useRouter();
  const [medications, setMedications] = useState<Medication[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [caregivers, setCaregivers] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  useFocusEffect(useCallback(() => {
    loadData();
  }, []));

  const loadData = async () => {
    try {
      const meds = await getMedications();
      setMedications(meds.filter(m => m.active));
      
      const appts = await getUpcomingAppointments();
      setAppointments(appts);
      
      const team = await getCaregivers();
      setCaregivers(team);
    } catch (e) {
      console.log('Error loading data:', e);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, []);

  const completedCount = medications.filter(m => m?.taken).length;
  const totalCount = medications.length;
  const adherencePercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
  const trendPercent = 23; // Mock - would come from correlation detector
  const streakDays = 7; // Mock - would come from tracking

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <LinearGradient
        colors={[Colors.backgroundGradientStart, Colors.backgroundGradientEnd]}
        style={styles.gradient}
      >
        {/* Hero Section */}
        <View style={styles.hero}>
          <Text style={styles.heroIcon}>🎯</Text>
          <Text style={styles.heroLabel}>YOUR CARE INTELLIGENCE</Text>
          <Text style={styles.heroMessage}>
            Understanding{'\n'}Mom's patterns.
          </Text>
          <Text style={styles.heroDetail}>Last 7 days</Text>
        </View>

        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.contentContainer}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={Colors.accent}
            />
          }
        >
          {/* Health Snapshot */}
          <View style={styles.snapshotCard}>
            <Text style={styles.snapshotLabel}>HEALTH SNAPSHOT</Text>
            <View style={styles.statsRow}>
              <View style={styles.stat}>
                <Text style={styles.statValue}>{adherencePercent}%</Text>
                <Text style={styles.statLabel}>Adherence</Text>
              </View>
              <View style={styles.stat}>
                <Text style={[styles.statValue, styles.statValueImproving]}>+{trendPercent}%</Text>
                <Text style={styles.statLabel}>Trend</Text>
              </View>
              <View style={styles.stat}>
                <Text style={styles.statValue}>{streakDays}d</Text>
                <Text style={styles.statLabel}>Streak</Text>
              </View>
            </View>
            <Text style={styles.snapshotInsight}>
              Mom's doing well this week. Morning routines are especially consistent.
            </Text>
          </View>

          {/* AI Recommendations */}
          <Text style={styles.sectionLabel}>GENTLE SUGGESTIONS</Text>
          <View style={styles.aiCard}>
            <Text style={styles.aiLabel}>AI INSIGHTS</Text>
            
            <View style={styles.aiItem}>
              <Text style={styles.aiIcon}>⚡</Text>
              <Text style={styles.aiText}>
                Taking Metformin at 10am instead of 8am may reduce side effects by 40%
              </Text>
            </View>
            
            <View style={[styles.aiItem, { borderBottomWidth: 0 }]}>
              <Text style={styles.aiIcon}>⏰</Text>
              <Text style={styles.aiText}>
                Saturday mornings often missed. A gentle 9am reminder could help
              </Text>
            </View>
          </View>

          {/* Caregiver Wellbeing */}
          <View style={styles.caregiverHealth}>
            <Text style={styles.healthLabel}>YOUR WELLBEING</Text>
            <View style={styles.healthGrid}>
              <View style={styles.healthMetric}>
                <Text style={styles.healthIcon}>✓</Text>
                <Text style={styles.healthText}>Burnout risk: Low</Text>
              </View>
              <View style={styles.healthMetric}>
                <Text style={styles.healthIcon}>⚠️</Text>
                <Text style={styles.healthText}>Last break: 3 days</Text>
              </View>
              <View style={styles.healthMetric}>
                <Text style={styles.healthIcon}>😊</Text>
                <Text style={styles.healthText}>Mood: Steady</Text>
              </View>
              <View style={styles.healthMetric}>
                <Text style={styles.healthIcon}>💪</Text>
                <Text style={styles.healthText}>Energy: Moderate</Text>
              </View>
            </View>
          </View>

          {/* Collapsible Sections */}
          <Text style={styles.sectionLabel}>EXPLORE FURTHER</Text>
          
          <TouchableOpacity 
            style={styles.collapsible}
            onPress={() => router.push('/medications')}
          >
            <Text style={styles.collapsibleIcon}>💊</Text>
            <View style={styles.collapsibleInfo}>
              <Text style={styles.collapsibleTitle}>Medications</Text>
              <Text style={styles.collapsibleSubtitle}>{medications.length} active prescriptions</Text>
            </View>
            <Text style={styles.collapsibleChevron}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.collapsible}
            onPress={() => router.push('/appointments')}
          >
            <Text style={styles.collapsibleIcon}>📅</Text>
            <View style={styles.collapsibleInfo}>
              <Text style={styles.collapsibleTitle}>Appointments</Text>
              <Text style={styles.collapsibleSubtitle}>{appointments.length} upcoming this week</Text>
            </View>
            <Text style={styles.collapsibleChevron}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.collapsible}
            onPress={() => router.push('/vitals-log')}
          >
            <Text style={styles.collapsibleIcon}>❤️</Text>
            <View style={styles.collapsibleInfo}>
              <Text style={styles.collapsibleTitle}>Vitals History</Text>
              <Text style={styles.collapsibleSubtitle}>BP: 120/80 • Today 8:00 AM</Text>
            </View>
            <Text style={styles.collapsibleChevron}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.collapsible}
            onPress={() => router.push('/timeline')}
          >
            <Text style={styles.collapsibleIcon}>📊</Text>
            <View style={styles.collapsibleInfo}>
              <Text style={styles.collapsibleTitle}>Patterns & Trends</Text>
              <Text style={styles.collapsibleSubtitle}>Detailed insights & correlations</Text>
            </View>
            <Text style={styles.collapsibleChevron}>›</Text>
          </TouchableOpacity>

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
  
  // Hero Section
  hero: {
    alignItems: 'center',
    paddingTop: Platform.OS === 'web' ? 80 : 50,
    paddingBottom: Platform.OS === 'web' ? 45 : 30,
    paddingHorizontal: Platform.OS === 'web' ? 32 : 24,
  },
  heroIcon: {
    fontSize: Platform.OS === 'web' ? 140 : 100,
    marginBottom: Platform.OS === 'web' ? 28 : 20,
    opacity: 0.9,
  },
  heroLabel: {
    fontSize: Platform.OS === 'web' ? 13 : 11,
    letterSpacing: 3,
    color: Colors.accent,
    marginBottom: Platform.OS === 'web' ? 16 : 12,
    fontWeight: '800',
  },
  heroMessage: {
    fontSize: Platform.OS === 'web' ? 30 : 26,
    fontWeight: '300',
    lineHeight: Platform.OS === 'web' ? 42 : 36,
    color: Colors.textPrimary,
    textAlign: 'center',
    marginBottom: Platform.OS === 'web' ? 8 : 6,
  },
  heroDetail: {
    fontSize: Platform.OS === 'web' ? 17 : 15,
    color: Colors.textTertiary,
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
  
  // Health Snapshot
  snapshotCard: {
    backgroundColor: 'rgba(79, 209, 197, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(79, 209, 197, 0.2)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
  },
  snapshotLabel: {
    fontSize: 10,
    letterSpacing: 2,
    color: Colors.accent,
    marginBottom: 14,
    fontWeight: '800',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 12,
  },
  stat: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 32,
    fontWeight: '600',
    color: Colors.accent,
    marginBottom: 4,
  },
  statValueImproving: {
    color: '#4ade80',
  },
  statLabel: {
    fontSize: 11,
    color: Colors.textTertiary,
    textTransform: 'uppercase',
  },
  snapshotInsight: {
    fontSize: 12,
    color: Colors.textSecondary,
    lineHeight: 18,
    marginTop: 12,
    fontStyle: 'italic',
  },
  
  // AI Card
  aiCard: {
    backgroundColor: 'rgba(187, 134, 252, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(187, 134, 252, 0.15)',
    borderRadius: 14,
    padding: 18,
    marginBottom: 20,
  },
  aiLabel: {
    fontSize: 10,
    letterSpacing: 2,
    color: '#bb86fc',
    marginBottom: 12,
    fontWeight: '800',
  },
  aiItem: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  aiIcon: {
    fontSize: 16,
  },
  aiText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 20,
    color: Colors.textSecondary,
  },
  
  // Caregiver Health
  caregiverHealth: {
    backgroundColor: 'rgba(232, 155, 95, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(232, 155, 95, 0.15)',
    borderRadius: 14,
    padding: 16,
    marginBottom: 20,
  },
  healthLabel: {
    fontSize: 10,
    letterSpacing: 2,
    color: 'rgba(232, 155, 95, 0.8)',
    marginBottom: 10,
    fontWeight: '800',
  },
  healthGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  healthMetric: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    width: '48%',
  },
  healthIcon: {
    fontSize: 16,
  },
  healthText: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  
  // Collapsible
  collapsible: {
    backgroundColor: Colors.surfaceAlt,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    padding: 14,
    paddingHorizontal: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  collapsibleIcon: {
    fontSize: 20,
  },
  collapsibleInfo: {
    flex: 1,
  },
  collapsibleTitle: {
    fontSize: 15,
    fontWeight: '500',
    color: Colors.textSecondary,
    marginBottom: 2,
  },
  collapsibleSubtitle: {
    fontSize: 12,
    color: Colors.textMuted,
  },
  collapsibleChevron: {
    fontSize: 16,
    color: Colors.textMuted,
  },
});
