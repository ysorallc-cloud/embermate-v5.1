// ============================================================================
// CORRELATION INSIGHTS REPORT
// V3: AI-discovered health patterns
// ============================================================================

import React, { useState } from 'react';
import { View, ScrollView, StyleSheet, TouchableOpacity, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { AuroraBackground } from '../../../components/aurora/AuroraBackground';
import { GlassCard } from '../../../components/aurora/GlassCard';
import { PageHeader } from '../../../components/aurora/PageHeader';
import { Colors, Spacing, Typography, BorderRadius } from '../../../theme/theme-tokens';

// Sample correlation data
const SAMPLE_CORRELATIONS = [
  {
    id: 1,
    type: 'strong',
    confidence: 87,
    icon: '💊',
    title: 'Late evening meds → Morning fatigue',
    summary: 'Taking medication after 9 PM correlates with lower energy the next morning',
    color: Colors.amber,
    recommendation: 'Try taking evening medication by 8:30 PM to improve morning energy levels.',
    evidence: [
      { date: 'Jan 14', event: 'Med at 9:45 PM → Fatigue 6/10 next morning' },
      { date: 'Jan 12', event: 'Med at 9:30 PM → Fatigue 7/10 next morning' },
      { date: 'Jan 9', event: 'Med at 8:15 PM → Energy 8/10 next morning' },
    ],
  },
  {
    id: 2,
    type: 'strong',
    confidence: 82,
    icon: '💧',
    title: 'Hydration → Pain levels',
    summary: 'Days with lower water intake show 40% higher pain scores',
    color: Colors.sky,
    recommendation: 'Aim for consistent hydration throughout the day, especially mornings.',
    evidence: [
      { date: 'Jan 15', event: '4 glasses → Pain 3/10' },
      { date: 'Jan 13', event: '2 glasses → Pain 6/10' },
      { date: 'Jan 11', event: '5 glasses → Pain 2/10' },
    ],
  },
  {
    id: 3,
    type: 'moderate',
    confidence: 68,
    icon: '😴',
    title: 'Sleep quality → BP stability',
    summary: 'Poor sleep nights show 15% higher morning blood pressure',
    color: Colors.purple,
    recommendation: 'Focus on sleep hygiene on nights before medical readings.',
    evidence: [
      { date: 'Jan 14', event: 'Sleep 4 hrs → BP 142/88' },
      { date: 'Jan 10', event: 'Sleep 7 hrs → BP 128/82' },
    ],
  },
  {
    id: 4,
    type: 'emerging',
    confidence: 55,
    icon: '🥗',
    title: 'Meal timing → Glucose stability',
    summary: 'Regular meal schedule correlates with more stable readings',
    color: Colors.green,
    recommendation: 'Try to eat meals within the same 2-hour window each day.',
    evidence: [
      { date: 'Jan 16', event: 'Regular meals → Glucose 105-118' },
      { date: 'Jan 12', event: 'Irregular meals → Glucose 98-142' },
    ],
  },
];

export default function CorrelationReport() {
  const router = useRouter();
  const [timeRange, setTimeRange] = useState<'7' | '14' | '30'>('30');
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const getTypeColor = (type: string) => {
    if (type === 'strong') return Colors.green;
    if (type === 'moderate') return Colors.amber;
    return Colors.textMuted;
  };

  const getTypeLabel = (type: string) => {
    if (type === 'strong') return 'Strong Pattern';
    if (type === 'moderate') return 'Moderate Pattern';
    return 'Emerging Pattern';
  };

  return (
    <View style={styles.container}>
      <AuroraBackground variant="insights" />

      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          <PageHeader
            category="THE BIGGER PICTURE"
            title="Health Insights"
            onBack={() => router.back()}
            actionIcon="📤"
            onAction={() => {/* Share insights */}}
          />

          {/* Time Range Selector */}
          <View style={styles.timeRangeRow}>
            {['7', '14', '30'].map((range) => (
              <TouchableOpacity
                key={range}
                style={[
                  styles.timeRangeButton,
                  timeRange === range && styles.timeRangeButtonActive,
                ]}
                onPress={() => setTimeRange(range as '7' | '14' | '30')}
                activeOpacity={0.7}
              >
                <Text style={[
                  styles.timeRangeText,
                  timeRange === range && styles.timeRangeTextActive,
                ]}>
                  {range} Days
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Health Score */}
          <GlassCard style={styles.scoreCard}>
            <View style={styles.scoreContent}>
              <View style={styles.scoreCircle}>
                <Text style={styles.scoreValue}>78</Text>
                <Text style={styles.scoreLabel}>Health Score</Text>
              </View>
              <View style={styles.scoreTrend}>
                <Text style={styles.scoreTrendValue}>↑ +5</Text>
                <Text style={styles.scoreTrendLabel}>this month</Text>
              </View>
            </View>
          </GlassCard>

          {/* The Story */}
          <GlassCard style={styles.storyCard}>
            <View style={styles.storyHeader}>
              <Text style={styles.storyIcon}>📖</Text>
              <Text style={styles.storyTitle}>The Story</Text>
            </View>
            <Text style={styles.storyHeadline}>Overall Improving Trend</Text>
            <Text style={styles.storySummary}>
              Pain down 27%, mood up 20%. Key factors: better hydration, consistent medication timing, improved sleep quality.
            </Text>
          </GlassCard>

          {/* Correlations */}
          <Text style={styles.sectionTitle}>DISCOVERED CORRELATIONS ({SAMPLE_CORRELATIONS.length})</Text>

          {SAMPLE_CORRELATIONS.map((corr) => (
            <TouchableOpacity
              key={corr.id}
              onPress={() => setExpandedId(expandedId === corr.id ? null : corr.id)}
              activeOpacity={0.7}
            >
              <GlassCard style={styles.correlationCard}>
                <View style={styles.correlationHeader}>
                  <View style={[styles.correlationIcon, { backgroundColor: `${corr.color}15` }]}>
                    <Text style={styles.correlationIconText}>{corr.icon}</Text>
                  </View>
                  <View style={styles.correlationContent}>
                    <View style={styles.correlationTitleRow}>
                      <Text style={styles.correlationTitle}>{corr.title}</Text>
                      <View style={[styles.typeBadge, { backgroundColor: getTypeColor(corr.type) }]}>
                        <Text style={styles.typeBadgeText}>{corr.confidence}%</Text>
                      </View>
                    </View>
                    <Text style={styles.correlationSummary}>{corr.summary}</Text>
                  </View>
                </View>

                {expandedId === corr.id && (
                  <View style={styles.correlationExpanded}>
                    <View style={styles.divider} />

                    <Text style={styles.recommendationTitle}>💡 Recommendation</Text>
                    <Text style={styles.recommendationText}>{corr.recommendation}</Text>

                    <Text style={styles.evidenceTitle}>Evidence ({corr.evidence.length} data points)</Text>
                    {corr.evidence.map((e, i) => (
                      <View key={i} style={styles.evidenceRow}>
                        <View style={styles.evidenceDot} />
                        <View style={styles.evidenceContent}>
                          <Text style={styles.evidenceDate}>{e.date}</Text>
                          <Text style={styles.evidenceEvent}>{e.event}</Text>
                        </View>
                      </View>
                    ))}
                  </View>
                )}
              </GlassCard>
            </TouchableOpacity>
          ))}

          {/* Info Footer */}
          <GlassCard style={styles.infoCard}>
            <View style={styles.infoContent}>
              <Text style={styles.infoIcon}>ℹ️</Text>
              <Text style={styles.infoText}>
                Correlations are discovered patterns in your data. They suggest connections worth exploring with your healthcare provider.
              </Text>
            </View>
          </GlassCard>

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

  // Time Range
  timeRangeRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.xxl,
  },
  timeRangeButton: {
    flex: 1,
    backgroundColor: Colors.glass,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.md,
    alignItems: 'center',
  },
  timeRangeButtonActive: {
    backgroundColor: `${Colors.accent}20`,
    borderColor: Colors.accentBorder,
  },
  timeRangeText: {
    ...Typography.bodySmall,
    color: Colors.textSecondary,
  },
  timeRangeTextActive: {
    color: Colors.accent,
    fontWeight: '600',
  },

  // Health Score
  scoreCard: {
    marginBottom: Spacing.xxl,
  },
  scoreContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xxl,
  },
  scoreCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: `${Colors.accent}15`,
    borderWidth: 3,
    borderColor: Colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreValue: {
    ...Typography.displayMedium,
    color: Colors.accent,
    fontWeight: '600',
  },
  scoreLabel: {
    ...Typography.captionSmall,
    color: Colors.textMuted,
  },
  scoreTrend: {
    flex: 1,
  },
  scoreTrendValue: {
    ...Typography.h1,
    color: Colors.green,
    marginBottom: 4,
  },
  scoreTrendLabel: {
    ...Typography.bodySmall,
    color: Colors.textSecondary,
  },

  // Story
  storyCard: {
    backgroundColor: `${Colors.purple}08`,
    borderColor: `${Colors.purple}20`,
    marginBottom: Spacing.xxl,
  },
  storyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  storyIcon: {
    fontSize: 20,
  },
  storyTitle: {
    ...Typography.label,
    color: Colors.purple,
  },
  storyHeadline: {
    ...Typography.h2,
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
  },
  storySummary: {
    ...Typography.body,
    color: Colors.textSecondary,
    lineHeight: 24,
  },

  // Section
  sectionTitle: {
    ...Typography.caption,
    color: Colors.textMuted,
    marginBottom: Spacing.md,
  },

  // Correlations
  correlationCard: {
    marginBottom: Spacing.md,
  },
  correlationHeader: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  correlationIcon: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  correlationIconText: {
    fontSize: 24,
  },
  correlationContent: {
    flex: 1,
  },
  correlationTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: 4,
  },
  correlationTitle: {
    ...Typography.body,
    color: Colors.textPrimary,
    fontWeight: '500',
    flex: 1,
  },
  typeBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: 6,
  },
  typeBadgeText: {
    ...Typography.captionSmall,
    color: Colors.textPrimary,
    fontWeight: '600',
  },
  correlationSummary: {
    ...Typography.bodySmall,
    color: Colors.textSecondary,
    lineHeight: 20,
  },

  // Expanded
  correlationExpanded: {
    marginTop: Spacing.lg,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.borderLight,
    marginBottom: Spacing.lg,
  },
  recommendationTitle: {
    ...Typography.label,
    color: Colors.amber,
    marginBottom: Spacing.sm,
  },
  recommendationText: {
    ...Typography.bodySmall,
    color: Colors.textPrimary,
    lineHeight: 22,
    marginBottom: Spacing.lg,
  },
  evidenceTitle: {
    ...Typography.label,
    color: Colors.textMuted,
    marginBottom: Spacing.sm,
  },
  evidenceRow: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginBottom: Spacing.sm,
  },
  evidenceDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.accent,
    marginTop: 6,
  },
  evidenceContent: {
    flex: 1,
  },
  evidenceDate: {
    ...Typography.labelSmall,
    color: Colors.textMuted,
  },
  evidenceEvent: {
    ...Typography.bodySmall,
    color: Colors.textSecondary,
  },

  // Info
  infoCard: {
    backgroundColor: `${Colors.sky}08`,
    borderColor: `${Colors.sky}20`,
    marginTop: Spacing.lg,
  },
  infoContent: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  infoIcon: {
    fontSize: 20,
  },
  infoText: {
    ...Typography.bodySmall,
    color: Colors.textSecondary,
    flex: 1,
    lineHeight: 20,
  },
});
