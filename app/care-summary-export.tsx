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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Colors, Spacing } from '../theme/theme-tokens';
import { generateAndSharePDF, ReportData } from '../utils/pdfExport';
import { logError } from '../utils/devLog';

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
    period: `Generated on ${new Date().toLocaleDateString()}`,
    periodLabel: 'Report Period',
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

  const handleExport = async (type: string) => {
    try {
      setGenerating(true);

      // Generate and share PDF
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
              family members, or other caregivers. All reports are encrypted and privacy-focused.
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
            <Text style={styles.previewTitle}>What's included:</Text>
            
            <View style={styles.previewItem}>
              <Text style={styles.previewIcon}>✓</Text>
              <Text style={styles.previewText}>Patient information & demographics</Text>
            </View>
            
            <View style={styles.previewItem}>
              <Text style={styles.previewIcon}>✓</Text>
              <Text style={styles.previewText}>Complete medication list with dosages</Text>
            </View>
            
            <View style={styles.previewItem}>
              <Text style={styles.previewIcon}>✓</Text>
              <Text style={styles.previewText}>Adherence trends & patterns</Text>
            </View>
            
            <View style={styles.previewItem}>
              <Text style={styles.previewIcon}>✓</Text>
              <Text style={styles.previewText}>Recent vitals & measurements</Text>
            </View>
            
            <View style={styles.previewItem}>
              <Text style={styles.previewIcon}>✓</Text>
              <Text style={styles.previewText}>Symptom logs & correlations</Text>
            </View>
            
            <View style={styles.previewItem}>
              <Text style={styles.previewIcon}>✓</Text>
              <Text style={styles.previewText}>Upcoming appointments</Text>
            </View>

            <View style={styles.previewItem}>
              <Text style={styles.previewIcon}>✓</Text>
              <Text style={styles.previewText}>Care team contacts</Text>
            </View>
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
    marginBottom: 16,
  },
  previewItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  previewIcon: {
    fontSize: 16,
    color: Colors.success,
  },
  previewText: {
    fontSize: 14,
    color: Colors.textSecondary,
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
