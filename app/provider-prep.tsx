// ============================================================================
// PROVIDER PREP SCREEN
// Auto-generated question list from data anomalies + visit summary sheet
// Surfaces contextually within 14 days of an appointment
// ============================================================================

import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Switch,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { format } from 'date-fns';

import { Colors, Spacing, BorderRadius } from '../theme/theme-tokens';
import { AuroraBackground } from '../components/aurora/AuroraBackground';
import { GlassCard } from '../components/aurora/GlassCard';
import { SubScreenHeader } from '../components/SubScreenHeader';

import { getUpcomingAppointments, Appointment } from '../utils/appointmentStorage';
import { getMedications } from '../utils/medicationStorage';
import { generateProviderQuestions, ProviderQuestion } from '../utils/insightEngine';
import { generateAndSharePDF, generatePreviewHTML } from '../utils/pdfExport';
import { safeGetItem } from '../utils/safeStorage';
import { StorageKeys } from '../utils/storageKeys';
import { logError } from '../utils/devLog';
import { getTodayDateString } from '../services/carePlanGenerator';

export default function ProviderPrepScreen() {
  const { appointmentId } = useLocalSearchParams<{ appointmentId?: string }>();

  const [loading, setLoading] = useState(true);
  const [appointment, setAppointment] = useState<Appointment | null>(null);
  const [questions, setQuestions] = useState<ProviderQuestion[]>([]);
  const [checkedQuestions, setCheckedQuestions] = useState<Set<string>>(new Set());
  const [customQuestion, setCustomQuestion] = useState('');
  const [customQuestions, setCustomQuestions] = useState<string[]>([]);
  const [daysSinceLastVisit, setDaysSinceLastVisit] = useState(30);

  // Visit summary toggles
  const [showVitals, setShowVitals] = useState(true);
  const [showMedAdherence, setShowMedAdherence] = useState(true);
  const [showSymptoms, setShowSymptoms] = useState(true);
  const [showQuestions, setShowQuestions] = useState(true);

  // Preview modal
  const [showPreview, setShowPreview] = useState(false);
  const [previewHTML, setPreviewHTML] = useState('');
  const [exporting, setExporting] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [appointmentId])
  );

  const loadData = async () => {
    try {
      setLoading(true);

      const appointments = await getUpcomingAppointments();
      let appt: Appointment | null = null;

      if (appointmentId) {
        appt = appointments.find(a => a.id === appointmentId) ?? appointments[0] ?? null;
      } else {
        appt = appointments[0] ?? null;
      }

      setAppointment(appt);

      if (appt) {
        const apptDate = new Date(appt.date);
        const now = new Date();
        const daysUntil = Math.max(0, Math.ceil((apptDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));

        // Estimate days since last visit (use 30 as default)
        setDaysSinceLastVisit(30);

        const generatedQuestions = await generateProviderQuestions(appt.id, 30);
        setQuestions(generatedQuestions);
      }
    } catch (error) {
      logError('ProviderPrepScreen.loadData', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleQuestion = useCallback((id: string) => {
    setCheckedQuestions(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const addCustomQuestion = useCallback(() => {
    const trimmed = customQuestion.trim();
    if (!trimmed) return;
    setCustomQuestions(prev => [...prev, trimmed]);
    setCustomQuestion('');
  }, [customQuestion]);

  const daysUntilAppointment = useMemo(() => {
    if (!appointment) return 0;
    const apptDate = new Date(appointment.date);
    const now = new Date();
    return Math.max(0, Math.ceil((apptDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
  }, [appointment]);

  const buildReportData = useCallback(async () => {
    const patientName = await safeGetItem<string>(StorageKeys.PATIENT_NAME, 'Patient');

    const selectedQs = questions
      .filter(q => checkedQuestions.has(q.id))
      .map(q => q.question);
    const allQuestions = [...selectedQs, ...customQuestions];

    const sections: string[] = [];
    if (appointment) {
      sections.push(`Provider: ${appointment.provider || 'Provider'}`);
      sections.push(`Date: ${format(new Date(appointment.date), 'MMMM d, yyyy')}`);
      sections.push(`Specialty: ${appointment.specialty || 'General'}`);
      sections.push('');
    }

    if (allQuestions.length > 0) {
      sections.push('Questions to Ask:');
      allQuestions.forEach((q, i) => sections.push(`${i + 1}. ${q}`));
      sections.push('');
    }

    return {
      reportData: {
        title: `Visit Prep - ${appointment?.provider || 'Provider'}`,
        period: format(new Date(), 'MMMM d, yyyy'),
        periodLabel: 'Prepared',
        summary: sections.join('\n'),
        details: allQuestions.map((q: string, i: number) => ({
          label: `Question ${i + 1}`,
          value: q,
        })),
      },
      patient: { name: patientName || 'Patient' },
    };
  }, [appointment, questions, checkedQuestions, customQuestions]);

  const handlePreview = useCallback(async () => {
    try {
      const { reportData, patient } = await buildReportData();
      const html = generatePreviewHTML(reportData, patient);
      setPreviewHTML(html);
      setShowPreview(true);
    } catch (error) {
      logError('ProviderPrepScreen.handlePreview', error);
      Alert.alert('Preview Error', 'Unable to generate preview. Please try again.');
    }
  }, [buildReportData]);

  const handleExport = useCallback(async () => {
    try {
      setExporting(true);
      const { reportData, patient } = await buildReportData();
      await generateAndSharePDF(reportData, patient);
      setShowPreview(false);
    } catch (error) {
      logError('ProviderPrepScreen.handleExport', error);
      Alert.alert('Export Error', 'Unable to generate PDF. Please try again.');
    } finally {
      setExporting(false);
    }
  }, [buildReportData]);

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return Colors.red;
      case 'medium': return Colors.amber;
      default: return Colors.textMuted;
    }
  };

  const getPriorityLabel = (priority: string) => {
    switch (priority) {
      case 'high': return 'Ask First';
      case 'medium': return 'Important';
      default: return 'If Time';
    }
  };

  const getPriorityBg = (priority: string) => {
    switch (priority) {
      case 'high': return Colors.redFaint;
      case 'medium': return Colors.amberFaint;
      default: return Colors.glassDim;
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <AuroraBackground variant="hub" />
        <SafeAreaView style={{ flex: 1 }} edges={['top']}>
          <SubScreenHeader title="Visit Prep" />
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={Colors.accent} />
          </View>
        </SafeAreaView>
      </View>
    );
  }

  if (!appointment) {
    return (
      <View style={styles.container}>
        <AuroraBackground variant="hub" />
        <SafeAreaView style={{ flex: 1 }} edges={['top']}>
          <SubScreenHeader title="Visit Prep" />
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No upcoming appointments found.</Text>
            <Text style={styles.emptySubtext}>Add an appointment to start preparing.</Text>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <AuroraBackground variant="hub" />
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <SubScreenHeader
          title="Visit Prep"
                    rightAction={
            <TouchableOpacity
              onPress={handlePreview}
              style={styles.exportButton}
              accessibilityLabel="Preview visit prep report"
              accessibilityRole="button"
            >
              <Text style={styles.exportButtonText}>Export</Text>
            </TouchableOpacity>
          }
        />

        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
          {/* Appointment Header */}
          <GlassCard style={styles.appointmentHeader}>
            <Text style={styles.providerName}>{appointment.provider || 'Provider'}</Text>
            <Text style={styles.appointmentMeta}>
              {appointment.specialty || 'Appointment'} {'\u00B7'} {format(new Date(appointment.date), 'MMMM d, yyyy')}
            </Text>
            <View style={styles.daysRow}>
              <View style={styles.daysPill}>
                <Text style={styles.daysPillText}>
                  {daysUntilAppointment === 0 ? 'Today' : `In ${daysUntilAppointment} day${daysUntilAppointment !== 1 ? 's' : ''}`}
                </Text>
              </View>
              <Text style={styles.dataSince}>
                ~{daysSinceLastVisit} days of data since last visit
              </Text>
            </View>
          </GlassCard>

          {/* Auto-generated Questions */}
          <Text style={styles.sectionTitle}>Questions for Your Provider</Text>
          {questions.length === 0 && customQuestions.length === 0 && (
            <Text style={styles.noQuestionsText}>
              No data-driven questions detected. Add your own below.
            </Text>
          )}

          {questions.map(q => (
            <TouchableOpacity
              key={q.id}
              style={[
                styles.questionCard,
                checkedQuestions.has(q.id) && styles.questionCardChecked,
              ]}
              onPress={() => toggleQuestion(q.id)}
              activeOpacity={0.7}
              accessibilityLabel={`${checkedQuestions.has(q.id) ? 'Uncheck' : 'Check'}: ${q.question}`}
              accessibilityRole="checkbox"
            >
              <View style={styles.questionLeft}>
                <View style={[
                  styles.checkbox,
                  checkedQuestions.has(q.id) && styles.checkboxChecked,
                ]}>
                  {checkedQuestions.has(q.id) && (
                    <Text style={styles.checkmark}>{'\u2713'}</Text>
                  )}
                </View>
              </View>
              <View style={styles.questionContent}>
                <View style={styles.priorityRow}>
                  <View style={[styles.priorityPill, { backgroundColor: getPriorityBg(q.priority) }]}>
                    <Text style={[styles.priorityText, { color: getPriorityColor(q.priority) }]}>
                      {getPriorityLabel(q.priority)}
                    </Text>
                  </View>
                  <Text style={styles.questionSource}>{q.source}</Text>
                </View>
                <Text style={styles.questionText}>{q.question}</Text>
                {q.dataPoint && (
                  <Text style={styles.dataPointText}>{q.dataPoint}</Text>
                )}
              </View>
            </TouchableOpacity>
          ))}

          {/* Custom questions */}
          {customQuestions.map((q, i) => (
            <View key={`custom-${i}`} style={[styles.questionCard, styles.questionCardChecked]}>
              <View style={styles.questionLeft}>
                <View style={[styles.checkbox, styles.checkboxChecked]}>
                  <Text style={styles.checkmark}>{'\u2713'}</Text>
                </View>
              </View>
              <View style={styles.questionContent}>
                <Text style={styles.questionText}>{q}</Text>
              </View>
            </View>
          ))}

          {/* Add custom question */}
          <View style={styles.addQuestionRow}>
            <TextInput
              style={styles.addQuestionInput}
              value={customQuestion}
              onChangeText={setCustomQuestion}
              placeholder="Add your own question..."
              placeholderTextColor={Colors.textMuted}
              onSubmitEditing={addCustomQuestion}
              returnKeyType="done"
            />
            <TouchableOpacity
              style={[styles.addButton, !customQuestion.trim() && styles.addButtonDisabled]}
              onPress={addCustomQuestion}
              disabled={!customQuestion.trim()}
              accessibilityLabel="Add question"
              accessibilityRole="button"
            >
              <Text style={styles.addButtonText}>Add</Text>
            </TouchableOpacity>
          </View>

          {/* Visit Summary Sheet */}
          <Text style={[styles.sectionTitle, { marginTop: 24 }]}>Visit Summary</Text>
          <Text style={styles.sectionSubtitle}>Toggle sections to include in your export</Text>

          <View style={styles.toggleSection}>
            <View style={styles.toggleRow}>
              <Text style={styles.toggleLabel}>Vitals Trend</Text>
              <Switch
                value={showVitals}
                onValueChange={setShowVitals}
                trackColor={{ false: Colors.glassDim, true: Colors.accentLight }}
                thumbColor={showVitals ? Colors.accent : Colors.textMuted}
              />
            </View>
            <View style={styles.toggleRow}>
              <Text style={styles.toggleLabel}>Med Adherence</Text>
              <Switch
                value={showMedAdherence}
                onValueChange={setShowMedAdherence}
                trackColor={{ false: Colors.glassDim, true: Colors.accentLight }}
                thumbColor={showMedAdherence ? Colors.accent : Colors.textMuted}
              />
            </View>
            <View style={styles.toggleRow}>
              <Text style={styles.toggleLabel}>Symptom Log</Text>
              <Switch
                value={showSymptoms}
                onValueChange={setShowSymptoms}
                trackColor={{ false: Colors.glassDim, true: Colors.accentLight }}
                thumbColor={showSymptoms ? Colors.accent : Colors.textMuted}
              />
            </View>
            <View style={styles.toggleRow}>
              <Text style={styles.toggleLabel}>Your Questions</Text>
              <Switch
                value={showQuestions}
                onValueChange={setShowQuestions}
                trackColor={{ false: Colors.glassDim, true: Colors.accentLight }}
                thumbColor={showQuestions ? Colors.accent : Colors.textMuted}
              />
            </View>
          </View>

          {/* Export button */}
          <TouchableOpacity
            style={styles.exportFooterButton}
            onPress={handlePreview}
            activeOpacity={0.7}
            accessibilityLabel="Preview visit prep report"
            accessibilityRole="button"
          >
            <Text style={styles.exportFooterText}>Export PDF</Text>
          </TouchableOpacity>

          <View style={{ height: 40 }} />
        </ScrollView>

        {/* Preview Modal */}
        <Modal
          visible={showPreview}
          animationType="slide"
          presentationStyle="pageSheet"
          onRequestClose={() => setShowPreview(false)}
        >
          <SafeAreaView style={styles.previewContainer} edges={['top', 'bottom']}>
            <View style={styles.previewHeader}>
              <TouchableOpacity
                onPress={() => setShowPreview(false)}
                style={styles.previewCloseButton}
                accessibilityLabel="Close preview"
                accessibilityRole="button"
              >
                <Text style={styles.previewCloseText}>Cancel</Text>
              </TouchableOpacity>
              <Text style={styles.previewTitle}>Report Preview</Text>
              <TouchableOpacity
                onPress={handleExport}
                style={[styles.previewExportButton, exporting && { opacity: 0.5 }]}
                disabled={exporting}
                accessibilityLabel="Export as PDF"
                accessibilityRole="button"
              >
                <Text style={styles.previewExportText}>
                  {exporting ? 'Exporting...' : 'Share PDF'}
                </Text>
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.previewScroll} contentContainerStyle={styles.previewScrollContent}>
              <View style={styles.previewCard}>
                <Text style={styles.previewHTMLNote}>
                  This is a preview of your report. Tap "Share PDF" to export.
                </Text>
              </View>
              {/* Render a simplified text preview of the report content */}
              {previewHTML ? (
                <View style={styles.previewContent}>
                  {previewHTML.split('\n').filter(Boolean).map((line, i) => (
                    <Text key={i} style={[
                      styles.previewLine,
                      line.startsWith('Provider:') || line.startsWith('Date:') || line.startsWith('Specialty:')
                        ? styles.previewLineHeader
                        : line.startsWith('Questions to Ask:')
                        ? styles.previewLineSectionTitle
                        : line.match(/^\d+\./)
                        ? styles.previewLineQuestion
                        : null,
                    ]}>{line}</Text>
                  ))}
                </View>
              ) : null}
            </ScrollView>
          </SafeAreaView>
        </Modal>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyText: {
    fontSize: 16,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 13,
    color: Colors.textMuted,
    textAlign: 'center',
    marginTop: 8,
  },
  exportButton: {
    backgroundColor: Colors.accent,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  exportButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textPrimary,
  },

  // Appointment header
  appointmentHeader: {
    marginBottom: 20,
  },
  providerName: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  appointmentMeta: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginBottom: 10,
  },
  daysRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  daysPill: {
    backgroundColor: Colors.accentLight,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  daysPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.accent,
  },
  dataSince: {
    fontSize: 12,
    color: Colors.textMuted,
  },

  // Questions
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textBright,
    marginBottom: 8,
  },
  sectionSubtitle: {
    fontSize: 12,
    color: Colors.textMuted,
    marginBottom: 12,
  },
  noQuestionsText: {
    fontSize: 13,
    color: Colors.textMuted,
    fontStyle: 'italic',
    marginBottom: 12,
  },
  questionCard: {
    flexDirection: 'row',
    backgroundColor: Colors.glass,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: 8,
    gap: 10,
  },
  questionCardChecked: {
    backgroundColor: Colors.accentFaint,
    borderColor: Colors.accentBorder,
  },
  questionLeft: {
    marginTop: 2,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: Colors.glassBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: Colors.accent,
    borderColor: Colors.accent,
  },
  checkmark: {
    fontSize: 12,
    color: '#fff',
    fontWeight: '700',
  },
  questionContent: {
    flex: 1,
  },
  priorityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  priorityPill: {
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  priorityText: {
    fontSize: 10,
    fontWeight: '600',
  },
  questionSource: {
    fontSize: 10,
    color: Colors.textMuted,
  },
  questionText: {
    fontSize: 14,
    color: Colors.textBright,
    lineHeight: 20,
  },
  dataPointText: {
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 4,
  },

  // Add question
  addQuestionRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  addQuestionInput: {
    flex: 1,
    backgroundColor: Colors.glass,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: Colors.textBright,
  },
  addButton: {
    backgroundColor: Colors.accent,
    borderRadius: 8,
    paddingHorizontal: 16,
    justifyContent: 'center',
  },
  addButtonDisabled: {
    opacity: 0.4,
  },
  addButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textPrimary,
  },

  // Visit summary toggles
  toggleSection: {
    backgroundColor: Colors.glass,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.glassBorder,
  },
  toggleLabel: {
    fontSize: 14,
    color: Colors.textBright,
  },

  // Export footer
  exportFooterButton: {
    backgroundColor: Colors.accent,
    borderRadius: BorderRadius.lg,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 20,
  },
  exportFooterText: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.textPrimary,
  },

  // Preview modal
  previewContainer: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  previewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.glassBorder,
  },
  previewCloseButton: {
    padding: 4,
  },
  previewCloseText: {
    fontSize: 15,
    color: Colors.textMuted,
  },
  previewTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  previewExportButton: {
    backgroundColor: Colors.accent,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  previewExportText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  previewScroll: {
    flex: 1,
  },
  previewScrollContent: {
    padding: 20,
  },
  previewCard: {
    backgroundColor: Colors.glass,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
  },
  previewHTMLNote: {
    fontSize: 13,
    color: Colors.textMuted,
    textAlign: 'center',
  },
  previewContent: {
    backgroundColor: Colors.glass,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    borderRadius: 12,
    padding: 20,
  },
  previewLine: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 22,
    marginBottom: 2,
  },
  previewLineHeader: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  previewLineSectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.accent,
    marginTop: 12,
    marginBottom: 6,
  },
  previewLineQuestion: {
    fontSize: 14,
    color: Colors.textBright,
    paddingLeft: 8,
    marginBottom: 4,
  },
});
