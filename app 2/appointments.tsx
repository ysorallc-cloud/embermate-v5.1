// ============================================================================
// APPOINTMENTS SCREEN - Unified Comprehensive View
// Single view combining: Mini calendar, Timeline, Quick stats
// ============================================================================

import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform, RefreshControl, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Spacing, BorderRadius } from './_theme/theme-tokens';
import { getUpcomingAppointments, Appointment, formatAppointmentTime, completeAppointment, cancelAppointment } from '../utils/appointmentStorage';
import { hapticSuccess } from '../utils/hapticFeedback';

export default function AppointmentsScreen() {
  const router = useRouter();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(new Date());

  useFocusEffect(useCallback(() => { loadData(); }, []));

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, []);

  const loadData = async () => {
    try {
      const appts = await getUpcomingAppointments();
      setAppointments(appts);
    } catch (error) {
      console.log('Error loading appointments:', error);
    }
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  };

  const formatTime = (time: string) => {
    if (!time) return '';
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours, 10);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    return `${hour % 12 || 12}:${minutes} ${ampm}`;
  };

  const getDaysUntil = (dateStr: string) => {
    if (!dateStr) return 0;
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const apptDate = new Date(dateStr);
    apptDate.setHours(0, 0, 0, 0);
    return Math.ceil((apptDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  };

  const getRelativeTimeLabel = (dateStr: string) => {
    const days = getDaysUntil(dateStr);
    if (days === 0) return 'Today';
    if (days === 1) return 'Tomorrow';
    if (days === -1) return 'Yesterday';
    if (days < 0) return `${Math.abs(days)} days ago`;
    if (days <= 7) return `In ${days} days`;
    if (days <= 14) return 'Next 2 weeks';
    if (days <= 30) return 'This month';
    return 'Future';
  };
  
  const handleComplete = async (appt: Appointment) => {
    try {
      await completeAppointment(appt.id);
      await hapticSuccess();
      await loadData();
    } catch (error) {
      Alert.alert('Error', 'Failed to mark appointment as completed');
    }
  };

  const handleCancel = async (appt: Appointment) => {
    Alert.alert(
      'Cancel Appointment',
      `Are you sure you want to cancel ${appt.specialty}?`,
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: async () => {
            try {
              await cancelAppointment(appt.id);
              await loadData();
            } catch (error) {
              Alert.alert('Error', 'Failed to cancel appointment');
            }
          }
        }
      ]
    );
  };

  // Get upcoming appointments grouped by timing
  const upcomingAppts = appointments.filter(a => getDaysUntil(a.date) >= 0).slice(0, 5);
  const nextAppt = upcomingAppts[0];
  const thisWeek = appointments.filter(a => {
    const days = getDaysUntil(a.date);
    return days >= 0 && days <= 7;
  });
  const thisMonth = appointments.filter(a => {
    const days = getDaysUntil(a.date);
    return days >= 0 && days <= 30;
  });

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <LinearGradient colors={[Colors.backgroundGradientStart, Colors.backgroundGradientEnd]} style={styles.gradient}>
        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.accent} />}>
          
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
              <Text style={styles.backIcon}>←</Text>
            </TouchableOpacity>
            <Text style={styles.headerLabel}>APPOINTMENTS</Text>
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => router.push('/appointment-form' as any)}
            >
              <Text style={styles.addIcon}>+</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.title}>Care Calendar</Text>

          {/* Quick Stats Bar */}
          <View style={styles.statsBar}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{thisWeek.length}</Text>
              <Text style={styles.statLabel}>This Week</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{thisMonth.length}</Text>
              <Text style={styles.statLabel}>This Month</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{appointments.length}</Text>
              <Text style={styles.statLabel}>Total</Text>
            </View>
          </View>

          {/* Next Appointment Highlight */}
          {nextAppt && (
            <View style={styles.nextApptCard}>
              <View style={styles.nextApptHeader}>
                <Text style={styles.nextApptLabel}>NEXT APPOINTMENT</Text>
                <Text style={styles.nextApptRelative}>{getRelativeTimeLabel(nextAppt.date)}</Text>
              </View>
              
              <View style={styles.nextApptContent}>
                <View style={styles.nextApptDate}>
                  <Text style={styles.nextApptDay}>{new Date(nextAppt.date).getDate()}</Text>
                  <Text style={styles.nextApptMonth}>
                    {new Date(nextAppt.date).toLocaleDateString('en-US', { month: 'short' }).toUpperCase()}
                  </Text>
                </View>
                
                <View style={styles.nextApptDetails}>
                  <Text style={styles.nextApptSpecialty}>{nextAppt.specialty}</Text>
                  <Text style={styles.nextApptDoctor}>{nextAppt.provider}</Text>
                  <Text style={styles.nextApptLocation}>📍 {nextAppt.location}</Text>
                  <Text style={styles.nextApptTime}>🕐 {formatTime(nextAppt.time)}</Text>
                </View>
              </View>

              <View style={styles.nextApptActions}>
                <TouchableOpacity 
                  style={styles.completeButton}
                  onPress={() => handleComplete(nextAppt)}
                >
                  <Text style={styles.completeButtonText}>✓ Mark Completed</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.cancelButton}
                  onPress={() => handleCancel(nextAppt)}
                >
                  <Text style={styles.cancelButtonText}>✕ Cancel</Text>
                </TouchableOpacity>
              </View>

              {nextAppt.notes && (
                <View style={styles.nextApptNotes}>
                  <Text style={styles.nextApptNotesText}>{nextAppt.notes}</Text>
                </View>
              )}
              
              <TouchableOpacity 
                style={styles.viewBriefButton}
                onPress={() => router.push('/care-brief' as any)}
              >
                <Text style={styles.viewBriefText}>View Care Brief →</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Timeline Section */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>UPCOMING TIMELINE</Text>
          </View>

          {appointments.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>📅</Text>
              <Text style={styles.emptyTitle}>No appointments scheduled</Text>
              <Text style={styles.emptySubtitle}>Tap + to add your first appointment</Text>
            </View>
          ) : (
            upcomingAppts.map((appt, index) => {
              const days = getDaysUntil(appt.date);
              
              return (
                <TouchableOpacity 
                  key={appt.id} 
                  style={styles.timelineCard}
                  onPress={() => {
                    Alert.alert(
                      appt.specialty,
                      `${appt.provider}\n${formatDate(appt.date)} at ${formatTime(appt.time)}\n${appt.location}${appt.notes ? `\n\n${appt.notes}` : ''}`,
                      [
                        { text: 'Cancel Appt', style: 'destructive', onPress: () => handleCancel(appt) },
                        { text: 'Mark Done', onPress: () => handleComplete(appt) },
                        { text: 'Close', style: 'cancel' }
                      ]
                    );
                  }}
                >
                  <View style={styles.timelineDot}>
                    <View style={[styles.timelineDotInner, index === 0 && styles.timelineDotActive]} />
                  </View>
                  
                  <View style={styles.timelineContent}>
                    <View style={styles.timelineHeader}>
                      <Text style={styles.timelineDate}>{formatDate(appt.date)}</Text>
                      <Text style={styles.timelineTime}>{formatTime(appt.time)}</Text>
                    </View>
                    
                    <Text style={styles.timelineSpecialty}>{appt.specialty}</Text>
                    <Text style={styles.timelineDoctor}>{appt.provider}</Text>
                    <Text style={styles.timelineLocation}>📍 {appt.location}</Text>
                    
                    {appt.notes && (
                      <Text style={styles.timelineNotes}>{appt.notes}</Text>
                    )}
                  </View>
                </TouchableOpacity>
              );
            })
          )}

          {appointments.length > 5 && (
            <Text style={styles.moreIndicator}>
              + {appointments.length - 5} more appointment{appointments.length - 5 !== 1 ? 's' : ''}
            </Text>
          )}
        </ScrollView>
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  gradient: { flex: 1 },
  scrollView: { flex: 1, paddingHorizontal: Spacing.xl },
  
  // HEADER
  header: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    paddingTop: Platform.OS === 'android' ? 20 : 0, 
    paddingBottom: Spacing.md 
  },
  backButton: { 
    width: 44, 
    height: 44, 
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    alignItems: 'center', 
    justifyContent: 'center',
  },
  backIcon: {
    fontSize: 24,
    color: Colors.textPrimary,
  },
  headerLabel: { fontSize: 11, color: Colors.textMuted, letterSpacing: 1, fontWeight: '600' },
  addButton: { 
    width: 44, 
    height: 44, 
    backgroundColor: Colors.accentLight,
    borderWidth: 1,
    borderColor: Colors.accentBorder,
    borderRadius: 12,
    alignItems: 'center', 
    justifyContent: 'center' 
  },
  addIcon: {
    fontSize: 28,
    color: Colors.accent,
    marginTop: -2,
  },
  title: { fontSize: 28, fontWeight: '300', color: Colors.textPrimary, marginBottom: Spacing.lg },
  
  // STATS BAR
  statsBar: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '300',
    color: Colors.accent,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 11,
    color: Colors.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statDivider: {
    width: 1,
    backgroundColor: Colors.border,
    marginHorizontal: Spacing.md,
  },
  
  // NEXT APPOINTMENT CARD
  nextApptCard: {
    backgroundColor: Colors.surface,
    borderWidth: 2,
    borderColor: Colors.accentBorder,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.xl,
  },
  nextApptHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  nextApptLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.accent,
    letterSpacing: 1,
  },
  nextApptRelative: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontStyle: 'italic',
  },
  nextApptContent: {
    flexDirection: 'row',
    gap: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  nextApptDate: {
    width: 60,
    height: 60,
    backgroundColor: Colors.accentLight,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nextApptDay: {
    fontSize: 24,
    fontWeight: '600',
    color: Colors.accent,
  },
  nextApptMonth: {
    fontSize: 11,
    color: Colors.accent,
    fontWeight: '600',
    marginTop: -2,
  },
  nextApptDetails: {
    flex: 1,
    gap: 4,
  },
  nextApptSpecialty: {
    fontSize: 18,
    fontWeight: '500',
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  nextApptDoctor: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  nextApptLocation: {
    fontSize: 13,
    color: Colors.textTertiary,
  },
  nextApptTime: {
    fontSize: 13,
    color: Colors.textTertiary,
  },
  nextApptActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  completeButton: {
    flex: 1,
    backgroundColor: 'rgba(74, 222, 128, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(74, 222, 128, 0.3)',
    borderRadius: BorderRadius.md,
    padding: Spacing.sm,
    alignItems: 'center',
  },
  completeButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4ADE80',
  },
  cancelButton: {
    flex: 1,
    backgroundColor: 'rgba(248, 113, 113, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(248, 113, 113, 0.3)',
    borderRadius: BorderRadius.md,
    padding: Spacing.sm,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#F87171',
  },
  nextApptNotes: {
    backgroundColor: 'rgba(232, 155, 95, 0.08)',
    borderRadius: BorderRadius.sm,
    padding: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  nextApptNotesText: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontStyle: 'italic',
  },
  viewBriefButton: {
    paddingVertical: Spacing.sm,
    alignItems: 'center',
  },
  viewBriefText: {
    fontSize: 13,
    color: Colors.accent,
    fontWeight: '500',
  },
  
  // SECTION HEADER
  sectionHeader: {
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textTertiary,
    letterSpacing: 1,
  },
  
  // TIMELINE
  timelineCard: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginBottom: Spacing.lg,
    paddingBottom: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  timelineDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.surface,
    borderWidth: 2,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  timelineDotInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: Colors.border,
  },
  timelineDotActive: {
    backgroundColor: Colors.accent,
  },
  timelineContent: {
    flex: 1,
  },
  timelineHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  timelineDate: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.accent,
  },
  timelineTime: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  timelineSpecialty: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  timelineDoctor: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 2,
  },
  timelineLocation: {
    fontSize: 13,
    color: Colors.textTertiary,
  },
  timelineNotes: {
    fontSize: 12,
    color: Colors.textMuted,
    fontStyle: 'italic',
    marginTop: 6,
  },
  
  // EMPTY STATE
  emptyState: {
    alignItems: 'center',
    paddingVertical: 80,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: Spacing.md,
  },
  emptyTitle: {
    fontSize: 18,
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
  },
  emptySubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  
  // MORE INDICATOR
  moreIndicator: {
    fontSize: 13,
    color: Colors.textMuted,
    textAlign: 'center',
    paddingVertical: Spacing.lg,
    fontStyle: 'italic',
  },
});
