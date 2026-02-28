// ============================================================================
// MEDICATION REPORT — Adherence & clinical summary
// Standalone screen linked from Understand > Explore More
// ============================================================================

import React, { useState, useCallback, useMemo } from 'react';
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
import { Colors, Spacing, BorderRadius } from '../theme/theme-tokens';
import { AuroraBackground } from '../components/aurora/AuroraBackground';
import { GlassCard } from '../components/aurora/GlassCard';
import { SubScreenHeader } from '../components/SubScreenHeader';
import { getMedications, Medication, getMedicationLogs, MedicationLog } from '../utils/medicationStorage';
import { getTodayDateString } from '../services/carePlanGenerator';
import { logError } from '../utils/devLog';

// ============================================================================
// TYPES
// ============================================================================

interface MedReport {
  medication: Medication;
  totalDoses: number;
  takenDoses: number;
  missedDoses: number;
  adherenceRate: number;
  recentLogs: MedicationLog[];
  streak: number;
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function MedicationReportScreen() {
  const router = useRouter();
  const [medications, setMedications] = useState<Medication[]>([]);
  const [logs, setLogs] = useState<MedicationLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const meds = await getMedications();
      const activeMeds = meds.filter(m => m.active);
      setMedications(activeMeds);

      const allLogs = await getMedicationLogs();
      setLogs(allLogs);
    } catch (err) {
      logError('MedicationReport.loadData', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  // Build per-medication reports for the past 30 days
  const reports = useMemo((): MedReport[] => {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    return medications.map(med => {
      const medLogs = logs.filter(
        l => l.medicationId === med.id && new Date(l.timestamp) >= thirtyDaysAgo
      );
      const takenLogs = medLogs.filter(l => l.taken);
      const missedLogs = medLogs.filter(l => !l.taken);

      // Calculate streak (consecutive days taken, going backwards from today)
      let streak = 0;
      const today = getTodayDateString();
      const dayMs = 24 * 60 * 60 * 1000;
      for (let i = 0; i < 30; i++) {
        const checkDate = new Date(now.getTime() - i * dayMs);
        const dateStr = checkDate.toISOString().split('T')[0];
        const dayLog = medLogs.find(
          l => l.taken && new Date(l.timestamp).toISOString().split('T')[0] === dateStr
        );
        if (dayLog) {
          streak++;
        } else if (i > 0) {
          break;
        }
      }

      const total = medLogs.length || 1;
      const adherenceRate = Math.round((takenLogs.length / total) * 100);

      return {
        medication: med,
        totalDoses: medLogs.length,
        takenDoses: takenLogs.length,
        missedDoses: missedLogs.length,
        adherenceRate,
        recentLogs: medLogs.slice(0, 7),
        streak,
      };
    });
  }, [medications, logs]);

  const overallAdherence = useMemo(() => {
    if (reports.length === 0) return 0;
    const totalTaken = reports.reduce((sum, r) => sum + r.takenDoses, 0);
    const totalDoses = reports.reduce((sum, r) => sum + r.totalDoses, 0);
    return totalDoses > 0 ? Math.round((totalTaken / totalDoses) * 100) : 0;
  }, [reports]);

  const getAdherenceColor = (rate: number) => {
    if (rate >= 90) return Colors.green;
    if (rate >= 70) return Colors.amber;
    return Colors.red;
  };

  return (
    <View style={styles.container}>
      <AuroraBackground variant="hub" />

      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <SubScreenHeader
          title="Medication Report"
          emoji={'\uD83D\uDC8A'}
        />

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
          {/* Overall Summary */}
          <GlassCard style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>30-DAY ADHERENCE</Text>
            <View style={styles.summaryRow}>
              <Text style={[styles.summaryRate, { color: getAdherenceColor(overallAdherence) }]}>
                {overallAdherence}%
              </Text>
              <View style={styles.summaryStats}>
                <Text style={styles.summaryStatText}>
                  {reports.length} medication{reports.length !== 1 ? 's' : ''} tracked
                </Text>
                <Text style={styles.summaryStatSub}>
                  {reports.reduce((s, r) => s + r.takenDoses, 0)} doses taken
                </Text>
              </View>
            </View>
          </GlassCard>

          {/* Empty State */}
          {reports.length === 0 && !loading && (
            <GlassCard style={styles.emptyCard}>
              <Text style={styles.emptyIcon}>{'\uD83D\uDC8A'}</Text>
              <Text style={styles.emptyTitle}>No Medications</Text>
              <Text style={styles.emptyText}>
                Add medications to your care plan to see adherence data here.
              </Text>
            </GlassCard>
          )}

          {/* Per-Medication Cards */}
          {reports.map(report => (
            <GlassCard key={report.medication.id} style={styles.medCard}>
              <View style={styles.medHeader}>
                <View style={styles.medInfo}>
                  <Text style={styles.medName}>{report.medication.name}</Text>
                  {report.medication.dosage && (
                    <Text style={styles.medDosage}>{report.medication.dosage}</Text>
                  )}
                </View>
                <View style={[
                  styles.adherenceBadge,
                  { backgroundColor: `${getAdherenceColor(report.adherenceRate)}20` },
                ]}>
                  <Text style={[
                    styles.adherenceText,
                    { color: getAdherenceColor(report.adherenceRate) },
                  ]}>
                    {report.adherenceRate}%
                  </Text>
                </View>
              </View>

              <View style={styles.medStatsRow}>
                <View style={styles.medStat}>
                  <Text style={styles.medStatValue}>{report.takenDoses}</Text>
                  <Text style={styles.medStatLabel}>Taken</Text>
                </View>
                <View style={styles.medStat}>
                  <Text style={[styles.medStatValue, report.missedDoses > 0 && { color: Colors.red }]}>
                    {report.missedDoses}
                  </Text>
                  <Text style={styles.medStatLabel}>Missed</Text>
                </View>
                <View style={styles.medStat}>
                  <Text style={styles.medStatValue}>{report.streak}</Text>
                  <Text style={styles.medStatLabel}>Streak</Text>
                </View>
              </View>

              {/* 7-day dot visualization */}
              <View style={styles.dotRow}>
                {Array.from({ length: 7 }).map((_, i) => {
                  const dayOffset = 6 - i;
                  const checkDate = new Date(Date.now() - dayOffset * 24 * 60 * 60 * 1000);
                  const dateStr = checkDate.toISOString().split('T')[0];
                  const dayLog = report.recentLogs.find(
                    l => new Date(l.timestamp).toISOString().split('T')[0] === dateStr
                  );
                  const taken = dayLog?.taken;
                  const missed = dayLog && !dayLog.taken;

                  return (
                    <View key={i} style={styles.dotDay}>
                      <View style={[
                        styles.dot,
                        taken && styles.dotTaken,
                        missed && styles.dotMissed,
                        !dayLog && styles.dotEmpty,
                      ]} />
                      <Text style={styles.dotLabel}>
                        {checkDate.toLocaleDateString('en-US', { weekday: 'narrow' })}
                      </Text>
                    </View>
                  );
                })}
              </View>
            </GlassCard>
          ))}

          {/* Disclaimer */}
          <Text style={styles.disclaimer}>
            Personal tracking summary — not a medical record.
          </Text>

          <View style={{ height: 40 }} />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

// ============================================================================
// STYLES
// ============================================================================

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
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
  },

  // Summary Card
  summaryCard: {
    marginBottom: 16,
  },
  summaryLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.textHalf,
    letterSpacing: 1.2,
    marginBottom: 10,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  summaryRate: {
    fontSize: 36,
    fontWeight: '700',
  },
  summaryStats: {
    flex: 1,
  },
  summaryStatText: {
    fontSize: 14,
    color: Colors.textPrimary,
    fontWeight: '500',
  },
  summaryStatSub: {
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 2,
  },

  // Empty state
  emptyCard: {
    alignItems: 'center',
    padding: 32,
  },
  emptyIcon: {
    fontSize: 40,
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: 6,
  },
  emptyText: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },

  // Med Card
  medCard: {
    marginBottom: 12,
  },
  medHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  medInfo: {
    flex: 1,
  },
  medName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  medDosage: {
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 2,
  },
  adherenceBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  adherenceText: {
    fontSize: 16,
    fontWeight: '700',
  },

  // Stats row
  medStatsRow: {
    flexDirection: 'row',
    gap: 20,
    marginBottom: 12,
  },
  medStat: {
    alignItems: 'center',
  },
  medStatValue: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  medStatLabel: {
    fontSize: 10,
    color: Colors.textMuted,
    marginTop: 2,
  },

  // Dot visualization
  dotRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  dotDay: {
    alignItems: 'center',
    gap: 4,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  dotTaken: {
    backgroundColor: Colors.green,
  },
  dotMissed: {
    backgroundColor: Colors.red,
  },
  dotEmpty: {
    backgroundColor: Colors.border,
  },
  dotLabel: {
    fontSize: 9,
    color: Colors.textMuted,
  },

  // Disclaimer
  disclaimer: {
    fontSize: 11,
    color: Colors.textMuted,
    textAlign: 'center',
    marginTop: 16,
    fontStyle: 'italic',
  },
});
