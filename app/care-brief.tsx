// ============================================================================
// CARE BRIEF SCREEN
// Declarative handoff artifact (not an exploratory screen)
// Purpose: "If I had to explain this situation to someone else in 60 seconds"
// Answers: What's the status? What changed? What needs attention? What context matters?
// ============================================================================

import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform, RefreshControl, Share, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors, Spacing, BorderRadius } from '../theme/theme-tokens';
import { getMedications, getMedicationLogs, Medication } from '../utils/medicationStorage';
import { getUpcomingAppointments, Appointment } from '../utils/appointmentStorage';
import { getMedicalInfo, MedicalInfo } from '../utils/medicalInfo';
import { generateComprehensiveReport, ComprehensiveReport } from '../utils/reportGenerator';
import { generateAndSharePDF, ReportData, PatientInfo } from '../utils/pdfExport';

export default function CareBriefScreen() {
  const router = useRouter();
  const [patientName, setPatientName] = useState('Patient');
  const [medications, setMedications] = useState<Medication[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [snapshotTime, setSnapshotTime] = useState(new Date());
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [criticalContextExpanded, setCriticalContextExpanded] = useState(false);
  const [isFirstView, setIsFirstView] = useState(false);
  const [medicalInfo, setMedicalInfo] = useState<MedicalInfo | null>(null);

  useFocusEffect(useCallback(() => { 
    loadData(); 
    checkFirstView();
  }, []));

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, []);

  const loadData = async () => {
    try {
      const name = await AsyncStorage.getItem('@embermate_patient_name');
      if (name) setPatientName(name);
    } catch (e) {}
    try {
      const meds = await getMedications();
      setMedications(meds.filter(m => m.active));
    } catch (e) {}
    try {
      const appts = await getUpcomingAppointments();
      setAppointments(appts);
    } catch (e) {}
    try {
      const mi = await getMedicalInfo();
      setMedicalInfo(mi);
    } catch (e) {}
    setSnapshotTime(new Date());
  };

  const checkFirstView = async () => {
    try {
      const hasViewedBefore = await AsyncStorage.getItem('@care_brief_viewed');
      const firstView = !hasViewedBefore;
      setIsFirstView(firstView);
      
      // Auto-expand critical context on first view
      if (firstView) {
        setCriticalContextExpanded(true);
        await AsyncStorage.setItem('@care_brief_viewed', 'true');
      }
    } catch (e) {
      console.error('Error checking first view:', e);
    }
  };

  // Calculate exceptions and grouped risks
  const missedMeds = medications.filter(m => !m.taken);
  const takenCount = medications.filter(m => m.taken).length;
  const totalMeds = medications.length;
  const nextAppt = appointments[0];
  const upcomingAppts = appointments.filter(a => {
    const apptDate = new Date(a.date);
    const today = new Date();
    const daysUntil = Math.ceil((apptDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return daysUntil >= 0 && daysUntil <= 7;
  });

  // Group missed meds by time slot
  const groupMissedMedsByTime = () => {
    const groups = new Map<string, Medication[]>();
    missedMeds.forEach(med => {
      const hour = parseInt(med.time.split(':')[0]);
      let slot = '';
      if (hour >= 5 && hour < 12) slot = 'Morning';
      else if (hour >= 12 && hour < 17) slot = 'Afternoon';
      else if (hour >= 17 && hour < 21) slot = 'Evening';
      else slot = 'Bedtime';
      
      if (!groups.has(slot)) groups.set(slot, []);
      groups.get(slot)!.push(med);
    });
    return groups;
  };

  // Generate synthesized clinical sentence
  const generateClinicalSentence = () => {
    const parts = [];
    
    if (totalMeds === 0) {
      parts.push('No medications scheduled');
    } else if (takenCount === 0) {
      parts.push(`No medications logged today (${totalMeds} scheduled)`);
    } else if (missedMeds.length > 0) {
      const missedGroups = groupMissedMedsByTime();
      const groupNames = Array.from(missedGroups.keys());
      if (groupNames.length === 1) {
        parts.push(`${groupNames[0]} medication block missed`);
      } else {
        parts.push(`${missedMeds.length} doses not logged`);
      }
    } else {
      parts.push('All scheduled medications logged');
    }

    if (upcomingAppts.length > 0) {
      const nextUpcoming = upcomingAppts[0];
      const apptDate = new Date(nextUpcoming.date);
      const today = new Date();
      const daysUntil = Math.ceil((apptDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      
      if (daysUntil === 0) {
        parts.push(`${nextUpcoming.specialty} appointment today`);
      } else if (daysUntil <= 3) {
        parts.push(`${nextUpcoming.specialty} follow-up in ${daysUntil} day${daysUntil !== 1 ? 's' : ''}`);
      } else if (daysUntil <= 7) {
        parts.push(`${nextUpcoming.specialty} appointment within 7 days`);
      }
    }

    return parts.length > 0 ? parts.join('; ') + '.' : 'No current concerns.';
  };

  // Determine status badge
  const getStatusBadge = () => {
    if (totalMeds === 0) return { text: 'Stable', level: 'stable', icon: '✓' };
    if (missedMeds.length === 0) return { text: 'Stable', level: 'stable', icon: '✓' };
    if (missedMeds.length >= totalMeds * 0.5) {
      // Auto-expand critical context when concerning
      if (!criticalContextExpanded) {
        setCriticalContextExpanded(true);
      }
      return { text: 'Concerning', level: 'concerning', icon: '⚠' };
    }
    return { text: 'Needs Attention', level: 'attention', icon: '⚠' };
  };

  const statusBadge = getStatusBadge();

  const formatTime = (time: string) => {
    if (!time) return '';
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours, 10);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    return `${hour % 12 || 12}:${minutes} ${ampm}`;
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const today = new Date();
    const diffDays = Math.ceil((date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Tomorrow';
    if (diffDays < 7) return `In ${diffDays} days`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  // Only show exceptional notes that add handoff value
  const isExceptionalNote = (note: string) => {
    if (!note) return false;
    const lowerNote = note.toLowerCase();
    
    // Filter out routine instructions
    const routinePatterns = [
      'with food',
      'with breakfast',
      'with lunch',
      'with dinner',
      'before bed',
      'after meal',
      'in the morning',
      'in the evening',
      'take with water',
      'on empty stomach',
    ];
    
    // Check if note is just routine instruction
    const isRoutine = routinePatterns.some(pattern => 
      lowerNote === pattern || lowerNote === `take ${pattern}`
    );
    
    if (isRoutine) return false;
    
    // Show notes that indicate changes, issues, or important context
    const exceptionalPatterns = [
      'recently',
      'moved',
      'changed',
      'added',
      'held',
      'stopped',
      'increased',
      'decreased',
      'due to',
      'because',
      'temporary',
      'new',
      'this week',
      'this month',
      'side effect',
      'reaction',
      'monitor',
      'watch',
    ];
    
    return exceptionalPatterns.some(pattern => lowerNote.includes(pattern));
  };

  const handleShare = async () => {
    try {
      const briefText = `Care Brief for ${patientName}\nSnapshot: ${snapshotTime.toLocaleString()}\n\n${generateClinicalSentence()}`;
      await Share.share({ message: briefText });
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  const handleGenerateFullReport = async () => {
    try {
      setIsGeneratingReport(true);
      
      // Generate comprehensive report
      const report = await generateComprehensiveReport();
      
      // Build PDF-friendly report data with clear hierarchy
      const reportData: ReportData = {
        title: 'Care Handoff Report',
        period: 'Past 7-30 days',
        periodLabel: `Report generated ${new Date().toLocaleString('en-US', { 
          month: 'short', 
          day: 'numeric', 
          hour: 'numeric', 
          minute: '2-digit' 
        })}`,
        summary: report.clinicalSummary,
        details: [
          // HIGH-LEVEL SUMMARY FIRST
          { 
            label: '📊 Overall Status', 
            value: report.redFlags.length === 0 ? 'Stable' : 
                   report.redFlags.filter(f => f.severity === 'high').length > 0 ? 'Needs Attention' : 
                   'Watch'
          },
          { 
            label: '💊 Medication Adherence (7-day)', 
            value: `${report.medicationAdherence.overallAdherence}%` 
          },
          { 
            label: '🚩 Active Alerts', 
            value: `${report.redFlags.length} item${report.redFlags.length !== 1 ? 's' : ''}` 
          },
          
          // THEN KEY METRICS
          { 
            label: '❤️ Blood Pressure Range', 
            value: report.vitalsStability.trends.bloodPressure.range 
          },
          { 
            label: '📈 Heart Rate Range', 
            value: report.vitalsStability.trends.heartRate.range 
          },
          { 
            label: '🫁 O2 Saturation Range', 
            value: report.vitalsStability.trends.oxygenSaturation.range 
          },
          
          // THEN CONCERNS
          { 
            label: '⚠️ Primary Concerns', 
            value: report.concerns.length > 0 
              ? report.concerns.slice(0, 2).join('; ')
              : 'None'
          },
        ],
        notes: [
          '═══════════════════════════════════════',
          '📋 CLINICAL SUMMARY',
          '═══════════════════════════════════════',
          report.clinicalSummary,
          '',
          '═══════════════════════════════════════',
          '🎯 RECOMMENDED ACTIONS',
          '═══════════════════════════════════════',
          ...report.nextActions.map(a => `• ${a}`),
          '',
          ...(report.redFlags.length > 0 ? [
            '═══════════════════════════════════════',
            '⚠️ ALERTS REQUIRING ATTENTION',
            '═══════════════════════════════════════',
            ...report.redFlags.map(f => `[${f.severity.toUpperCase()}] ${f.message}`),
            '',
          ] : []),
          ...(report.medicationAdherence.medications.length > 0 ? [
            '═══════════════════════════════════════',
            '💊 MEDICATION DETAILS (7-day adherence)',
            '═══════════════════════════════════════',
            ...report.medicationAdherence.medications.map(m => 
              `${m.name} ${m.dosage}: ${m.adherence7Day}%${m.missedDoses > 0 ? ` (${m.missedDoses} missed)` : ''}`
            ),
            '',
          ] : []),
          ...(report.symptomProgression.commonSymptoms.length > 0 ? [
            '═══════════════════════════════════════',
            '📝 REPORTED SYMPTOMS',
            '═══════════════════════════════════════',
            ...report.symptomProgression.commonSymptoms.map(s => 
              `${s.name}: ${s.frequency}x this week (avg severity: ${s.avgSeverity}/10)`
            ),
            '',
          ] : []),
          '═══════════════════════════════════════',
          '📄 REPORT NOTES',
          '═══════════════════════════════════════',
          'This report summarizes tracked data and does not replace clinical judgment.',
          'Review with care team before making treatment decisions.',
        ].join('\n'),
        generatedAt: report.generatedAt,
      };
      
      const patient: PatientInfo = {
        name: patientName,
      };
      
      // Generate and share PDF
      const success = await generateAndSharePDF(reportData, patient);
      
      if (success) {
        Alert.alert('Success', 'Care report generated and ready to share');
      }
    } catch (error) {
      console.error('Report generation error:', error);
      Alert.alert('Error', 'Failed to generate report. Please try again.');
    } finally {
      setIsGeneratingReport(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <LinearGradient colors={[Colors.backgroundGradientStart, Colors.backgroundGradientEnd]} style={styles.gradient}>
        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.accent} />}>
          
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <TouchableOpacity onPress={() => router.back()} style={styles.backButton} accessibilityLabel="Go back" accessibilityRole="button">
                <Text style={styles.backIcon}>←</Text>
              </TouchableOpacity>
              <View>
                <Text style={styles.headerTitle}>Care Brief</Text>
                <Text style={styles.headerMeta}>{patientName} • {snapshotTime.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</Text>
              </View>
            </View>
            <View style={styles.headerActions}>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={handleGenerateFullReport}
                disabled={isGeneratingReport}
                accessibilityLabel={isGeneratingReport ? "Generating report" : "Export care report"}
                accessibilityRole="button"
              >
                <Ionicons 
                  name={isGeneratingReport ? "hourglass-outline" : "share-outline"} 
                  size={20} 
                  color={Colors.accent} 
                />
                <Text style={styles.actionButtonText}>
                  {isGeneratingReport ? 'Generating...' : 'Export'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Content Area */}
          <View style={styles.content}>

            {/* Snapshot Timestamp */}
            <View style={styles.snapshotTimestamp}>
              <Ionicons name="camera" size={14} color={Colors.textMuted} style={{ marginRight: 6 }} />
              <Text style={styles.snapshotText}>
                Snapshot from data through: {snapshotTime.toLocaleString('en-US', { 
                  month: 'short', 
                  day: 'numeric', 
                  year: 'numeric',
                  hour: 'numeric', 
                  minute: '2-digit' 
                })}
              </Text>
            </View>

            {/* Status Banner */}
            <View style={[
              styles.statusBanner, 
              statusBadge.level === 'stable' && styles.statusBannerStable,
              statusBadge.level === 'attention' && styles.statusBannerAttention,
              statusBadge.level === 'concerning' && styles.statusBannerConcerning,
            ]}>
              <Text style={styles.statusIcon}>{statusBadge.icon}</Text>
              <View style={styles.statusContent}>
                <Text style={styles.statusLabel}>CURRENT STATUS</Text>
                <Text style={styles.statusText}>{statusBadge.text}</Text>
              </View>
            </View>

            {/* Clinical Summary */}
            <View style={styles.clinicalSummary}>
              <Text style={styles.clinicalSummaryLabel}>CLINICAL SUMMARY</Text>
              <Text style={styles.clinicalSummaryText}>{generateClinicalSentence()}</Text>
            </View>

            {/* Since Last Snapshot */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>SINCE LAST SNAPSHOT</Text>
              </View>
              <View style={styles.deltaList}>
                {takenCount === 0 && totalMeds > 0 ? (
                  <View style={styles.deltaItem}>
                    <Text style={styles.deltaIcon}>•</Text>
                    <Text style={styles.deltaText}>No doses logged today</Text>
                  </View>
                ) : missedMeds.length > 0 ? (
                  <View style={styles.deltaItem}>
                    <Text style={styles.deltaIcon}>•</Text>
                    <Text style={styles.deltaText}>{missedMeds.length} dose{missedMeds.length !== 1 ? 's' : ''} not logged</Text>
                  </View>
                ) : totalMeds > 0 ? (
                  <View style={styles.deltaItem}>
                    <Text style={styles.deltaIcon}>•</Text>
                    <Text style={styles.deltaText}>All scheduled medications logged</Text>
                  </View>
                ) : (
                  <View style={styles.deltaItem}>
                    <Text style={styles.deltaIcon}>•</Text>
                    <Text style={styles.deltaText}>No medications scheduled</Text>
                  </View>
                )}
                {upcomingAppts.length > 0 && (
                  <View style={styles.deltaItem}>
                    <Text style={styles.deltaIcon}>•</Text>
                    <Text style={styles.deltaText}>{upcomingAppts.length} appointment{upcomingAppts.length !== 1 ? 's' : ''} in next 7 days</Text>
                  </View>
                )}
              </View>
            </View>

            {/* Needs Attention (Grouped, Max 3) */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>NEEDS ATTENTION</Text>
              </View>
              
              {(missedMeds.length > 0 || upcomingAppts.filter(a => {
                const daysUntil = Math.ceil((new Date(a.date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
                return daysUntil <= 3;
              }).length > 0) ? (
                <View style={styles.groupCards}>
                  {/* Group 1: Medication Logging */}
                  {missedMeds.length > 0 && (
                    <TouchableOpacity style={styles.groupCard} activeOpacity={0.7} accessibilityLabel={`Medication logging, ${missedMeds.length} pending`} accessibilityRole="button">

                      <View style={styles.groupCardHeader}>
                        <Text style={styles.groupCardTitle}>Medication Logging</Text>
                        <Text style={styles.groupCardCount}>{missedMeds.length} pending</Text>
                      </View>
                      <Text style={styles.groupCardSummary}>
                        {takenCount === 0 
                          ? `No medications logged today. ${totalMeds} scheduled.`
                          : `${missedMeds.length} dose${missedMeds.length !== 1 ? 's' : ''} not logged yet.`
                        }
                      </Text>
                    </TouchableOpacity>
                  )}

                  {/* Group 2: Upcoming Urgent Appointments */}
                  {upcomingAppts.filter(a => {
                    const daysUntil = Math.ceil((new Date(a.date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
                    return daysUntil <= 3;
                  }).length > 0 && (() => {
                    const urgentAppt = upcomingAppts.find(a => {
                      const daysUntil = Math.ceil((new Date(a.date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
                      return daysUntil <= 3;
                    });
                    const daysUntil = Math.ceil((new Date(urgentAppt!.date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
                    
                    return (
                      <TouchableOpacity style={styles.groupCard} activeOpacity={0.7} accessibilityLabel={`Upcoming appointment, ${daysUntil === 0 ? 'today' : daysUntil === 1 ? 'tomorrow' : `in ${daysUntil} days`}`} accessibilityRole="button">
                        <View style={styles.groupCardHeader}>
                          <Text style={styles.groupCardTitle}>Upcoming Appointment</Text>
                          <Text style={styles.groupCardCount}>
                            {daysUntil === 0 ? 'today' : daysUntil === 1 ? 'tomorrow' : `in ${daysUntil} days`}
                          </Text>
                        </View>
                        <Text style={styles.groupCardSummary}>
                          {urgentAppt!.specialty} on {new Date(urgentAppt!.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}.
                        </Text>
                      </TouchableOpacity>
                    );
                  })()}
                </View>
              ) : (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyStateIcon}>✓</Text>
                  <Text style={styles.emptyStateText}>No items requiring attention</Text>
                </View>
              )}
            </View>

            {/* Upcoming (Next 7 Days) */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>UPCOMING (NEXT 7 DAYS)</Text>
                {upcomingAppts.length > 3 && (
                  <TouchableOpacity onPress={() => router.push('/appointments' as any)} accessibilityLabel="View all appointments" accessibilityRole="link">
                    <Text style={styles.viewDetailsLink}>View all →</Text>
                  </TouchableOpacity>
                )}
              </View>
              
              {upcomingAppts.length > 0 ? (
                <View style={styles.upcomingList}>
                  {upcomingAppts.slice(0, 3).map((appt, index) => {
                    const apptDate = new Date(appt.date);
                    const daysUntil = Math.ceil((apptDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
                    
                    return (
                      <View key={appt.id || index} style={styles.upcomingItem}>
                        <Text style={styles.upcomingDate}>
                          {apptDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).toUpperCase()} 
                          {appt.time && ` AT ${appt.time}`}
                        </Text>
                        <Text style={styles.upcomingTitle}>{appt.specialty} - {appt.provider}</Text>
                        <Text style={styles.upcomingDetail}>
                          {appt.notes || 'Follow-up'}{appt.location && ` • ${appt.location}`}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              ) : (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyStateText}>No upcoming appointments</Text>
                </View>
              )}
            </View>

            {/* Critical Context (Collapsible) */}
            <View style={styles.section}>
              <TouchableOpacity
                style={styles.criticalContext}
                onPress={() => setCriticalContextExpanded(!criticalContextExpanded)}
                activeOpacity={0.7}
                accessibilityLabel={`Critical context, ${criticalContextExpanded ? 'collapse' : 'expand'}`}
                accessibilityRole="button"
                accessibilityState={{ expanded: criticalContextExpanded }}
              >
                <View style={styles.criticalContextToggle}>
                  <Text style={styles.sectionTitle}>CRITICAL CONTEXT</Text>
                  <Ionicons 
                    name={criticalContextExpanded ? "chevron-up" : "chevron-down"} 
                    size={20} 
                    color={Colors.textMuted} 
                  />
                </View>
                
                {criticalContextExpanded && (
                  <View style={styles.criticalContextContent}>
                    <View style={styles.contextField}>
                      <Text style={styles.contextLabel}>ALLERGIES</Text>
                      <Text style={styles.contextValue}>
                        {medicalInfo && medicalInfo.allergies.length > 0
                          ? medicalInfo.allergies.join(', ')
                          : 'None reported'}
                      </Text>
                    </View>
                    <View style={styles.contextField}>
                      <Text style={styles.contextLabel}>ACTIVE DIAGNOSES</Text>
                      <Text style={styles.contextValue}>
                        {medicalInfo && medicalInfo.diagnoses.filter(d => d.status === 'active').length > 0
                          ? medicalInfo.diagnoses
                              .filter(d => d.status === 'active')
                              .map(d => d.condition)
                              .join(', ')
                          : 'Not specified'}
                      </Text>
                    </View>
                    <View style={styles.contextField}>
                      <Text style={styles.contextLabel}>SURGICAL HISTORY</Text>
                      <Text style={styles.contextValue}>
                        {medicalInfo && medicalInfo.surgeries.length > 0
                          ? medicalInfo.surgeries.map(s => s.procedure).join(', ')
                          : 'None recorded'}
                      </Text>
                    </View>
                    <View style={styles.contextField}>
                      <Text style={styles.contextLabel}>EMERGENCY CONTACT</Text>
                      <Text style={styles.contextValue}>Not configured</Text>
                    </View>
                  </View>
                )}
              </TouchableOpacity>
            </View>

            <View style={{ height: 40 }} />
          </View>
        </ScrollView>
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: Colors.background 
  },
  gradient: { flex: 1 },
  scrollView: { 
    flex: 1, 
    paddingHorizontal: Spacing.xl 
  },

  // Header
  header: {
    paddingTop: Platform.OS === 'android' ? 20 : 0,
    paddingBottom: Spacing.lg,
    marginBottom: Spacing.md,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginBottom: Spacing.md,
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
  headerTitle: {
    fontSize: 28,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  headerMeta: {
    fontSize: 13,
    color: Colors.textMuted,
  },
  headerActions: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(212, 165, 116, 0.15)',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: 'rgba(212, 165, 116, 0.3)',
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.accent,
  },

  // Content
  content: {
    paddingBottom: Spacing.xxl,
  },

  // Snapshot Timestamp
  snapshotTimestamp: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(45, 59, 45, 0.3)',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: 'rgba(212, 165, 116, 0.2)',
    marginBottom: Spacing.xl,
  },
  snapshotText: {
    fontSize: 12,
    color: Colors.textMuted,
  },

  // Status Banner
  statusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.lg,
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.xl,
    borderLeftWidth: 4,
  },
  statusBannerStable: {
    backgroundColor: 'rgba(240, 253, 244, 0.15)',
    borderLeftColor: '#22C55E',
  },
  statusBannerAttention: {
    backgroundColor: 'rgba(254, 243, 199, 0.15)',
    borderLeftColor: '#F59E0B',
  },
  statusBannerConcerning: {
    backgroundColor: 'rgba(254, 242, 242, 0.15)', // REDUCED saturation
    borderLeftColor: '#EF4444',
  },
  statusIcon: {
    fontSize: 28,
    color: Colors.textPrimary,
  },
  statusContent: {
    flex: 1,
  },
  statusLabel: {
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 1,
    fontWeight: '700',
    color: Colors.textMuted,
    marginBottom: 4,
  },
  statusText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textPrimary,
  },

  // Clinical Summary
  clinicalSummary: {
    backgroundColor: 'rgba(45, 59, 45, 0.3)',
    borderLeftWidth: 4,
    borderLeftColor: Colors.accent,
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.xxl,
  },
  clinicalSummaryLabel: {
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    fontWeight: '700',
    color: Colors.textMuted,
    marginBottom: 8,
  },
  clinicalSummaryText: {
    fontSize: 15,
    lineHeight: 22,
    color: Colors.textPrimary,
  },

  // Section
  section: {
    marginBottom: Spacing.xxl,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.lg,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(212, 165, 116, 0.2)',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
    color: Colors.textPrimary,
  },
  viewDetailsLink: {
    fontSize: 13,
    color: '#3B82F6',
    fontWeight: '600',
  },

  // Delta List (Since Last Snapshot)
  deltaList: {
    gap: Spacing.md,
  },
  deltaItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(212, 165, 116, 0.1)',
  },
  deltaIcon: {
    color: Colors.textMuted,
    fontSize: 14,
    marginTop: 2,
  },
  deltaText: {
    flex: 1,
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 20,
  },

  // Group Cards (Needs Attention)
  groupCards: {
    gap: Spacing.md,
  },
  groupCard: {
    backgroundColor: 'rgba(45, 59, 45, 0.3)',
    borderWidth: 1,
    borderColor: 'rgba(212, 165, 116, 0.3)',
    borderLeftWidth: 4,
    borderLeftColor: '#F59E0B',
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
  },
  groupCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  groupCardTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  groupCardCount: {
    fontSize: 12,
    color: Colors.textMuted,
    backgroundColor: 'rgba(45, 59, 45, 0.5)',
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: 12,
  },
  groupCardSummary: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 18,
  },

  // Empty State
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyStateIcon: {
    fontSize: 48,
    color: Colors.textMuted,
    opacity: 0.3,
    marginBottom: 16,
  },
  emptyStateText: {
    fontSize: 14,
    color: Colors.textMuted,
  },

  // Upcoming Items
  upcomingList: {
    gap: Spacing.md,
  },
  upcomingItem: {
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(212, 165, 116, 0.3)',
    borderRadius: BorderRadius.lg,
    backgroundColor: 'rgba(45, 59, 45, 0.2)',
  },
  upcomingDate: {
    fontSize: 12,
    fontWeight: '700',
    color: '#3B82F6',
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  upcomingTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  upcomingDetail: {
    fontSize: 13,
    color: Colors.textSecondary,
  },

  // Critical Context (Collapsible)
  criticalContext: {
    backgroundColor: 'rgba(45, 59, 45, 0.3)',
    borderWidth: 1,
    borderColor: 'rgba(212, 165, 116, 0.2)',
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
  },
  criticalContextToggle: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  criticalContextContent: {
    marginTop: Spacing.lg,
    paddingTop: Spacing.lg,
    borderTopWidth: 1,
    borderTopColor: 'rgba(212, 165, 116, 0.2)',
    gap: Spacing.lg,
  },
  contextField: {
    gap: 4,
  },
  contextLabel: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    color: Colors.textMuted,
    letterSpacing: 0.5,
  },
  contextValue: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
});
