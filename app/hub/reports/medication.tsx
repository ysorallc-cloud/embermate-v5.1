// ============================================================================
// MEDICATION ADHERENCE REPORT
// V3: Clinical report for healthcare providers
// ============================================================================

import React from 'react';
import { View, ScrollView, StyleSheet, TouchableOpacity, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { AuroraBackground } from '../../../components/aurora/AuroraBackground';
import { GlassCard } from '../../../components/aurora/GlassCard';
import { PageHeader } from '../../../components/aurora/PageHeader';
import { Colors, Spacing, Typography, BorderRadius } from '../../_theme/theme-tokens';

// Sample data
const SAMPLE_DATA = {
  adherence7Day: 100,
  adherence30Day: 94,
  medications: [
    { name: 'Lisinopril 10mg', schedule: 'Once daily (morning)', adherence: 100, missed: 0, late: 0 },
    { name: 'Metformin 500mg', schedule: 'Twice daily', adherence: 97, missed: 1, late: 1 },
    { name: 'Atorvastatin 20mg', schedule: 'Once daily (evening)', adherence: 87, missed: 2, late: 2 },
    { name: 'Aspirin 81mg', schedule: 'Once daily (morning)', adherence: 93, missed: 1, late: 1 },
  ],
  patterns: [
    { text: 'Morning medications taken more consistently than evening doses', type: 'info' },
    { text: '2 doses of Atorvastatin missed this month - consider setting reminder', type: 'warning' },
  ],
  sideEffects: [
    { date: 'Jan 14', symptom: 'Mild nausea', linkedMed: 'Metformin', note: 'Occurred 30 min after dose' },
  ],
};

const getAdherenceColor = (adherence: number) => {
  if (adherence >= 95) return Colors.green;
  if (adherence >= 85) return Colors.amber;
  return Colors.red;
};

export default function MedicationReport() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <AuroraBackground variant="reports" />

      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          <PageHeader
            category="CLINICAL REPORT"
            title="Medication Adherence"
            onBack={() => router.back()}
            actionIcon="📤"
            onAction={() => {/* Share report */}}
          />

          {/* Adherence Overview */}
          <View style={styles.overviewRow}>
            <GlassCard style={styles.statCard}>
              <Text style={[styles.statValue, { color: getAdherenceColor(SAMPLE_DATA.adherence7Day) }]}>
                {SAMPLE_DATA.adherence7Day}%
              </Text>
              <Text style={styles.statLabel}>7-Day</Text>
            </GlassCard>
            <GlassCard style={styles.statCard}>
              <Text style={[styles.statValue, { color: getAdherenceColor(SAMPLE_DATA.adherence30Day) }]}>
                {SAMPLE_DATA.adherence30Day}%
              </Text>
              <Text style={styles.statLabel}>30-Day</Text>
            </GlassCard>
          </View>

          {/* By Medication */}
          <Text style={styles.sectionTitle}>BY MEDICATION</Text>
          <GlassCard noPadding>
            {SAMPLE_DATA.medications.map((med, i) => (
              <View key={i} style={[
                styles.medRow,
                i < SAMPLE_DATA.medications.length - 1 && styles.medRowBorder,
              ]}>
                <View style={styles.medContent}>
                  <View style={styles.medHeader}>
                    <View style={styles.medInfo}>
                      <Text style={styles.medName}>{med.name}</Text>
                      <Text style={styles.medSchedule}>{med.schedule}</Text>
                    </View>
                    <Text style={[styles.medAdherence, { color: getAdherenceColor(med.adherence) }]}>
                      {med.adherence}%
                    </Text>
                  </View>

                  {/* Progress Bar */}
                  <View style={styles.progressBar}>
                    <View style={[
                      styles.progressFill,
                      {
                        width: `${med.adherence}%`,
                        backgroundColor: getAdherenceColor(med.adherence),
                      },
                    ]} />
                  </View>

                  {/* Details */}
                  <View style={styles.medDetails}>
                    {med.missed > 0 && (
                      <Text style={styles.medDetail}>
                        Missed: {med.missed} dose{med.missed > 1 ? 's' : ''}
                      </Text>
                    )}
                    {med.late > 0 && (
                      <Text style={styles.medDetail}>
                        Late: {med.late} time{med.late > 1 ? 's' : ''}
                      </Text>
                    )}
                  </View>
                </View>
              </View>
            ))}
          </GlassCard>

          {/* Patterns */}
          <Text style={styles.sectionTitle}>PATTERNS & INSIGHTS</Text>
          {SAMPLE_DATA.patterns.map((pattern, i) => (
            <GlassCard key={i} style={[
              styles.patternCard,
              pattern.type === 'warning' && styles.patternWarning,
            ]}>
              <View style={styles.patternContent}>
                <Text style={styles.patternIcon}>
                  {pattern.type === 'info' ? 'ℹ️' : '⚠️'}
                </Text>
                <Text style={styles.patternText}>{pattern.text}</Text>
              </View>
            </GlassCard>
          ))}

          {/* Side Effects */}
          {SAMPLE_DATA.sideEffects.length > 0 && (
            <>
              <Text style={styles.sectionTitle}>REPORTED SIDE EFFECTS</Text>
              <GlassCard noPadding>
                {SAMPLE_DATA.sideEffects.map((effect, i) => (
                  <View key={i} style={[
                    styles.effectRow,
                    i < SAMPLE_DATA.sideEffects.length - 1 && styles.effectRowBorder,
                  ]}>
                    <View style={styles.effectHeader}>
                      <Text style={styles.effectSymptom}>{effect.symptom}</Text>
                      <Text style={styles.effectDate}>{effect.date}</Text>
                    </View>
                    <Text style={styles.effectNote}>
                      Linked to {effect.linkedMed} • {effect.note}
                    </Text>
                  </View>
                ))}
              </GlassCard>
            </>
          )}

          {/* Export Actions */}
          <View style={styles.exportRow}>
            <TouchableOpacity style={styles.exportPrimary}>
              <Text style={styles.exportPrimaryText}>📄 Export PDF</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.exportSecondary}>
              <Text style={styles.exportSecondaryText}>📧 Email</Text>
            </TouchableOpacity>
          </View>

          <View style={{ height: 40 }} />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  safeArea: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  content: {
    padding: Spacing.xl,
  },

  // Overview
  overviewRow: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginBottom: Spacing.xxl,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    padding: Spacing.xl,
  },
  statValue: {
    ...Typography.displayMedium,
    fontWeight: '600',
    marginBottom: 4,
  },
  statLabel: {
    ...Typography.bodySmall,
    color: Colors.textMuted,
  },

  // Section
  sectionTitle: {
    ...Typography.caption,
    color: Colors.textMuted,
    marginBottom: Spacing.md,
  },

  // Medication Rows
  medRow: {
    padding: Spacing.lg,
  },
  medRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  medContent: {
    width: '100%',
  },
  medHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.sm,
  },
  medInfo: {
    flex: 1,
  },
  medName: {
    ...Typography.body,
    color: Colors.textPrimary,
    fontWeight: '500',
    marginBottom: 2,
  },
  medSchedule: {
    ...Typography.bodySmall,
    color: Colors.textMuted,
  },
  medAdherence: {
    ...Typography.h2,
    fontWeight: '600',
  },

  // Progress Bar
  progressBar: {
    height: 6,
    backgroundColor: Colors.glass,
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: Spacing.sm,
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },

  // Details
  medDetails: {
    flexDirection: 'row',
    gap: Spacing.lg,
  },
  medDetail: {
    ...Typography.captionSmall,
    color: Colors.textMuted,
  },

  // Patterns
  patternCard: {
    marginBottom: Spacing.md,
  },
  patternWarning: {
    backgroundColor: `${Colors.amber}10`,
    borderColor: `${Colors.amber}30`,
  },
  patternContent: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  patternIcon: {
    fontSize: 20,
  },
  patternText: {
    ...Typography.bodySmall,
    color: Colors.textPrimary,
    flex: 1,
    lineHeight: 20,
  },

  // Side Effects
  effectRow: {
    padding: Spacing.lg,
  },
  effectRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  effectHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  effectSymptom: {
    ...Typography.body,
    color: Colors.textPrimary,
  },
  effectDate: {
    ...Typography.bodySmall,
    color: Colors.textMuted,
  },
  effectNote: {
    ...Typography.bodySmall,
    color: Colors.textSecondary,
  },

  // Export
  exportRow: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginTop: Spacing.xxl,
  },
  exportPrimary: {
    flex: 1,
    backgroundColor: Colors.accent,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.lg,
    alignItems: 'center',
  },
  exportPrimaryText: {
    ...Typography.body,
    color: '#FFFFFF',
    fontWeight: '500',
  },
  exportSecondary: {
    flex: 1,
    backgroundColor: Colors.glass,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.lg,
    alignItems: 'center',
  },
  exportSecondaryText: {
    ...Typography.body,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
});
