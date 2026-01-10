// ============================================================================
// CORRELATION TEST SCREEN
// Admin tool to generate/clear sample data for correlation testing
// Access via: /correlation-test
// ============================================================================

import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Platform, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Spacing, BorderRadius } from './_theme/theme-tokens';
import { generateSampleCorrelationData, clearSampleCorrelationData, hasSampleData } from '../utils/sampleDataGenerator';
import { detectCorrelations, hasSufficientData, clearCorrelationCache } from '../utils/correlationDetector';

export default function CorrelationTestScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<string>('');
  const [dataExists, setDataExists] = useState(false);

  React.useEffect(() => {
    checkData();
  }, []);

  const checkData = async () => {
    const exists = await hasSampleData();
    const sufficient = await hasSufficientData();
    setDataExists(exists);
    setStatus(exists ? `Sample data exists (sufficient: ${sufficient})` : 'No sample data');
  };

  const handleGenerateData = async () => {
    try {
      setLoading(true);
      setStatus('Generating 30 days of sample data...');
      
      await generateSampleCorrelationData();
      await clearCorrelationCache(); // Clear cache so it recalculates
      
      setStatus('✅ Sample data generated successfully!');
      await checkData();
      
      Alert.alert(
        'Success',
        '30 days of sample data generated with intentional correlations:\n\n' +
        '• Pain & Hydration (~-0.6)\n' +
        '• Mood & Sleep (~+0.7)\n' +
        '• Fatigue & Med Adherence (~-0.5)\n\n' +
        'Go to Insights → Patterns Detected to see results.',
        [{ text: 'OK' }]
      );
    } catch (error) {
      console.error('Error generating sample data:', error);
      setStatus('❌ Error generating data');
      Alert.alert('Error', 'Failed to generate sample data');
    } finally {
      setLoading(false);
    }
  };

  const handleClearData = async () => {
    Alert.alert(
      'Clear Sample Data',
      'This will remove all generated symptom logs, daily tracking, and medication logs. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              setStatus('Clearing all sample data...');
              
              await clearSampleCorrelationData();
              await clearCorrelationCache();
              
              setStatus('✅ All sample data cleared');
              await checkData();
            } catch (error) {
              console.error('Error clearing data:', error);
              setStatus('❌ Error clearing data');
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleTestCorrelations = async () => {
    try {
      setLoading(true);
      setStatus('Running correlation analysis...');
      
      const sufficient = await hasSufficientData();
      if (!sufficient) {
        Alert.alert('Insufficient Data', 'Need at least 14 days of tracking data to run correlation analysis.');
        setStatus('❌ Insufficient data for analysis');
        return;
      }
      
      const patterns = await detectCorrelations();
      
      setStatus(`✅ Found ${patterns.length} correlation patterns`);
      
      if (patterns.length > 0) {
        const patternsText = patterns.map(p => 
          `• ${p.variable1} & ${p.variable2}: ${(p.coefficient * 100).toFixed(0)}% (${p.confidence} confidence)`
        ).join('\n');
        
        Alert.alert(
          'Correlation Results',
          `Detected ${patterns.length} patterns:\n\n${patternsText}\n\nView full report in Insights → Patterns Detected`,
          [{ text: 'OK' }]
        );
      } else {
        Alert.alert('No Patterns', 'No significant correlations detected with current data.');
      }
    } catch (error) {
      console.error('Error testing correlations:', error);
      setStatus('❌ Error running analysis');
      Alert.alert('Error', 'Failed to analyze correlations');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <LinearGradient colors={[Colors.backgroundGradientStart, Colors.backgroundGradientEnd]} style={styles.gradient}>
        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <Text style={styles.backIcon}>←</Text>
            </TouchableOpacity>
            <View style={styles.headerContent}>
              <Text style={styles.headerTitle}>Correlation Test</Text>
              <Text style={styles.headerSubtitle}>Admin tool for testing</Text>
            </View>
          </View>

          {/* Content */}
          <View style={styles.content}>

            {/* Status Card */}
            <View style={styles.statusCard}>
              <Ionicons name="information-circle" size={20} color="#3B82F6" style={{ marginRight: 8 }} />
              <View style={{ flex: 1 }}>
                <Text style={styles.statusLabel}>Current Status</Text>
                <Text style={styles.statusText}>{status || 'Ready'}</Text>
              </View>
            </View>

            {/* Actions */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>DATA GENERATION</Text>
              
              <TouchableOpacity
                style={[styles.actionButton, styles.primaryButton]}
                onPress={handleGenerateData}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <>
                    <Ionicons name="add-circle" size={20} color="#FFF" />
                    <Text style={styles.actionButtonText}>Generate Sample Data</Text>
                  </>
                )}
              </TouchableOpacity>
              
              <Text style={styles.helperText}>
                Creates 30 days of synthetic data with intentional correlations for testing
              </Text>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>ANALYSIS</Text>
              
              <TouchableOpacity
                style={[styles.actionButton, styles.secondaryButton]}
                onPress={handleTestCorrelations}
                disabled={loading || !dataExists}
              >
                <Ionicons name="analytics" size={20} color={Colors.accent} />
                <Text style={[styles.actionButtonText, { color: Colors.accent }]}>
                  Test Correlation Detection
                </Text>
              </TouchableOpacity>
              
              <Text style={styles.helperText}>
                Runs correlation analysis on current data and shows results
              </Text>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>DATA MANAGEMENT</Text>
              
              <TouchableOpacity
                style={[styles.actionButton, styles.dangerButton]}
                onPress={handleClearData}
                disabled={loading || !dataExists}
              >
                <Ionicons name="trash" size={20} color="#EF4444" />
                <Text style={[styles.actionButtonText, { color: '#EF4444' }]}>
                  Clear All Sample Data
                </Text>
              </TouchableOpacity>
              
              <Text style={styles.helperText}>
                Removes all generated symptom logs, tracking data, and medication logs
              </Text>
            </View>

            {/* Info Card */}
            <View style={styles.infoCard}>
              <Text style={styles.infoTitle}>Expected Correlations</Text>
              <Text style={styles.infoText}>
                Sample data includes these intentional patterns:{'\n\n'}
                • Pain & Hydration: ~-0.6 (negative){'\n'}
                • Mood & Sleep: ~+0.7 (positive){'\n'}
                • Fatigue & Med Adherence: ~-0.5 (negative){'\n\n'}
                After generating data, go to:{'\n'}
                Insights → Patterns Detected → View Report
              </Text>
            </View>

            <View style={{ height: 40 }} />
          </View>
        </ScrollView>
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  gradient: { flex: 1 },
  scrollView: { flex: 1, paddingHorizontal: Spacing.xl },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: Platform.OS === 'android' ? 20 : 0,
    paddingBottom: Spacing.lg,
    gap: Spacing.md,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  headerSubtitle: {
    fontSize: 13,
    color: Colors.textMuted,
  },

  // Content
  content: {
    paddingBottom: Spacing.xxl,
  },

  // Status Card
  statusCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    borderLeftWidth: 4,
    borderLeftColor: '#3B82F6',
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.xl,
  },
  statusLabel: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    color: Colors.textMuted,
    marginBottom: 4,
  },
  statusText: {
    fontSize: 14,
    color: Colors.textPrimary,
  },

  // Section
  section: {
    marginBottom: Spacing.xxl,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
    color: Colors.textPrimary,
    marginBottom: Spacing.lg,
  },

  // Action Buttons
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.sm,
  },
  primaryButton: {
    backgroundColor: Colors.accent,
  },
  secondaryButton: {
    backgroundColor: 'rgba(212, 165, 116, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(212, 165, 116, 0.3)',
  },
  dangerButton: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
  },
  helperText: {
    fontSize: 13,
    color: Colors.textMuted,
    lineHeight: 18,
    marginBottom: Spacing.lg,
  },

  // Info Card
  infoCard: {
    backgroundColor: 'rgba(45, 59, 45, 0.3)',
    borderWidth: 1,
    borderColor: 'rgba(212, 165, 116, 0.2)',
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
  },
  infoText: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
});
