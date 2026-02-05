// ============================================================================
// DATA & PRIVACY SETTINGS
// Manage sample data, export data, and privacy controls
// ============================================================================

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { Colors, Spacing, BorderRadius } from '../theme/theme-tokens';
import {
  detectSampleData,
  clearSampleData,
  SampleDataStatus,
} from '../utils/sampleDataManager';

// Components
import { AuroraBackground } from '../components/aurora/AuroraBackground';
import { BackButton } from '../components/common/BackButton';

export default function DataPrivacySettingsScreen() {
  const router = useRouter();
  const [sampleDataStatus, setSampleDataStatus] = useState<SampleDataStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [clearing, setClearing] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loadStatus();
    }, [])
  );

  const loadStatus = async () => {
    setLoading(true);
    try {
      const status = await detectSampleData();
      setSampleDataStatus(status);
    } catch (error) {
      console.error('Error loading sample data status:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleClearSampleData = () => {
    if (!sampleDataStatus?.hasSampleData) return;

    Alert.alert(
      'Remove Sample Data?',
      `This will permanently remove ${sampleDataStatus.totalSampleRecords} sample records while preserving all data you've created.\n\nThis cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove Sample Data',
          style: 'destructive',
          onPress: performClear,
        },
      ]
    );
  };

  const performClear = async () => {
    setClearing(true);
    try {
      const result = await clearSampleData();

      if (result.success) {
        Alert.alert(
          'Sample Data Removed',
          `Successfully removed ${result.clearedCount} sample records. Your personal data is untouched.`,
          [{ text: 'OK', onPress: loadStatus }]
        );
      } else {
        Alert.alert(
          'Partial Removal',
          `Removed ${result.clearedCount} records. Some items could not be removed: ${result.errors.join(', ')}`,
          [{ text: 'OK', onPress: loadStatus }]
        );
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to remove sample data. Please try again.');
    } finally {
      setClearing(false);
    }
  };

  // Format count for display
  const formatCount = (count: number, singular: string, plural?: string): string => {
    const p = plural || `${singular}s`;
    return `${count} ${count === 1 ? singular : p}`;
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <AuroraBackground variant="settings" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.accent} />
          <Text style={styles.loadingText}>Analyzing data...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <AuroraBackground variant="settings" />

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          {/* Header */}
          <View style={styles.header}>
            <BackButton variant="text" />
          </View>

          <Text style={styles.headerLabel}>SETTINGS</Text>
          <Text style={styles.title}>Data & Privacy</Text>

          {/* Privacy Statement */}
          <View style={styles.privacyCard}>
            <Text style={styles.privacyIcon}>🔒</Text>
            <View style={styles.privacyContent}>
              <Text style={styles.privacyTitle}>Your data stays on your device</Text>
              <Text style={styles.privacyText}>
                EmberMate stores all health data locally. Nothing is uploaded without your explicit action.
              </Text>
            </View>
          </View>

          {/* Sample Data Section */}
          <View style={styles.section}>
            <Text style={styles.sectionHeader}>SAMPLE DATA</Text>
            <Text style={styles.sectionDescription}>
              Demo data included to help you explore the app
            </Text>

            <View style={styles.settingCard}>
              {sampleDataStatus?.hasSampleData ? (
                <>
                  {/* Sample Data Found */}
                  <View style={styles.sampleDataInfo}>
                    <View style={styles.sampleDataHeader}>
                      <Text style={styles.sampleDataIcon}>📊</Text>
                      <Text style={styles.sampleDataTitle}>Sample data detected</Text>
                    </View>
                    <Text style={styles.sampleDataSubtitle}>
                      {formatCount(sampleDataStatus.totalSampleRecords, 'demo record')} found
                    </Text>

                    {/* Breakdown */}
                    <View style={styles.breakdown}>
                      {sampleDataStatus.counts.medications > 0 && (
                        <View style={styles.breakdownItem}>
                          <Text style={styles.breakdownIcon}>💊</Text>
                          <Text style={styles.breakdownText}>
                            {formatCount(sampleDataStatus.counts.medications, 'medication')}
                          </Text>
                        </View>
                      )}
                      {sampleDataStatus.counts.vitals > 0 && (
                        <View style={styles.breakdownItem}>
                          <Text style={styles.breakdownIcon}>❤️</Text>
                          <Text style={styles.breakdownText}>
                            {formatCount(sampleDataStatus.counts.vitals, 'vital reading')}
                          </Text>
                        </View>
                      )}
                      {sampleDataStatus.counts.moodLogs > 0 && (
                        <View style={styles.breakdownItem}>
                          <Text style={styles.breakdownIcon}>😊</Text>
                          <Text style={styles.breakdownText}>
                            {formatCount(sampleDataStatus.counts.moodLogs, 'mood log')}
                          </Text>
                        </View>
                      )}
                      {sampleDataStatus.counts.appointments > 0 && (
                        <View style={styles.breakdownItem}>
                          <Text style={styles.breakdownIcon}>📅</Text>
                          <Text style={styles.breakdownText}>
                            {formatCount(sampleDataStatus.counts.appointments, 'appointment')}
                          </Text>
                        </View>
                      )}
                      {sampleDataStatus.counts.caregivers > 0 && (
                        <View style={styles.breakdownItem}>
                          <Text style={styles.breakdownIcon}>👥</Text>
                          <Text style={styles.breakdownText}>
                            {formatCount(sampleDataStatus.counts.caregivers, 'care team member')}
                          </Text>
                        </View>
                      )}
                      {sampleDataStatus.counts.dailyTracking > 0 && (
                        <View style={styles.breakdownItem}>
                          <Text style={styles.breakdownIcon}>📈</Text>
                          <Text style={styles.breakdownText}>
                            {formatCount(sampleDataStatus.counts.dailyTracking, 'daily tracking record')}
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>

                  <View style={styles.settingDivider} />

                  {/* Clear Button */}
                  <TouchableOpacity
                    style={styles.clearButton}
                    onPress={handleClearSampleData}
                    disabled={clearing}
                    activeOpacity={0.7}
                  >
                    {clearing ? (
                      <ActivityIndicator size="small" color={Colors.error} />
                    ) : (
                      <>
                        <Text style={styles.clearButtonIcon}>🗑️</Text>
                        <Text style={styles.clearButtonText}>Remove sample data</Text>
                      </>
                    )}
                  </TouchableOpacity>

                  <Text style={styles.clearNote}>
                    Removes demo content only. Your personal data will be preserved.
                  </Text>
                </>
              ) : (
                /* No Sample Data */
                <View style={styles.noSampleData}>
                  <Text style={styles.noSampleDataIcon}>✓</Text>
                  <View style={styles.noSampleDataContent}>
                    <Text style={styles.noSampleDataTitle}>No sample data</Text>
                    <Text style={styles.noSampleDataText}>
                      All data in the app was created by you.
                    </Text>
                  </View>
                </View>
              )}
            </View>
          </View>

          {/* Data Management Section */}
          <View style={styles.section}>
            <Text style={styles.sectionHeader}>DATA MANAGEMENT</Text>
            <Text style={styles.sectionDescription}>
              Control your health data
            </Text>

            <View style={styles.settingCard}>
              {/* Export Data */}
              <TouchableOpacity
                style={styles.settingRow}
                onPress={() => router.push('/daily-care-report')}
                activeOpacity={0.7}
              >
                <View style={styles.settingInfo}>
                  <View style={styles.settingTitleRow}>
                    <Text style={styles.settingIcon}>📤</Text>
                    <Text style={styles.settingLabel}>Export daily report</Text>
                  </View>
                  <Text style={styles.settingHint}>Share a summary with your care team</Text>
                </View>
                <Text style={styles.settingChevron}>›</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>
              Questions about your data? Contact support.
            </Text>
          </View>

          <View style={{ height: 40 }} />
        </View>
      </ScrollView>
    </SafeAreaView>
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
  content: {
    padding: Spacing.xl,
    paddingTop: 0,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: Colors.textSecondary,
  },

  // Header
  header: {
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  headerLabel: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.5)',
    letterSpacing: 1,
    fontWeight: '600',
    marginBottom: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: '300',
    color: '#FFFFFF',
    marginBottom: Spacing.lg,
  },

  // Privacy Card
  privacyCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(94, 234, 212, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(94, 234, 212, 0.2)',
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.xl,
    gap: 12,
  },
  privacyIcon: {
    fontSize: 20,
  },
  privacyContent: {
    flex: 1,
  },
  privacyTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#5EEAD4',
    marginBottom: 4,
  },
  privacyText: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.7)',
    lineHeight: 18,
  },

  // Sections
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.5)',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  sectionDescription: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.6)',
    marginBottom: 12,
  },

  // Setting Card
  settingCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    overflow: 'hidden',
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
  },
  settingInfo: {
    flex: 1,
    marginRight: Spacing.md,
  },
  settingTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 2,
  },
  settingIcon: {
    fontSize: 18,
  },
  settingLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  settingHint: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.5)',
    marginLeft: 26,
  },
  settingChevron: {
    fontSize: 20,
    color: 'rgba(255, 255, 255, 0.3)',
    fontWeight: '600',
  },
  settingDivider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    marginHorizontal: 14,
  },

  // Sample Data Info
  sampleDataInfo: {
    padding: 14,
  },
  sampleDataHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  sampleDataIcon: {
    fontSize: 18,
  },
  sampleDataTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  sampleDataSubtitle: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.6)',
    marginBottom: 12,
    marginLeft: 26,
  },
  breakdown: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 8,
    padding: 10,
    gap: 6,
  },
  breakdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  breakdownIcon: {
    fontSize: 14,
    width: 20,
    textAlign: 'center',
  },
  breakdownText: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.7)',
  },

  // Clear Button
  clearButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(239, 68, 68, 0.15)',
    padding: 14,
    marginTop: 0,
  },
  clearButtonIcon: {
    fontSize: 16,
  },
  clearButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#EF4444',
  },
  clearNote: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.4)',
    textAlign: 'center',
    paddingHorizontal: 14,
    paddingBottom: 12,
    paddingTop: 8,
  },

  // No Sample Data
  noSampleData: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 12,
  },
  noSampleDataIcon: {
    fontSize: 20,
    color: '#10B981',
  },
  noSampleDataContent: {
    flex: 1,
  },
  noSampleDataTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  noSampleDataText: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.5)',
  },

  // Footer
  footer: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  footerText: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.4)',
  },
});
