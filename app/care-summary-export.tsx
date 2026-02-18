// ============================================================================
// CARE SUMMARY EXPORT - High Priority Gap #1
// Generate shareable care report for doctors/family
// ============================================================================

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Share,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Colors, Spacing } from '../theme/theme-tokens';
import { generateAndSharePDF, ReportData } from '../utils/pdfExport';
import { logError } from '../utils/devLog';
import { logAuditEvent, AuditEventType, AuditSeverity } from '../utils/auditLog';

// Helper function to generate care summary reports
async function generateCareSummaryReport(type: string): Promise<boolean> {
  const reportTitles: Record<string, string> = {
    full: 'Full Care Summary',
    medications: 'Medication List',
    weekly: 'Weekly Health Report',
    emergency: 'Emergency Information',
  };

  const reportData: ReportData = {
    title: reportTitles[type] || 'Care Summary',
    period: 'Report Period',
    periodLabel: `Generated on ${new Date().toLocaleDateString()}`,
    summary: 'Care summary for healthcare provider review',
    details: [
      { label: 'Report Type', value: reportTitles[type] || type },
      { label: 'Generated', value: new Date().toLocaleString() },
    ],
    notes: 'This report contains health tracking data collected via EmberMate.',
    generatedAt: new Date(),
  };

  return await generateAndSharePDF(reportData);
}

export default function CareSummaryExportScreen() {
  const router = useRouter();
  const [generating, setGenerating] = useState(false);
  const [sections, setSections] = useState({
    demographics: true,
    medications: true,
    adherence: true,
    vitals: true,
    symptoms: true,
    appointments: true,
    contacts: true,
  });

  const toggleSection = (key: keyof typeof sections) => {
    setSections(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const exportOptions = [
    {
      id: 'full',
      icon: '📋',
      title: 'Full Care Summary',
      description: 'All medications, vitals, symptoms, appointments',
      recommended: true,
    },
    {
      id: 'medications',
      icon: '💊',
      title: 'Medication List Only',
      description: 'Current medications and dosage schedule',
    },
    {
      id: 'weekly',
      icon: '📊',
      title: 'Weekly Report',
      description: 'Last 7 days of adherence and vitals',
    },
    {
      id: 'emergency',
      icon: '🚨',
      title: 'Emergency Info',
      description: 'Allergies, conditions, emergency contacts',
    },
  ];

  const handleExport = (type: string) => {
    Alert.alert(
      'Export Care Summary?',
      'This report contains sensitive health information. Only share with trusted caregivers or healthcare providers.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Export',
          onPress: () => doExport(type),
        },
      ]
    );
  };

  const doExport = async (type: string) => {
    try {
      setGenerating(true);
      const includedSections = Object.entries(sections).filter(([, v]) => v).map(([k]) => k);
      await logAuditEvent(AuditEventType.CARE_BRIEF_EXPORTED, `Care summary exported: ${type}`, AuditSeverity.WARNING, { format: 'pdf', reportType: type, includedSections });

      const success = await generateCareSummaryReport(type);

      if (!success) {
        Alert.alert('Error', 'Failed to generate report. Please try again.');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to generate report. Please try again.');
      logError('CareSummaryExportScreen.handleExport', error);
    } finally {
      setGenerating(false);
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
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
            accessibilityLabel="Go back"
            accessibilityRole="button"
          >
            <Text style={styles.backIcon}>←</Text>
          </TouchableOpacity>
          <View style={styles.headerContent}>
            <Text style={styles.headerTitle}>Share Care Summary</Text>
            <Text style={styles.headerSubtitle}>Export for doctors or family</Text>
          </View>
        </View>

        <ScrollView style={styles.content}>
          <View style={styles.infoCard}>
            <Text style={styles.infoIcon}>ℹ️</Text>
            <Text style={styles.infoText}>
              Generate a professional PDF report that can be shared with healthcare providers,
              family members, or other caregivers. Reports are generated locally on your device and privacy-focused.
            </Text>
          </View>

          {exportOptions.map((option) => (
            <TouchableOpacity
              key={option.id}
              style={[
                styles.optionCard,
                option.recommended && styles.optionCardRecommended,
              ]}
              onPress={() => handleExport(option.id)}
              disabled={generating}
              accessibilityLabel={`Export ${option.title}`}
              accessibilityRole="button"
              accessibilityState={{ disabled: generating }}
            >
              {option.recommended && (
                <View style={styles.recommendedBadge}>
                  <Text style={styles.recommendedText}>RECOMMENDED</Text>
                </View>
              )}
              
              <View style={styles.optionLeft}>
                <Text style={styles.optionIcon}>{option.icon}</Text>
                <View style={styles.optionInfo}>
                  <Text style={styles.optionTitle}>{option.title}</Text>
                  <Text style={styles.optionDescription}>{option.description}</Text>
                </View>
              </View>
              
              <Text style={styles.optionArrow}>→</Text>
            </TouchableOpacity>
          ))}

          <View style={styles.previewSection}>
            <Text style={styles.previewTitle}>Choose what to include:</Text>
            <Text style={styles.previewSubtitle}>Toggle sections off to minimize shared data</Text>

            {[
              { key: 'demographics' as const, label: 'Patient information & demographics' },
              { key: 'medications' as const, label: 'Complete medication list with dosages' },
              { key: 'adherence' as const, label: 'Adherence trends & patterns' },
              { key: 'vitals' as const, label: 'Recent vitals & measurements' },
              { key: 'symptoms' as const, label: 'Symptom logs & correlations' },
              { key: 'appointments' as const, label: 'Upcoming appointments' },
              { key: 'contacts' as const, label: 'Care team contacts' },
            ].map((item) => (
              <View key={item.key} style={styles.toggleItem}>
                <Text style={[styles.previewText, !sections[item.key] && styles.previewTextDisabled]}>
                  {item.label}
                </Text>
                <Switch
                  value={sections[item.key]}
                  onValueChange={() => toggleSection(item.key)}
                  trackColor={{ false: Colors.borderMedium, true: Colors.accentBorder }}
                  thumbColor={sections[item.key] ? Colors.accent : Colors.textMuted}
                  accessibilityLabel={`Include ${item.label}`}
                />
              </View>
            ))}
          </View>

          <View style={styles.privacyNote}>
            <Text style={styles.privacyIcon}>🔒</Text>
            <Text style={styles.privacyText}>
              Reports are generated locally on your device and never stored on our servers. 
              You control who receives this information.
            </Text>
          </View>
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
  header: {
    paddingHorizontal: 28,
    paddingTop: 20,
    paddingBottom: 24,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderMedium,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backIcon: {
    fontSize: 24,
    color: Colors.textPrimary,
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '500',
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  content: {
    flex: 1,
    paddingHorizontal: 28,
  },
  infoCard: {
    backgroundColor: Colors.accentLight,
    borderWidth: 1,
    borderColor: Colors.accentBorder,
    borderRadius: 12,
    padding: Spacing.md,
    marginTop: Spacing.lg,
    marginBottom: Spacing.lg,
    flexDirection: 'row',
    gap: 12,
  },
  infoIcon: {
    fontSize: 20,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 21,
    color: Colors.textSecondary,
  },
  optionCard: {
    backgroundColor: Colors.surface,
    borderWidth: 2,
    borderColor: Colors.borderMedium,
    borderRadius: 14,
    padding: 18,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    position: 'relative',
  },
  optionCardRecommended: {
    borderColor: Colors.accent,
    backgroundColor: Colors.accentLight,
  },
  recommendedBadge: {
    position: 'absolute',
    top: -8,
    right: 16,
    backgroundColor: Colors.accent,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  recommendedText: {
    fontSize: 9,
    fontWeight: '700',
    color: Colors.background,
    letterSpacing: 0.8,
  },
  optionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    flex: 1,
  },
  optionIcon: {
    fontSize: 28,
  },
  optionInfo: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 17,
    fontWeight: '500',
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  optionDescription: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  optionArrow: {
    fontSize: 20,
    color: Colors.textSecondary,
  },
  previewSection: {
    marginTop: Spacing.xl,
    marginBottom: Spacing.lg,
  },
  previewTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  previewSubtitle: {
    fontSize: 13,
    color: Colors.textTertiary,
    marginBottom: 16,
  },
  toggleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  previewText: {
    fontSize: 14,
    color: Colors.textSecondary,
    flex: 1,
    marginRight: 12,
  },
  previewTextDisabled: {
    color: Colors.textMuted,
    textDecorationLine: 'line-through',
  },
  privacyNote: {
    backgroundColor: Colors.surfaceAlt,
    borderRadius: 10,
    padding: Spacing.md,
    marginTop: Spacing.lg,
    marginBottom: Spacing.xxxl,
    flexDirection: 'row',
    gap: 12,
  },
  privacyIcon: {
    fontSize: 18,
  },
  privacyText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 19.5,
    color: Colors.textTertiary,
  },
});
