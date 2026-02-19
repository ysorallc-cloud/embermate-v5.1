// ============================================================================
// TRENDS OVER TIME
// Visual representation of health metrics changing over time
// Shows sample data for new users, real data when available
// ============================================================================

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Colors, Spacing, BorderRadius } from '../theme/theme-tokens';
import { AuroraBackground } from '../components/aurora/AuroraBackground';
import { GlassCard } from '../components/aurora/GlassCard';
import { BackButton } from '../components/common/BackButton';
import { getDailyTrackingLogs } from '../utils/dailyTrackingStorage';
import { getMedicationLogs } from '../utils/medicationStorage';
import { logError } from '../utils/devLog';

// ============================================================================
// TYPES
// ============================================================================

interface TrendPoint {
  date: string;
  label: string;
  value: number;
}

interface TrendData {
  id: string;
  title: string;
  emoji: string;
  color: string;
  unit: string;
  points: TrendPoint[];
  average: number;
  change: number; // percentage change from start to end
  changeLabel: string;
}

type TimeRange = 7 | 14 | 30;

// ============================================================================
// SAMPLE DATA
// ============================================================================

const SAMPLE_TRENDS: TrendData[] = [
  {
    id: 'mood',
    title: 'Mood',
    emoji: '😊',
    color: Colors.purpleBright,
    unit: '/10',
    points: [
      { date: '2024-01-13', label: 'Sat', value: 8 },
      { date: '2024-01-14', label: 'Sun', value: 7 },
      { date: '2024-01-15', label: 'Mon', value: 6 },
      { date: '2024-01-16', label: 'Tue', value: 8 },
    ],
    average: 7.3,
    change: 33,
    changeLabel: 'Improving trend',
  },
  {
    id: 'energy',
    title: 'Energy',
    emoji: '⚡',
    color: Colors.amberBright,
    unit: '/10',
    points: [
      { date: '2024-01-13', label: 'Sat', value: 7 },
      { date: '2024-01-14', label: 'Sun', value: 6 },
      { date: '2024-01-15', label: 'Mon', value: 5 },
      { date: '2024-01-16', label: 'Tue', value: 7 },
    ],
    average: 6.3,
    change: 40,
    changeLabel: 'Higher on weekends',
  },
  {
    id: 'pain',
    title: 'Pain Level',
    emoji: '🩹',
    color: Colors.redBright,
    unit: '/10',
    points: [
      { date: '2024-01-13', label: 'Sat', value: 2 },
      { date: '2024-01-14', label: 'Sun', value: 3 },
      { date: '2024-01-15', label: 'Mon', value: 4 },
      { date: '2024-01-16', label: 'Tue', value: 2 },
    ],
    average: 2.8,
    change: -50,
    changeLabel: 'Decreasing trend',
  },
];

// ============================================================================
// MINI CHART COMPONENT
// ============================================================================

interface MiniChartProps {
  points: TrendPoint[];
  color: string;
  maxValue?: number;
}

function MiniChart({ points, color, maxValue }: MiniChartProps) {
  const max = maxValue || Math.max(...points.map(p => p.value), 10);
  const chartHeight = 60;
  const barWidth = 100 / points.length;

  return (
    <View style={styles.chartContainer}>
      <View style={styles.chartBars}>
        {points.map((point, index) => {
          const height = (point.value / max) * chartHeight;
          return (
            <View key={index} style={[styles.barContainer, { width: `${barWidth}%` }]}>
              <View
                style={[
                  styles.bar,
                  {
                    height,
                    backgroundColor: color,
                    opacity: 0.3 + (index / points.length) * 0.7,
                  },
                ]}
              />
              <Text style={styles.barLabel}>{point.label}</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

// ============================================================================
// TREND CARD COMPONENT
// ============================================================================

interface TrendCardProps {
  trend: TrendData;
}

function TrendCard({ trend }: TrendCardProps) {
  const isPositive = trend.change > 0;
  const isNegative = trend.change < 0;
  // For pain, negative change is good
  const isPainMetric = trend.id === 'pain';
  const changeColor = isPainMetric
    ? (isNegative ? Colors.greenBright : isPositive ? Colors.redBright : Colors.textMuted)
    : (isPositive ? Colors.greenBright : isNegative ? Colors.redBright : Colors.textMuted);

  return (
    <GlassCard style={styles.trendCard}>
      <View style={styles.trendHeader}>
        <View style={styles.trendTitleRow}>
          <Text style={styles.trendEmoji}>{trend.emoji}</Text>
          <Text style={styles.trendTitle}>{trend.title}</Text>
        </View>
        <View style={styles.trendStats}>
          <Text style={styles.trendAverage}>
            {trend.average.toFixed(1)}{trend.unit}
          </Text>
          <Text style={styles.trendAverageLabel}>avg</Text>
        </View>
      </View>

      <MiniChart
        points={trend.points}
        color={trend.color}
        maxValue={trend.id === 'medAdherence' ? 100 : 10}
      />

      <View style={styles.trendFooter}>
        <View style={[styles.changeBadge, { backgroundColor: `${changeColor}20` }]}>
          <Text style={[styles.changeText, { color: changeColor }]}>
            {isPositive ? '↑' : isNegative ? '↓' : '→'} {Math.abs(trend.change)}%
          </Text>
        </View>
        <Text style={styles.changeLabel}>{trend.changeLabel}</Text>
      </View>
    </GlassCard>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function TrendsScreen() {
  const [loading, setLoading] = useState(true);
  const [trends, setTrends] = useState<TrendData[]>([]);
  const [timeRange, setTimeRange] = useState<TimeRange>(7);
  const [showingSample, setShowingSample] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loadTrends();
    }, [timeRange])
  );

  const loadTrends = async () => {
    try {
      setLoading(true);

      // Calculate date range
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - timeRange);

      const startDateStr = startDate.toISOString().split('T')[0];
      const endDateStr = endDate.toISOString().split('T')[0];

      // Load tracking data
      const trackingLogs = await getDailyTrackingLogs(startDateStr, endDateStr);
      const medLogs = await getMedicationLogs();

      // Check if we have enough data
      const hasData = trackingLogs.length >= 3;

      if (!hasData) {
        // Show sample data
        setTrends(SAMPLE_TRENDS);
        setShowingSample(true);
      } else {
        // Build real trends from data
        const realTrends = buildTrendsFromData(trackingLogs, medLogs, timeRange);
        setTrends(realTrends.length > 0 ? realTrends : SAMPLE_TRENDS);
        setShowingSample(realTrends.length === 0);
      }
    } catch (error) {
      logError('TrendsScreen.loadTrends', error);
      setTrends(SAMPLE_TRENDS);
      setShowingSample(true);
    } finally {
      setLoading(false);
    }
  };

  const buildTrendsFromData = (
    trackingLogs: any[],
    medLogs: any[],
    range: TimeRange
  ): TrendData[] => {
    const trends: TrendData[] = [];
    const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    // Helper to get day label
    const getDayLabel = (dateStr: string) => {
      const date = new Date(dateStr);
      return dayLabels[date.getDay()];
    };

    // Build mood trend
    const moodLogs = trackingLogs.filter(l => l.mood !== null && l.mood !== undefined);
    if (moodLogs.length >= 3) {
      const points = moodLogs.slice(-7).map(l => ({
        date: l.date,
        label: getDayLabel(l.date),
        value: l.mood,
      }));
      const avg = points.reduce((s, p) => s + p.value, 0) / points.length;
      const change = points.length > 1
        ? Math.round(((points[points.length - 1].value - points[0].value) / points[0].value) * 100)
        : 0;

      trends.push({
        id: 'mood',
        title: 'Mood',
        emoji: '😊',
        color: Colors.purpleBright,
        unit: '/10',
        points,
        average: avg,
        change,
        changeLabel: change > 0 ? 'Improving' : change < 0 ? 'Declining' : 'Stable',
      });
    }

    // Build energy trend
    const energyLogs = trackingLogs.filter(l => l.energy !== null && l.energy !== undefined);
    if (energyLogs.length >= 3) {
      const points = energyLogs.slice(-7).map(l => ({
        date: l.date,
        label: getDayLabel(l.date),
        value: l.energy,
      }));
      const avg = points.reduce((s, p) => s + p.value, 0) / points.length;
      const change = points.length > 1
        ? Math.round(((points[points.length - 1].value - points[0].value) / points[0].value) * 100)
        : 0;

      trends.push({
        id: 'energy',
        title: 'Energy',
        emoji: '⚡',
        color: Colors.amberBright,
        unit: '/10',
        points,
        average: avg,
        change,
        changeLabel: change > 0 ? 'Improving' : change < 0 ? 'Declining' : 'Stable',
      });
    }

    // Build pain trend
    const painLogs = trackingLogs.filter(l => l.pain !== null && l.pain !== undefined);
    if (painLogs.length >= 3) {
      const points = painLogs.slice(-7).map(l => ({
        date: l.date,
        label: getDayLabel(l.date),
        value: l.pain,
      }));
      const avg = points.reduce((s, p) => s + p.value, 0) / points.length;
      const change = points.length > 1
        ? Math.round(((points[points.length - 1].value - points[0].value) / points[0].value) * 100)
        : 0;

      trends.push({
        id: 'pain',
        title: 'Pain Level',
        emoji: '🩹',
        color: Colors.redBright,
        unit: '/10',
        points,
        average: avg,
        change,
        changeLabel: change < 0 ? 'Decreasing' : change > 0 ? 'Increasing' : 'Stable',
      });
    }

    // Build hydration trend
    const hydrationLogs = trackingLogs.filter(l => l.hydration !== null && l.hydration !== undefined);
    if (hydrationLogs.length >= 3) {
      const points = hydrationLogs.slice(-7).map(l => ({
        date: l.date,
        label: getDayLabel(l.date),
        value: l.hydration,
      }));
      const avg = points.reduce((s, p) => s + p.value, 0) / points.length;
      const change = points.length > 1
        ? Math.round(((points[points.length - 1].value - points[0].value) / Math.max(points[0].value, 1)) * 100)
        : 0;

      trends.push({
        id: 'hydration',
        title: 'Hydration',
        emoji: '💧',
        color: Colors.skyBright,
        unit: ' glasses',
        points,
        average: avg,
        change,
        changeLabel: avg >= 7 ? 'Meeting goals' : 'Below target',
      });
    }

    return trends;
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <AuroraBackground variant="hub" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.accent} />
          <Text style={styles.loadingText}>Loading trends...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <AuroraBackground variant="hub" />

      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.header}>
            <BackButton />
            <View style={styles.headerText}>
              <Text style={styles.headerTitle}>Trends Over Time</Text>
              <Text style={styles.headerSubtitle}>See how metrics change</Text>
            </View>
          </View>

          {/* Sample Data Banner */}
          {showingSample && (
            <View style={styles.sampleBanner}>
              <View style={styles.sampleBannerContent}>
                <Text style={styles.sampleBannerIcon}>✨</Text>
                <View style={styles.sampleBannerText}>
                  <Text style={styles.sampleBannerTitle}>Preview Mode</Text>
                  <Text style={styles.sampleBannerSubtitle}>
                    This is sample data. Track for a few days to see your real trends.
                  </Text>
                </View>
              </View>
            </View>
          )}

          {/* Time Range Selector */}
          <View style={styles.timeRangeRow}>
            {([7, 14, 30] as TimeRange[]).map((range) => (
              <TouchableOpacity
                key={range}
                style={[
                  styles.timeRangeButton,
                  timeRange === range && styles.timeRangeButtonActive,
                ]}
                onPress={() => setTimeRange(range)}
                activeOpacity={0.7}
                accessibilityLabel={`${range} day range`}
                accessibilityRole="radio"
                accessibilityState={{ selected: timeRange === range }}
              >
                <Text style={[
                  styles.timeRangeText,
                  timeRange === range && styles.timeRangeTextActive,
                ]}>
                  {range}d
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Trend Cards */}
          <View style={styles.trendsGrid}>
            {trends.map((trend) => (
              <TrendCard key={trend.id} trend={trend} />
            ))}
          </View>

          {/* Insight Footer */}
          <View style={styles.insightFooter}>
            <Text style={styles.insightIcon}>💡</Text>
            <Text style={styles.insightText}>
              Trends help identify patterns over time. Discuss significant changes with your care team.
            </Text>
          </View>

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
    padding: Spacing.xl,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.md,
  },
  loadingText: {
    fontSize: 14,
    color: Colors.textSecondary,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginBottom: Spacing.xl,
  },
  headerText: {
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

  // Sample Banner
  sampleBanner: {
    backgroundColor: Colors.purpleLight,
    borderWidth: 1,
    borderColor: Colors.purpleStrong,
    borderRadius: 14,
    padding: 14,
    marginBottom: Spacing.xl,
  },
  sampleBannerContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  sampleBannerIcon: {
    fontSize: 18,
    marginTop: 2,
  },
  sampleBannerText: {
    flex: 1,
  },
  sampleBannerTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.purpleBright,
    marginBottom: 4,
  },
  sampleBannerSubtitle: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 18,
  },

  // Time Range
  timeRangeRow: {
    flexDirection: 'row',
    backgroundColor: Colors.glassHover,
    borderRadius: 10,
    padding: 4,
    gap: 4,
    marginBottom: Spacing.xl,
  },
  timeRangeButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
  },
  timeRangeButtonActive: {
    backgroundColor: Colors.sageWash,
  },
  timeRangeText: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.textHalf,
  },
  timeRangeTextActive: {
    color: Colors.accent,
  },

  // Trends Grid
  trendsGrid: {
    gap: Spacing.md,
  },

  // Trend Card
  trendCard: {
    padding: Spacing.lg,
    backgroundColor: Colors.glassFaint,
    borderColor: Colors.glassActive,
    borderWidth: 1,
  },
  trendHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.md,
  },
  trendTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  trendEmoji: {
    fontSize: 20,
  },
  trendTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  trendStats: {
    alignItems: 'flex-end',
  },
  trendAverage: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  trendAverageLabel: {
    fontSize: 11,
    color: Colors.textMuted,
  },

  // Chart
  chartContainer: {
    marginBottom: Spacing.md,
  },
  chartBars: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: 70,
    gap: 2,
  },
  barContainer: {
    alignItems: 'center',
    justifyContent: 'flex-end',
    height: '100%',
  },
  bar: {
    width: '80%',
    borderRadius: 4,
    minHeight: 4,
  },
  barLabel: {
    fontSize: 9,
    color: Colors.textMuted,
    marginTop: 4,
  },

  // Footer
  trendFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  changeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  changeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  changeLabel: {
    fontSize: 12,
    color: Colors.textMuted,
  },

  // Insight Footer
  insightFooter: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    backgroundColor: Colors.blueFaint,
    borderWidth: 1,
    borderColor: Colors.blueWash,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginTop: Spacing.xl,
  },
  insightIcon: {
    fontSize: 16,
  },
  insightText: {
    flex: 1,
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
});
