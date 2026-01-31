// ============================================================================
// CORRELATION REPORT SCREEN
// Insights drill-down - analytical, not declarative
// Shows detected patterns with qualified language only
// 100% local processing - no database, no cloud
// ============================================================================

import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Spacing, BorderRadius } from '../theme/theme-tokens';
import { detectCorrelations, hasSufficientData, DetectedPattern } from '../utils/correlationDetector';

export default function CorrelationReportScreen() {
  const router = useRouter();
  const [patterns, setPatterns] = useState<DetectedPattern[]>([]);
  const [sufficient, setSufficient] = useState(false);
  const [loading, setLoading] = useState(true);

  useFocusEffect(useCallback(() => {
    loadCorrelations();
  }, []));

  const loadCorrelations = async () => {
    try {
      setLoading(true);
      
      // Check data sufficiency
      const hasSufficient = await hasSufficientData();
      setSufficient(hasSufficient);
      
      if (hasSufficient) {
        // Detect correlations (all local processing)
        const detected = await detectCorrelations();
        setPatterns(detected);
      }
    } catch (error) {
      console.error('Error loading correlations:', error);
    } finally {
      setLoading(false);
    }
  };

  const getConfidenceBadgeColor = (confidence: string) => {
    switch (confidence) {
      case 'high': return '#22C55E';
      case 'moderate': return '#F59E0B';
      case 'low': return '#94A3B8';
      default: return '#94A3B8';
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
              <Text style={styles.headerTitle}>Correlation Report</Text>
              <Text style={styles.headerSubtitle}>Pattern analysis from tracked data</Text>
            </View>
          </View>

          {/* Content */}
          <View style={styles.content}>

            {/* Important Disclaimer (Always Visible) */}
            <View style={styles.disclaimer}>
              <Ionicons name="information-circle" size={20} color="#3B82F6" style={{ marginRight: 8 }} />
              <Text style={styles.disclaimerText}>
                Correlations show observations, not causes. Always discuss patterns with your care team before making decisions.
              </Text>
            </View>

            {/* Loading State */}
            {loading && (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={Colors.accent} />
                <Text style={styles.loadingText}>Analyzing patterns...</Text>
              </View>
            )}

            {/* Insufficient Data State */}
            {!loading && !sufficient && (
              <View style={styles.insufficientData}>
                <Ionicons name="calendar-outline" size={64} color={Colors.textMuted} style={{ opacity: 0.3, marginBottom: 16 }} />
                <Text style={styles.insufficientTitle}>Insufficient Data</Text>
                <Text style={styles.insufficientText}>
                  Pattern analysis requires at least 14 days of consistent tracking across 2 or more categories.
                </Text>
                <Text style={styles.insufficientEncouragement}>
                  Keep logging daily to unlock insights.
                </Text>
              </View>
            )}

            {/* Detected Patterns */}
            {!loading && sufficient && patterns.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>DETECTED PATTERNS</Text>
                <Text style={styles.sectionSubtitle}>
                  Based on {patterns[0]?.dataPoints || 0}+ days of tracked data
                </Text>

                {patterns.map((pattern, index) => (
                  <View key={pattern.id} style={styles.patternCard}>
                    {/* Pattern Header */}
                    <View style={styles.patternHeader}>
                      <Text style={styles.patternName}>
                        {pattern.variable1.charAt(0).toUpperCase() + pattern.variable1.slice(1)} & {pattern.variable2.charAt(0).toUpperCase() + pattern.variable2.slice(1)}
                      </Text>
                      <View style={[styles.confidenceBadge, { backgroundColor: `${getConfidenceBadgeColor(pattern.confidence)}20` }]}>
                        <Text style={[styles.confidenceText, { color: getConfidenceBadgeColor(pattern.confidence) }]}>
                          {pattern.confidence} confidence
                        </Text>
                      </View>
                    </View>

                    {/* Insight (Qualified Language) */}
                    <Text style={styles.patternInsight}>{pattern.insight}</Text>

                    {/* Action (Tracking-Focused) */}
                    <View style={styles.patternAction}>
                      <Ionicons name="analytics-outline" size={16} color={Colors.textMuted} style={{ marginRight: 6 }} />
                      <Text style={styles.patternActionText}>{pattern.action}</Text>
                    </View>

                    {/* Correlation Strength Indicator */}
                    <View style={styles.strengthIndicator}>
                      <Text style={styles.strengthLabel}>Correlation strength:</Text>
                      <View style={styles.strengthBar}>
                        <View 
                          style={[
                            styles.strengthFill, 
                            { 
                              width: `${Math.abs(pattern.coefficient) * 100}%`,
                              backgroundColor: Math.abs(pattern.coefficient) > 0.6 ? '#22C55E' : '#F59E0B'
                            }
                          ]} 
                        />
                      </View>
                      <Text style={styles.strengthValue}>
                        {(Math.abs(pattern.coefficient) * 100).toFixed(0)}%
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            )}

            {/* No Patterns Detected */}
            {!loading && sufficient && patterns.length === 0 && (
              <View style={styles.noPatterns}>
                <Ionicons name="checkmark-circle-outline" size={64} color={Colors.textMuted} style={{ opacity: 0.3, marginBottom: 16 }} />
                <Text style={styles.noPatternsTitle}>No Strong Patterns Detected</Text>
                <Text style={styles.noPatternsText}>
                  Your tracked data shows no significant correlations at this time. Continue tracking to see if patterns emerge.
                </Text>
              </View>
            )}

            {/* Chart Placeholder */}
            {!loading && sufficient && patterns.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>TREND VISUALIZATION</Text>
                <View style={styles.chartPlaceholder}>
                  <Ionicons name="bar-chart" size={48} color={Colors.textMuted} style={{ opacity: 0.3, marginBottom: 12 }} />
                  <Text style={styles.chartPlaceholderText}>
                    Multi-line trend chart will display here
                  </Text>
                  <Text style={styles.chartPlaceholderNote}>
                    (Requires chart library integration)
                  </Text>
                </View>
              </View>
            )}

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

  // Disclaimer
  disclaimer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    borderLeftWidth: 4,
    borderLeftColor: '#3B82F6',
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.xl,
  },
  disclaimerText: {
    flex: 1,
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 20,
  },

  // Loading
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    marginTop: Spacing.lg,
    fontSize: 14,
    color: Colors.textMuted,
  },

  // Insufficient Data
  insufficientData: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: Spacing.xl,
  },
  insufficientTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
  },
  insufficientText: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: Spacing.lg,
  },
  insufficientEncouragement: {
    fontSize: 13,
    color: Colors.accent,
    fontWeight: '600',
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
    marginBottom: Spacing.xs,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: Colors.textMuted,
    marginBottom: Spacing.lg,
  },

  // Pattern Card
  patternCard: {
    backgroundColor: 'rgba(45, 59, 45, 0.3)',
    borderWidth: 1,
    borderColor: 'rgba(212, 165, 116, 0.3)',
    borderLeftWidth: 4,
    borderLeftColor: Colors.accent,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
  },
  patternHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  patternName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textPrimary,
    flex: 1,
  },
  confidenceBadge: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 12,
  },
  confidenceText: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  patternInsight: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 22,
    marginBottom: Spacing.md,
  },
  patternAction: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(45, 59, 45, 0.5)',
    padding: Spacing.md,
    borderRadius: BorderRadius.sm,
    marginBottom: Spacing.md,
  },
  patternActionText: {
    flex: 1,
    fontSize: 12,
    color: Colors.textMuted,
    lineHeight: 18,
  },
  strengthIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  strengthLabel: {
    fontSize: 11,
    color: Colors.textMuted,
    textTransform: 'uppercase',
  },
  strengthBar: {
    flex: 1,
    height: 6,
    backgroundColor: 'rgba(45, 59, 45, 0.5)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  strengthFill: {
    height: '100%',
    borderRadius: 3,
  },
  strengthValue: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textPrimary,
  },

  // No Patterns
  noPatterns: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: Spacing.xl,
  },
  noPatternsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
  },
  noPatternsText: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },

  // Chart Placeholder
  chartPlaceholder: {
    backgroundColor: 'rgba(45, 59, 45, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(212, 165, 116, 0.2)',
    borderRadius: BorderRadius.lg,
    padding: Spacing.xxl,
    alignItems: 'center',
    minHeight: 250,
    justifyContent: 'center',
  },
  chartPlaceholderText: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  chartPlaceholderNote: {
    fontSize: 12,
    color: Colors.textMuted,
    fontStyle: 'italic',
  },
});
