// ============================================================================
// VISIT PREP REPORT
// PDF-style preview for sharing with healthcare providers
// ============================================================================

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Share,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { Colors } from './_theme/theme-tokens';
import { getDailyTracking } from '../utils/dailyTrackingStorage';
import { getVitals } from '../utils/vitalsStorage';

interface RedFlag {
  date: string;
  category: string;
  description: string;
  severity: 'high' | 'medium';
}

interface SymptomLogEntry {
  date: string;
  symptom: string;
  severity: number;
  notes: string;
}

export default function VisitPrepScreen() {
  const router = useRouter();
  const [dateRange] = useState('Last 14 days');
  const [patientName] = useState('Mom');
  const [summary, setSummary] = useState('');
  const [redFlags, setRedFlags] = useState<RedFlag[]>([]);
  const [symptoms, setSymptoms] = useState<SymptomLogEntry[]>([]);
  const [caregiverNotes, setCaregiverNotes] = useState<string[]>([]);
  const [questions] = useState<string[]>([
    'Should we adjust pain medication timing?',
    'Are these energy levels normal for recovery?',
  ]);

  useFocusEffect(
    useCallback(() => {
      loadReportData();
    }, [])
  );

  const loadReportData = async () => {
    try {
      // Load recent tracking data
      const trackingData = await getDailyTracking();
      const vitalsData = await getVitals();

      // Generate summary
      const avgMood = trackingData.reduce((sum, d) => sum + (d.mood || 0), 0) / trackingData.length;
      const avgEnergy = trackingData.reduce((sum, d) => sum + (d.energy || 0), 0) / trackingData.length;

      let summaryText = `Over the past 14 days, ${patientName} has been `;
      if (avgMood >= 7 && avgEnergy >= 6) {
        summaryText += 'doing well overall with stable mood and good energy levels. ';
      } else if (avgMood >= 5 && avgEnergy >= 4) {
        summaryText += 'managing steadily with moderate mood and energy. ';
      } else {
        summaryText += 'experiencing some challenges with lower mood and energy levels. ';
      }
      summaryText += 'Key patterns and concerns are highlighted below.';
      setSummary(summaryText);

      // Detect red flags
      const flags: RedFlag[] = [];

      // Check for declining trends
      if (trackingData.length >= 3) {
        const recent3 = trackingData.slice(-3);
        const moodDecline = recent3.every((d, i) => i === 0 || d.mood! < recent3[i - 1].mood!);
        if (moodDecline) {
          flags.push({
            date: recent3[recent3.length - 1].date,
            category: 'Mood',
            description: 'Declining mood over 3 consecutive days',
            severity: 'high',
          });
        }
      }

      // Check vitals
      const recentVitals = vitalsData.slice(-5);
      recentVitals.forEach((vital) => {
        if (vital.type === 'glucose' && (vital.value < 70 || vital.value > 180)) {
          flags.push({
            date: vital.timestamp,
            category: 'Blood Glucose',
            description: `${vital.value} mg/dL - outside normal range`,
            severity: vital.value < 70 || vital.value > 250 ? 'high' : 'medium',
          });
        }
        if (vital.type === 'systolic' && vital.value > 140) {
          flags.push({
            date: vital.timestamp,
            category: 'Blood Pressure',
            description: `${vital.value} mmHg - elevated`,
            severity: vital.value > 180 ? 'high' : 'medium',
          });
        }
      });

      setRedFlags(flags);

      // Extract symptoms
      const symptomEntries: SymptomLogEntry[] = [];
      trackingData.forEach((day) => {
        if (day.symptoms && day.symptoms.length > 0 && !day.symptoms.includes('None today')) {
          day.symptoms.forEach((symptom) => {
            symptomEntries.push({
              date: new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
              symptom,
              severity: 5, // Default severity, would come from detailed logs
              notes: day.notes || '—',
            });
          });
        }
      });
      setSymptoms(symptomEntries.slice(-10)); // Last 10 entries

      // Extract caregiver notes
      const notes = trackingData
        .filter((d) => d.notes && d.notes.trim().length > 0)
        .map((d) => d.notes!)
        .slice(-5);
      setCaregiverNotes(notes);
    } catch (error) {
      console.error('Error loading report data:', error);
    }
  };

  const handleShare = async () => {
    try {
      const reportText = `
EmberMate Care Report
Patient: ${patientName}
Period: ${dateRange}
Generated: ${new Date().toLocaleDateString()}

SUMMARY
${summary}

RED FLAGS (${redFlags.length})
${redFlags.map((flag) => `• [${flag.severity.toUpperCase()}] ${flag.category}: ${flag.description}`).join('\n')}

SYMPTOMS LOG
${symptoms.map((s) => `${s.date} - ${s.symptom} (Severity: ${s.severity}/10)`).join('\n')}

CAREGIVER NOTES
${caregiverNotes.map((note) => `• ${note}`).join('\n')}

QUESTIONS FOR PROVIDER
${questions.map((q) => `• ${q}`).join('\n')}
      `.trim();

      await Share.share({
        message: reportText,
        title: 'EmberMate Care Report',
      });
    } catch (error) {
      console.error('Error sharing report:', error);
      Alert.alert('Error', 'Failed to share report');
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <LinearGradient
        colors={[Colors.backgroundGradientStart, Colors.backgroundGradientEnd]}
        style={styles.gradient}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backIcon}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Visit Prep Report</Text>
          <View style={{ width: 44 }} />
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Report Preview */}
          <View style={styles.reportContainer}>
            {/* Report Header */}
            <View style={styles.reportHeader}>
              <Text style={styles.reportBrand}>EmberMate</Text>
              <Text style={styles.reportTitle}>Care Report</Text>
              <View style={styles.reportMeta}>
                <Text style={styles.reportMetaText}>Patient: {patientName}</Text>
                <Text style={styles.reportMetaText}>Period: {dateRange}</Text>
                <Text style={styles.reportMetaText}>
                  Generated: {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </Text>
              </View>
            </View>

            {/* Summary */}
            <View style={styles.reportSection}>
              <Text style={styles.sectionTitle}>Summary</Text>
              <Text style={styles.summaryText}>{summary}</Text>
            </View>

            {/* Key Metrics */}
            <View style={styles.reportSection}>
              <Text style={styles.sectionTitle}>Key Metrics</Text>
              <View style={styles.metricsGrid}>
                <View style={styles.metricCard}>
                  <Text style={styles.metricValue}>7.2</Text>
                  <Text style={styles.metricLabel}>Avg Mood</Text>
                  <Text style={styles.metricStatus}>Good</Text>
                </View>
                <View style={styles.metricCard}>
                  <Text style={styles.metricValue}>6.5</Text>
                  <Text style={styles.metricLabel}>Avg Energy</Text>
                  <Text style={styles.metricStatus}>Moderate</Text>
                </View>
                <View style={styles.metricCard}>
                  <Text style={styles.metricValue}>92%</Text>
                  <Text style={styles.metricLabel}>Med Adherence</Text>
                  <Text style={styles.metricStatus}>Excellent</Text>
                </View>
                <View style={styles.metricCard}>
                  <Text style={styles.metricValue}>6.8h</Text>
                  <Text style={styles.metricLabel}>Avg Sleep</Text>
                  <Text style={styles.metricStatus}>Good</Text>
                </View>
                <View style={styles.metricCard}>
                  <Text style={styles.metricValue}>5</Text>
                  <Text style={styles.metricLabel}>Symptom Days</Text>
                  <Text style={styles.metricStatus}>Moderate</Text>
                </View>
                <View style={styles.metricCard}>
                  <Text style={styles.metricValue}>4</Text>
                  <Text style={styles.metricLabel}>Water/day</Text>
                  <Text style={styles.metricStatus}>Fair</Text>
                </View>
              </View>
            </View>

            {/* Red Flags */}
            {redFlags.length > 0 && (
              <View style={styles.reportSection}>
                <Text style={styles.sectionTitle}>Red Flags ({redFlags.length})</Text>
                {redFlags.map((flag, index) => (
                  <View
                    key={index}
                    style={[
                      styles.redFlagCard,
                      flag.severity === 'high' && styles.redFlagCardHigh,
                    ]}
                  >
                    <View style={styles.redFlagHeader}>
                      <Text
                        style={[
                          styles.redFlagBadge,
                          flag.severity === 'high' && styles.redFlagBadgeHigh,
                        ]}
                      >
                        {flag.severity === 'high' ? 'HIGH' : 'MEDIUM'}
                      </Text>
                      <Text style={styles.redFlagDate}>
                        {new Date(flag.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </Text>
                    </View>
                    <Text style={styles.redFlagCategory}>{flag.category}</Text>
                    <Text style={styles.redFlagDescription}>{flag.description}</Text>
                  </View>
                ))}
              </View>
            )}

            {/* Symptom Log */}
            {symptoms.length > 0 && (
              <View style={styles.reportSection}>
                <Text style={styles.sectionTitle}>Recent Symptoms</Text>
                <View style={styles.table}>
                  <View style={styles.tableHeader}>
                    <Text style={[styles.tableHeaderText, { flex: 1 }]}>Date</Text>
                    <Text style={[styles.tableHeaderText, { flex: 2 }]}>Symptom</Text>
                    <Text style={[styles.tableHeaderText, { flex: 1, textAlign: 'center' }]}>Severity</Text>
                  </View>
                  {symptoms.map((symptom, index) => (
                    <View key={index} style={styles.tableRow}>
                      <Text style={[styles.tableCell, { flex: 1 }]}>{symptom.date}</Text>
                      <Text style={[styles.tableCell, { flex: 2 }]}>{symptom.symptom}</Text>
                      <Text style={[styles.tableCell, { flex: 1, textAlign: 'center' }]}>
                        {symptom.severity}/10
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* Caregiver Notes */}
            {caregiverNotes.length > 0 && (
              <View style={styles.reportSection}>
                <Text style={styles.sectionTitle}>Caregiver Notes</Text>
                {caregiverNotes.map((note, index) => (
                  <View key={index} style={styles.noteItem}>
                    <Text style={styles.noteBullet}>•</Text>
                    <Text style={styles.noteText}>{note}</Text>
                  </View>
                ))}
              </View>
            )}

            {/* Questions for Provider */}
            <View style={styles.reportSection}>
              <Text style={styles.sectionTitle}>Questions for Provider</Text>
              {questions.map((question, index) => (
                <View key={index} style={styles.questionItem}>
                  <Text style={styles.questionNumber}>{index + 1}.</Text>
                  <Text style={styles.questionText}>{question}</Text>
                </View>
              ))}
            </View>
          </View>

          <View style={{ height: 100 }} />
        </ScrollView>

        {/* Share Button */}
        <View style={styles.footer}>
          <TouchableOpacity style={styles.shareButton} onPress={handleShare}>
            <Text style={styles.shareButtonText}>Share Report</Text>
          </TouchableOpacity>
        </View>
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

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    paddingTop: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(20, 184, 166, 0.15)',
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(13, 148, 136, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(20, 184, 166, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backIcon: {
    fontSize: 20,
    color: Colors.textPrimary,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: Colors.textPrimary,
  },

  // Content
  content: {
    flex: 1,
    padding: 20,
  },

  // Report Container
  reportContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(20, 184, 166, 0.1)',
  },

  // Report Header
  reportHeader: {
    borderBottomWidth: 2,
    borderBottomColor: Colors.accent,
    paddingBottom: 16,
    marginBottom: 24,
  },
  reportBrand: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 2,
    color: Colors.accent,
    marginBottom: 4,
  },
  reportTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 12,
  },
  reportMeta: {
    gap: 4,
  },
  reportMetaText: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.6)',
  },

  // Report Section
  reportSection: {
    marginBottom: 28,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: 12,
  },
  summaryText: {
    fontSize: 14,
    lineHeight: 22,
    color: 'rgba(255, 255, 255, 0.8)',
  },

  // Metrics Grid
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  metricCard: {
    width: '31%',
    backgroundColor: 'rgba(13, 148, 136, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(20, 184, 166, 0.15)',
    borderRadius: 10,
    padding: 12,
    alignItems: 'center',
  },
  metricValue: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.accent,
    marginBottom: 4,
  },
  metricLabel: {
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.5)',
    marginBottom: 4,
    textAlign: 'center',
  },
  metricStatus: {
    fontSize: 11,
    color: Colors.green,
    fontWeight: '600',
  },

  // Red Flags
  redFlagCard: {
    backgroundColor: 'rgba(251, 146, 60, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(251, 146, 60, 0.3)',
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
  },
  redFlagCardHigh: {
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  redFlagHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  redFlagBadge: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 1,
    color: Colors.gold,
    backgroundColor: 'rgba(251, 146, 60, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  redFlagBadgeHigh: {
    color: Colors.red,
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
  },
  redFlagDate: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.5)',
  },
  redFlagCategory: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  redFlagDescription: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.7)',
    lineHeight: 18,
  },

  // Table
  table: {
    borderWidth: 1,
    borderColor: 'rgba(20, 184, 166, 0.15)',
    borderRadius: 8,
    overflow: 'hidden',
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: 'rgba(13, 148, 136, 0.12)',
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  tableHeaderText: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.accent,
    letterSpacing: 0.5,
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(20, 184, 166, 0.1)',
  },
  tableCell: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
  },

  // Notes
  noteItem: {
    flexDirection: 'row',
    marginBottom: 8,
    gap: 8,
  },
  noteBullet: {
    fontSize: 14,
    color: Colors.accent,
  },
  noteText: {
    flex: 1,
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.8)',
    lineHeight: 20,
  },

  // Questions
  questionItem: {
    flexDirection: 'row',
    marginBottom: 10,
    gap: 8,
  },
  questionNumber: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.accent,
  },
  questionText: {
    flex: 1,
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.8)',
    lineHeight: 20,
  },

  // Footer
  footer: {
    padding: 20,
    paddingBottom: 24,
    borderTopWidth: 1,
    borderTopColor: 'rgba(20, 184, 166, 0.15)',
    backgroundColor: Colors.background,
  },
  shareButton: {
    paddingVertical: 16,
    backgroundColor: Colors.accent,
    borderRadius: 12,
    alignItems: 'center',
  },
  shareButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
