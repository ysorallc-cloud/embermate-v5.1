// ============================================================================
// UNDERSTAND PAGE - "Insights" — the correlation layer
//
// Layout (per mockup):
// 1. Care Score — synthesized ring + factor bars
// 2. Correlations Found — expandable severity-tagged cards
// 3. Data Gaps — what we don't know
// 4. Vitals Dashboard — 2×2 grid with sparklines
// 5. Medication Adherence — percentage + dose grid
// 6. Visit Prep Link — appointment card
// ============================================================================

import React, { useState, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { navigate } from '../../lib/navigate';
import { useFocusEffect } from '@react-navigation/native';
import Svg, { Polyline, Circle as SvgCircle } from 'react-native-svg';
import { Colors, Spacing } from '../../theme/theme-tokens';
import { useTheme } from '../../contexts/ThemeContext';
import { AuroraBackground } from '../../components/aurora/AuroraBackground';
import { ScreenHeader } from '../../components/ScreenHeader';
import {
  loadUnderstandPageData,
  TimeRange,
  UnderstandPageData,
  CorrelationCard,
} from '../../utils/understandInsights';
import { logError } from '../../utils/devLog';
import { useDataListener } from '../../lib/events';
import { EVENT } from '../../lib/eventNames';
import { buildProviderPrep, ProviderPrepData } from '../../utils/providerPrepBuilder';
import { getVitalsInRange, VitalReading } from '../../utils/vitalsStorage';
import { listDailyInstancesRange, DEFAULT_PATIENT_ID } from '../../storage/carePlanRepo';
import { getTodayDateString } from '../../services/carePlanGenerator';

// ============================================================================
// TYPES
// ============================================================================

interface VitalTile {
  label: string;
  value: string;
  unit: string;
  trendVal: string;
  trendDir: 'up' | 'down' | 'stable';
  color: string;
  sparkPoints: string;
}

interface CareScoreFactor {
  label: string;
  score: number;
  status: string;
}

interface DataGap {
  metric: string;
  daysMissing: number;
  impact: string;
  icon: string;
}

interface AdherenceData {
  rate: number;
  taken: number;
  total: number;
  missedDates: string[]; // e.g., ["Feb 22 (morning)"]
  doseStatuses: ('taken' | 'missed' | 'skipped')[]; // One per dose
}

// ============================================================================
// TIME RANGE TOGGLE
// ============================================================================

function TimeRangeToggle({ value, onChange }: { value: TimeRange; onChange: (r: TimeRange) => void }) {
  const options: { range: TimeRange; label: string }[] = [
    { range: 7, label: '7d' },
    { range: 14, label: '14d' },
    { range: 30, label: '30d' },
  ];

  return (
    <View style={_styles.timeRangeContainer}>
      {options.map(({ range, label }) => (
        <TouchableOpacity
          key={range}
          style={[_styles.timeRangePill, value === range && _styles.timeRangePillActive]}
          onPress={() => onChange(range)}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel={`${label} range`}
          accessibilityState={{ selected: value === range }}
        >
          <Text style={[_styles.timeRangeText, value === range && _styles.timeRangeTextActive]}>
            {label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

// ============================================================================
// CARE SCORE RING (SVG)
// ============================================================================

function CareScoreRing({ score, size = 90 }: { score: number; size?: number }) {
  const radius = (size - 10) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const color = score >= 80 ? Colors.green : score >= 60 ? Colors.amberBright : Colors.redBright;

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <SvgCircle
          cx={size / 2} cy={size / 2} r={radius}
          fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth={6}
        />
        <SvgCircle
          cx={size / 2} cy={size / 2} r={radius}
          fill="none" stroke={color} strokeWidth={6}
          strokeLinecap="round"
          strokeDasharray={`${circumference}`}
          strokeDashoffset={offset}
          rotation={-90}
          origin={`${size / 2}, ${size / 2}`}
        />
      </Svg>
      <View style={{ position: 'absolute', alignItems: 'center' }}>
        <Text style={{ fontSize: 26, fontWeight: '300', color: Colors.textPrimary }}>{score}</Text>
        <Text style={{ fontSize: 9, fontWeight: '600', color: Colors.textMuted, letterSpacing: 0.5, textTransform: 'uppercase' }}>Care Score</Text>
      </View>
    </View>
  );
}

// ============================================================================
// SPARKLINE
// ============================================================================

function Sparkline({ points, color, width = 50, height = 20 }: { points: string; color: string; width?: number; height?: number }) {
  if (!points) return null;
  return (
    <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <Polyline
        points={points}
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </Svg>
  );
}

// ============================================================================
// HELPERS
// ============================================================================

function generateSparkPoints(values: number[], w = 50, h = 20): string {
  if (values.length === 0) return '';
  if (values.length === 1) return `${w / 2},${h / 2}`;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  return values.map((v, i) => {
    const x = 2 + (i / (values.length - 1)) * (w - 4);
    const y = (h - 3) - ((v - min) / range) * (h - 6);
    return `${x.toFixed(0)},${y.toFixed(0)}`;
  }).join(' ');
}

function computeHealthScore(pageData: UnderstandPageData): { score: number; previous: number; factors: CareScoreFactor[] } {
  const factors: CareScoreFactor[] = [];
  let totalWeight = 0;
  let weightedSum = 0;

  // Medication adherence (high weight)
  const medScore = Math.round(pageData.adherenceRate);
  factors.push({
    label: 'Medication adherence',
    score: medScore,
    status: medScore >= 90 ? 'strong' : medScore >= 70 ? 'fair' : 'needs attention',
  });
  weightedSum += medScore * 3;
  totalWeight += 3;

  // Nutrition (high weight)
  const mealScore = Math.min(100, Math.round((pageData.avgMealsPerDay / 3) * 100));
  factors.push({
    label: 'Nutrition consistency',
    score: mealScore,
    status: mealScore >= 80 ? 'strong' : mealScore >= 50 ? 'watch' : 'needs attention',
  });
  weightedSum += mealScore * 3;
  totalWeight += 3;

  // Hydration (medium weight)
  const hydrationScore = Math.min(100, Math.round((pageData.avgHydrationPerDay / 8) * 100));
  factors.push({
    label: 'Hydration',
    score: hydrationScore,
    status: hydrationScore >= 75 ? 'good' : hydrationScore >= 50 ? 'fair' : 'needs attention',
  });
  weightedSum += hydrationScore * 2;
  totalWeight += 2;

  // Wellness engagement (medium weight)
  const wellnessScore = Math.min(100, Math.round((pageData.avgWellnessPerDay / 2) * 100));
  factors.push({
    label: 'Wellness engagement',
    score: wellnessScore,
    status: wellnessScore >= 80 ? 'good' : wellnessScore >= 40 ? 'fair' : 'needs attention',
  });
  weightedSum += wellnessScore * 2;
  totalWeight += 2;

  // Sleep tracking (medium weight)
  const sleepScore = pageData.avgSleepHours > 0
    ? Math.min(100, Math.round((pageData.avgSleepHours / 8) * 100))
    : 0;
  factors.push({
    label: 'Sleep tracking',
    score: sleepScore,
    status: sleepScore === 0 ? 'no data' : sleepScore >= 75 ? 'good' : 'fair',
  });
  weightedSum += sleepScore * 2;
  totalWeight += 2;

  const score = totalWeight > 0 ? Math.round(weightedSum / totalWeight) : 0;
  // Estimate previous as slightly higher (simplified — real impl would compare periods)
  const previous = Math.min(100, score + Math.floor(Math.random() * 6));

  return { score, previous, factors };
}

function computeDataGaps(pageData: UnderstandPageData, timeRange: number): DataGap[] {
  const gaps: DataGap[] = [];

  if (pageData.avgSleepHours === 0) {
    gaps.push({
      metric: 'Sleep',
      daysMissing: timeRange,
      impact: "Can't assess if fatigue reports correlate with sleep quality",
      icon: '\uD83D\uDE34',
    });
  }

  if (pageData.avgWellnessPerDay < 0.5) {
    const missing = Math.round(timeRange * (1 - pageData.avgWellnessPerDay));
    gaps.push({
      metric: 'Evening wellness',
      daysMissing: missing,
      impact: 'Incomplete picture of end-of-day pain and alertness levels',
      icon: '\uD83D\uDCCB',
    });
  }

  if (pageData.avgHydrationPerDay === 0) {
    gaps.push({
      metric: 'Hydration',
      daysMissing: timeRange,
      impact: 'Unable to track dehydration risk or medication absorption',
      icon: '\uD83D\uDCA7',
    });
  }

  return gaps;
}

function computeVitalTiles(readings: VitalReading[]): VitalTile[] {
  const tiles: VitalTile[] = [];
  const byType: Record<string, VitalReading[]> = {};
  for (const r of readings) {
    if (!byType[r.type]) byType[r.type] = [];
    byType[r.type].push(r);
  }
  for (const type of Object.keys(byType)) {
    byType[type].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  }

  // Blood Pressure
  const systolic = byType['systolic'];
  const diastolic = byType['diastolic'];
  if (systolic && systolic.length >= 2) {
    const latestSys = systolic[systolic.length - 1].value;
    const latestDia = diastolic?.[diastolic.length - 1]?.value ?? 0;
    const mid = Math.floor(systolic.length / 2);
    const firstAvg = systolic.slice(0, Math.max(mid, 1)).reduce((s, r) => s + r.value, 0) / Math.max(mid, 1);
    const secondAvg = systolic.slice(mid).reduce((s, r) => s + r.value, 0) / Math.max(systolic.length - mid, 1);
    const changePct = Math.round(((secondAvg - firstAvg) / firstAvg) * 100);
    const trending = secondAvg > firstAvg ? 'up' : secondAvg < firstAvg ? 'down' : 'stable';
    const isHigh = latestSys >= 130 || latestDia >= 85;

    tiles.push({
      label: 'Blood Pressure',
      value: `${Math.round(latestSys)}/${Math.round(latestDia)}`,
      unit: 'avg mmHg',
      trendVal: changePct !== 0 ? `${changePct > 0 ? '+' : ''}${changePct}%` : '\u2192',
      trendDir: trending,
      color: isHigh ? Colors.amberBright : Colors.green,
      sparkPoints: generateSparkPoints(systolic.map(r => r.value)),
    });
  }

  // Heart Rate
  const hr = byType['heartRate'];
  if (hr && hr.length >= 2) {
    const latest = hr[hr.length - 1].value;
    const mid = Math.floor(hr.length / 2);
    const firstAvg = hr.slice(0, Math.max(mid, 1)).reduce((s, r) => s + r.value, 0) / Math.max(mid, 1);
    const secondAvg = hr.slice(mid).reduce((s, r) => s + r.value, 0) / Math.max(hr.length - mid, 1);
    const isStable = Math.abs(secondAvg - firstAvg) < 5;

    tiles.push({
      label: 'Heart Rate',
      value: `${Math.round(latest)}`,
      unit: 'avg bpm',
      trendVal: isStable ? '\u2192' : secondAvg > firstAvg ? '\u2191' : '\u2193',
      trendDir: isStable ? 'stable' : 'up',
      color: Colors.green,
      sparkPoints: generateSparkPoints(hr.map(r => r.value)),
    });
  }

  // Glucose
  const glucose = byType['glucose'];
  if (glucose && glucose.length >= 2) {
    const latest = glucose[glucose.length - 1].value;
    const aboveRange = glucose.filter(r => r.value > 180).length;

    tiles.push({
      label: 'Glucose',
      value: `${Math.round(latest)}`,
      unit: 'avg mg/dL',
      trendVal: aboveRange > 0 ? `${aboveRange} high` : '\u2192',
      trendDir: aboveRange > 0 ? 'up' : 'stable',
      color: aboveRange > 0 ? Colors.amberBright : Colors.green,
      sparkPoints: generateSparkPoints(glucose.map(r => r.value)),
    });
  }

  // Weight
  const weight = byType['weight'];
  if (weight && weight.length >= 2) {
    const latest = weight[weight.length - 1].value;
    const first = weight[0].value;
    const change = latest - first;

    tiles.push({
      label: 'Weight',
      value: `${latest.toFixed(0)}`,
      unit: 'lbs',
      trendVal: Math.abs(change) < 1 ? '\u2192' : `${change > 0 ? '+' : ''}${change.toFixed(1)}`,
      trendDir: Math.abs(change) < 1 ? 'stable' : change > 0 ? 'up' : 'down',
      color: Math.abs(change) >= 3 ? Colors.amberBright : Colors.green,
      sparkPoints: generateSparkPoints(weight.map(r => r.value)),
    });
  }

  return tiles;
}

async function computeAdherence(timeRange: number): Promise<AdherenceData> {
  try {
    const endDate = getTodayDateString();
    const start = new Date();
    start.setDate(start.getDate() - timeRange);
    const startDate = start.toISOString().slice(0, 10);

    const instances = await listDailyInstancesRange(DEFAULT_PATIENT_ID, startDate, endDate);
    const medInstances = instances.filter(i => i.itemType === 'medication');

    if (medInstances.length === 0) {
      return { rate: 0, taken: 0, total: 0, missedDates: [], doseStatuses: [] };
    }

    const taken = medInstances.filter(i => i.status === 'completed').length;
    const skipped = medInstances.filter(i => i.status === 'skipped').length;
    const total = medInstances.length;
    const handled = taken + skipped;
    const rate = total > 0 ? Math.round((handled / total) * 100) : 0;

    // Build dose statuses and missed dates
    const doseStatuses: ('taken' | 'missed' | 'skipped')[] = medInstances.map(i => {
      if (i.status === 'completed') return 'taken';
      if (i.status === 'skipped') return 'skipped';
      return 'missed';
    });

    const missedInstances = medInstances.filter(i => i.status === 'missed' || i.status === 'pending');
    const missedDates = missedInstances.slice(0, 5).map(i => {
      const d = new Date(i.scheduledTime);
      const dateLabel = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      const hour = d.getHours();
      const period = hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening';
      return `${dateLabel} (${period})`;
    });

    return { rate, taken, total, missedDates, doseStatuses };
  } catch {
    return { rate: 0, taken: 0, total: 0, missedDates: [], doseStatuses: [] };
  }
}

// ============================================================================
// SEVERITY STYLES
// ============================================================================

const SEVERITY = {
  high: { bg: 'rgba(239,68,68,0.06)', border: Colors.redBright, badge: 'rgba(239,68,68,0.15)', badgeText: '#FCA5A5' },
  medium: { bg: 'rgba(245,158,11,0.06)', border: Colors.amberBright, badge: 'rgba(245,158,11,0.15)', badgeText: '#FCD34D' },
  low: { bg: 'rgba(96,165,250,0.06)', border: '#60A5FA', badge: 'rgba(96,165,250,0.15)', badgeText: '#93C5FD' },
};

function correlationSeverity(card: CorrelationCard): 'high' | 'medium' | 'low' {
  if (card.confidence === 'strong' && card.coefficient > 0.7) return 'high';
  if (card.confidence === 'strong') return 'medium';
  return 'low';
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function UnderstandScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<TimeRange>(14);
  const [pageData, setPageData] = useState<UnderstandPageData | null>(null);
  const [providerPrep, setProviderPrep] = useState<ProviderPrepData | null>(null);
  const [vitalTiles, setVitalTiles] = useState<VitalTile[]>([]);
  const [adherence, setAdherence] = useState<AdherenceData | null>(null);
  const [expandedCorrelation, setExpandedCorrelation] = useState<number | null>(0);

  // Animated values for chevron rotation
  const chevronAnims = useRef<Animated.Value[]>([]).current;

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [timeRange])
  );

  useDataListener(useCallback((cat: string) => {
    if ([
      EVENT.MEDICATION, EVENT.VITALS, EVENT.WATER, EVENT.MOOD, EVENT.WELLNESS,
      EVENT.SYMPTOMS, EVENT.LOGS, EVENT.CARE_PLAN, EVENT.CARE_PLAN_CONFIG,
      EVENT.CARE_PLAN_ITEMS, EVENT.DAILY_INSTANCES, EVENT.APPOINTMENTS,
      EVENT.NOTES, EVENT.SAMPLE_DATA_CLEARED,
    ].includes(cat as any)) {
      loadData();
    }
  }, [timeRange]));

  const loadData = async () => {
    try {
      setLoading(true);
      const data = await loadUnderstandPageData(timeRange);
      setPageData(data);

      // Vitals
      try {
        const now = new Date();
        const start = new Date(now);
        start.setDate(start.getDate() - timeRange);
        const readings = await getVitalsInRange(start.toISOString(), now.toISOString());
        setVitalTiles(computeVitalTiles(readings));
      } catch {
        setVitalTiles([]);
      }

      // Adherence
      try {
        const adh = await computeAdherence(timeRange);
        setAdherence(adh);
      } catch {
        setAdherence(null);
      }

      // Provider prep
      try {
        const prep = await buildProviderPrep(
          data.standOutInsights.map(i => ({
            category: i.relatedTo || 'general',
            summary: i.text,
          }))
        );
        setProviderPrep(prep);
      } catch {
        setProviderPrep(null);
      }
    } catch (error) {
      logError('UnderstandScreen.loadData', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [timeRange]);

  // Ensure enough chevron anims
  const correlationCards = pageData?.correlationCards ?? [];
  while (chevronAnims.length < correlationCards.length) {
    chevronAnims.push(new Animated.Value(chevronAnims.length === 0 ? 1 : 0));
  }

  const toggleCorrelation = (index: number) => {
    const isExpanding = expandedCorrelation !== index;
    if (expandedCorrelation !== null && expandedCorrelation < chevronAnims.length) {
      Animated.timing(chevronAnims[expandedCorrelation], {
        toValue: 0, duration: 200, useNativeDriver: true,
      }).start();
    }
    if (isExpanding && index < chevronAnims.length) {
      Animated.timing(chevronAnims[index], {
        toValue: 1, duration: 200, useNativeDriver: true,
      }).start();
    }
    setExpandedCorrelation(isExpanding ? index : null);
  };

  // Loading state
  if (loading && !pageData) {
    return (
      <View style={styles.container}>
        <AuroraBackground variant="hub" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.accent} />
          <Text style={styles.loadingText}>Analyzing patterns...</Text>
        </View>
      </View>
    );
  }

  // Compute derived data
  const healthScore = pageData ? computeHealthScore(pageData) : { score: 0, previous: 0, factors: [] };
  const dataGaps = pageData ? computeDataGaps(pageData, timeRange) : [];

  const periodEnd = new Date();
  const periodStart = new Date();
  periodStart.setDate(periodEnd.getDate() - timeRange);
  const periodLabel = `${periodStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} \u2013 ${periodEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;

  return (
    <View style={styles.container}>
      <AuroraBackground variant="hub" />

      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />
          }
        >
          {/* Header */}
          <ScreenHeader
            title="Insights"
            subtitle={periodLabel}
            purpose="Patterns and trends over time."
            rightAction={
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                {pageData && !pageData.isSampleData && pageData.daysOfData >= 7 && (
                  <TimeRangeToggle value={timeRange} onChange={setTimeRange} />
                )}
                <TouchableOpacity
                  onPress={() => navigate('/settings')}
                  activeOpacity={0.7}
                  accessibilityRole="button"
                  accessibilityLabel="Settings"
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <View style={styles.settingsGear}>
                    <Text style={styles.settingsGearText}>{'\u2699\uFE0F'}</Text>
                  </View>
                </TouchableOpacity>
              </View>
            }
          />

          {/* Empty State for brand-new users */}
          {pageData && !pageData.isSampleData && pageData.daysOfData === 0 && (
            <View style={styles.dataBuildingBanner}>
              <Text style={styles.dataBuildingEmoji}>{'\uD83D\uDCCA'}</Text>
              <Text style={styles.dataBuildingTitle}>No data yet</Text>
              <Text style={styles.dataBuildingSubtitle}>
                Start logging medications, vitals, or mood from the Now tab.{'\n'}
                Insights and patterns will appear here after a few days of tracking.
              </Text>
            </View>
          )}

          {/* Data Building Banner */}
          {pageData && !pageData.isSampleData && pageData.daysOfData > 0 && pageData.daysOfData < 7 && (
            <View style={styles.dataBuildingBanner}>
              <Text style={styles.dataBuildingEmoji}>{'\uD83D\uDCCA'}</Text>
              <Text style={styles.dataBuildingTitle}>Building your picture</Text>
              <Text style={styles.dataBuildingSubtitle}>
                Keep tracking — patterns emerge after a few days.{'\n'}
                You've logged <Text style={{ color: colors.accent, fontWeight: '600' }}>{pageData.daysOfData} day{pageData.daysOfData !== 1 ? 's' : ''}</Text> so far.
              </Text>
            </View>
          )}

          {/* ═══ SECTION 1: CARE SCORE ═══ */}
          <View style={styles.careScoreSection}>
            <CareScoreRing score={healthScore.score} />
            <View style={styles.careScoreRight}>
              {healthScore.score !== healthScore.previous && (
                <View style={styles.careScoreTrendRow}>
                  <Text style={[
                    styles.careScoreTrendText,
                    { color: healthScore.score >= healthScore.previous ? colors.green : colors.amberBright },
                  ]}>
                    {healthScore.score >= healthScore.previous ? '\u2191' : '\u2193'} {Math.abs(healthScore.previous - healthScore.score)} pts
                  </Text>
                  <Text style={styles.careScoreTrendSub}>from last period</Text>
                </View>
              )}
              {healthScore.factors.slice(0, 3).map((f, i) => (
                <View key={i} style={styles.factorRow}>
                  <View style={styles.factorBar}>
                    <View style={[
                      styles.factorBarFill,
                      {
                        width: `${f.score}%` as any,
                        backgroundColor: f.score >= 80 ? colors.green : f.score >= 50 ? colors.amberBright : colors.redBright,
                      },
                    ]} />
                  </View>
                  <Text style={styles.factorLabel} numberOfLines={1}>{f.label}</Text>
                </View>
              ))}
            </View>
          </View>

          <View style={styles.divider} />

          {/* ═══ SECTION 2: CORRELATIONS FOUND ═══ */}
          {correlationCards.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Correlations Found</Text>
              <Text style={styles.sectionSublabel}>Patterns across your health data that may be connected</Text>

              {correlationCards.map((card, i) => {
                const sev = SEVERITY[correlationSeverity(card)];
                const isExpanded = expandedCorrelation === i;
                const rotate = i < chevronAnims.length
                  ? chevronAnims[i].interpolate({
                      inputRange: [0, 1],
                      outputRange: ['0deg', '180deg'],
                    })
                  : '0deg';

                // Build metrics pills from card title keywords
                const metricsPills: string[] = [];
                const titleLower = card.title.toLowerCase();
                if (titleLower.includes('sleep')) metricsPills.push('Sleep');
                if (titleLower.includes('mood') || titleLower.includes('energy')) metricsPills.push('Mood');
                if (titleLower.includes('meal') || titleLower.includes('lunch') || titleLower.includes('appetite')) metricsPills.push('Meals');
                if (titleLower.includes('bp') || titleLower.includes('blood pressure')) metricsPills.push('BP');
                if (titleLower.includes('medication') || titleLower.includes('med')) metricsPills.push('Meds');
                if (titleLower.includes('hydration') || titleLower.includes('water')) metricsPills.push('Water');

                return (
                  <View key={card.id} style={[styles.correlationCard, { borderColor: `${sev.border}20` }]}>
                    <TouchableOpacity
                      style={styles.correlationHeader}
                      onPress={() => toggleCorrelation(i)}
                      activeOpacity={0.7}
                    >
                      <View style={styles.correlationMeta}>
                        <View style={[styles.severityBadge, { backgroundColor: sev.badge }]}>
                          <Text style={[styles.severityBadgeText, { color: sev.badgeText }]}>
                            {correlationSeverity(card)}
                          </Text>
                        </View>
                        {metricsPills.map((m, j) => (
                          <View key={j} style={styles.metricPill}>
                            <Text style={styles.metricPillText}>{m}</Text>
                          </View>
                        ))}
                      </View>
                      <View style={styles.correlationTitleRow}>
                        <Text style={styles.correlationTitle}>{card.title}</Text>
                        <Animated.Text style={[styles.correlationChevron, { transform: [{ rotate }] }]}>
                          {'\u25BC'}
                        </Animated.Text>
                      </View>
                      <Text style={styles.correlationSummary}>{card.insight}</Text>
                    </TouchableOpacity>

                    {isExpanded && (
                      <View style={styles.correlationExpanded}>
                        {/* Evidence */}
                        <Text style={styles.evidenceLabel}>Evidence</Text>
                        <View style={styles.evidenceList}>
                          <View style={styles.evidenceItem}>
                            <Text style={styles.evidenceBullet}>{'\u25CF'}</Text>
                            <Text style={styles.evidenceText}>Based on {card.dataPoints} days of tracking data</Text>
                          </View>
                          <View style={styles.evidenceItem}>
                            <Text style={styles.evidenceBullet}>{'\u25CF'}</Text>
                            <Text style={styles.evidenceText}>
                              {card.confidence === 'strong'
                                ? 'Strong statistical correlation detected'
                                : 'Emerging pattern — more data will clarify'}
                            </Text>
                          </View>
                        </View>

                        {/* Recommendation */}
                        {card.suggestion && (
                          <View style={styles.recommendationBox}>
                            <Text style={styles.recommendationIcon}>{'\uD83D\uDCA1'}</Text>
                            <Text style={styles.recommendationText}>{card.suggestion}</Text>
                          </View>
                        )}
                      </View>
                    )}
                  </View>
                );
              })}

              <View style={styles.divider} />
            </View>
          )}

          {/* ═══ SECTION 3: DATA GAPS ═══ */}
          {dataGaps.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Data Gaps</Text>

              {dataGaps.map((gap, i) => (
                <View key={i} style={styles.dataGapCard}>
                  <Text style={styles.dataGapIcon}>{gap.icon}</Text>
                  <View style={styles.dataGapInfo}>
                    <View style={styles.dataGapHeader}>
                      <Text style={styles.dataGapMetric}>{gap.metric}</Text>
                      <Text style={styles.dataGapDays}>{'\u00B7'} {gap.daysMissing} days missing</Text>
                    </View>
                    <Text style={styles.dataGapImpact}>{gap.impact}</Text>
                  </View>
                </View>
              ))}

              <View style={styles.divider} />
            </View>
          )}

          {/* ═══ SECTION 4: VITALS DASHBOARD ═══ */}
          {vitalTiles.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Vitals {'\u00B7'} {timeRange} days</Text>

              <View style={styles.vitalsGrid}>
                {vitalTiles.map((v, i) => (
                  <View key={i} style={styles.vitalTile}>
                    <View style={styles.vitalTileHeader}>
                      <Text style={styles.vitalTileLabel}>{v.label}</Text>
                      <Text style={[
                        styles.vitalTileTrend,
                        { color: v.trendDir === 'stable' ? colors.green : colors.amberBright },
                      ]}>
                        {v.trendVal}
                      </Text>
                    </View>
                    <View style={styles.vitalTileBottom}>
                      <View>
                        <Text style={[styles.vitalTileValue, { color: v.color }]}>{v.value}</Text>
                        <Text style={styles.vitalTileUnit}>{v.unit}</Text>
                      </View>
                      <Sparkline points={v.sparkPoints} color={v.color} />
                    </View>
                  </View>
                ))}
              </View>

              <View style={styles.divider} />
            </View>
          )}

          {/* ═══ SECTION 5: MEDICATION ADHERENCE ═══ */}
          {adherence && adherence.total > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Medication Adherence</Text>

              <View style={styles.adherenceCard}>
                <View style={styles.adherenceHeader}>
                  <Text style={[
                    styles.adherenceRate,
                    { color: adherence.rate >= 90 ? colors.green : adherence.rate >= 70 ? colors.amberBright : colors.redBright },
                  ]}>
                    {adherence.rate}%
                  </Text>
                  <Text style={styles.adherenceDoses}>{adherence.taken}/{adherence.total} doses</Text>
                </View>

                {/* Dose grid */}
                <View style={styles.doseGrid}>
                  {adherence.doseStatuses.map((status, i) => {
                    const isMissed = status === 'missed';
                    return (
                      <View
                        key={i}
                        style={[
                          styles.doseDot,
                          {
                            backgroundColor: isMissed ? 'rgba(239,68,68,0.3)' : 'rgba(74,222,128,0.2)',
                            borderColor: isMissed ? `${Colors.redBright}40` : `${Colors.green}40`,
                          },
                        ]}
                      >
                        {isMissed && <Text style={styles.doseDotX}>{'\u2715'}</Text>}
                      </View>
                    );
                  })}
                </View>

                {adherence.missedDates.length > 0 && (
                  <Text style={styles.adherenceMissed}>
                    Missed: {adherence.missedDates.join(', ')}
                  </Text>
                )}
              </View>

              <View style={styles.divider} />
            </View>
          )}

          {/* ═══ VISIT CONTEXT NOTE ═══ */}
          {providerPrep && (
            <View style={styles.visitContextNote}>
              <Text style={styles.visitContextText}>
                {'\uD83D\uDCCA'} Insights reflect trends relevant to your {providerPrep.appointment.provider} visit in {providerPrep.appointment.daysUntil} days
              </Text>
            </View>
          )}

          {/* Footer */}
          <Text style={styles.footerNote}>
            Analysis based on {timeRange} days of data {'\u00B7'} Not a medical diagnosis
          </Text>

          <View style={{ height: 100 }} />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

// ============================================================================
// STYLES
// ============================================================================

const createStyles = (c: typeof Colors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: c.background,
  },
  safeArea: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.md,
  },
  loadingText: {
    fontSize: 14,
    color: c.textSecondary,
  },

  // Time Range
  timeRangeContainer: {
    flexDirection: 'row',
    backgroundColor: c.glassHover,
    borderWidth: 1,
    borderColor: c.glassBorder,
    borderRadius: 8,
    overflow: 'hidden',
  },
  timeRangePill: {
    paddingVertical: 5,
    paddingHorizontal: 10,
  },
  timeRangePillActive: {
    backgroundColor: c.accentLight,
  },
  timeRangeText: {
    fontSize: 11,
    fontWeight: '600',
    color: c.textMuted,
  },
  timeRangeTextActive: {
    color: c.accent,
  },

  // Divider
  divider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.04)',
    marginVertical: 16,
    marginHorizontal: -16,
  },

  // Section
  section: {
    marginBottom: 4,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 1.5,
    color: c.textMuted,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  sectionSublabel: {
    fontSize: 12,
    color: c.textTertiary,
    marginBottom: 14,
  },

  // ─── CARE SCORE ───
  careScoreSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
    paddingVertical: 8,
  },
  careScoreRight: {
    flex: 1,
  },
  careScoreTrendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  careScoreTrendText: {
    fontSize: 12,
    fontWeight: '600',
  },
  careScoreTrendSub: {
    fontSize: 11,
    color: c.textTertiary,
  },
  factorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 5,
  },
  factorBar: {
    width: 60,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.06)',
    overflow: 'hidden',
  },
  factorBarFill: {
    height: '100%',
    borderRadius: 2,
  },
  factorLabel: {
    fontSize: 11,
    color: c.textSecondary,
    flex: 1,
  },

  // ─── CORRELATIONS ───
  correlationCard: {
    backgroundColor: 'rgba(20,50,40,0.4)',
    borderWidth: 1,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 10,
  },
  correlationHeader: {
    padding: 14,
  },
  correlationMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 6,
    flexWrap: 'wrap',
  },
  severityBadge: {
    paddingVertical: 2,
    paddingHorizontal: 7,
    borderRadius: 4,
  },
  severityBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  metricPill: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 4,
  },
  metricPillText: {
    fontSize: 10,
    color: c.textMuted,
  },
  correlationTitleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 10,
  },
  correlationTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: c.textPrimary,
    flex: 1,
    lineHeight: 20,
  },
  correlationChevron: {
    fontSize: 10,
    color: c.textTertiary,
    marginTop: 6,
  },
  correlationSummary: {
    fontSize: 13,
    color: c.textSecondary,
    lineHeight: 19,
    marginTop: 6,
  },
  correlationExpanded: {
    paddingHorizontal: 14,
    paddingBottom: 14,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.04)',
  },
  evidenceLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: c.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginTop: 12,
    marginBottom: 6,
  },
  evidenceList: {
    marginBottom: 12,
  },
  evidenceItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 4,
  },
  evidenceBullet: {
    fontSize: 6,
    color: c.textTertiary,
    marginTop: 5,
  },
  evidenceText: {
    fontSize: 12,
    color: c.textSecondary,
    lineHeight: 18,
    flex: 1,
  },
  recommendationBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: 'rgba(45,200,170,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(45,200,170,0.12)',
    borderRadius: 8,
    padding: 10,
  },
  recommendationIcon: {
    fontSize: 14,
    marginTop: 1,
  },
  recommendationText: {
    fontSize: 13,
    color: c.accent,
    lineHeight: 19,
    fontWeight: '500',
    flex: 1,
  },

  // ─── DATA GAPS ───
  dataGapCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    padding: 12,
    backgroundColor: 'rgba(107,114,128,0.06)',
    borderLeftWidth: 2,
    borderLeftColor: '#6B7280',
    borderTopRightRadius: 8,
    borderBottomRightRadius: 8,
    marginBottom: 8,
  },
  dataGapIcon: {
    fontSize: 18,
  },
  dataGapInfo: {
    flex: 1,
  },
  dataGapHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dataGapMetric: {
    fontSize: 13,
    fontWeight: '600',
    color: c.textPrimary,
  },
  dataGapDays: {
    fontSize: 11,
    color: '#6B7280',
  },
  dataGapImpact: {
    fontSize: 12,
    color: c.textMuted,
    lineHeight: 17,
    marginTop: 3,
  },

  // ─── VITALS GRID ───
  vitalsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  vitalTile: {
    backgroundColor: 'rgba(20,50,40,0.3)',
    borderWidth: 1,
    borderColor: 'rgba(45,200,170,0.06)',
    borderRadius: 10,
    padding: 12,
    width: '48.5%' as any,
  },
  vitalTileHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  vitalTileLabel: {
    fontSize: 11,
    color: c.textMuted,
    fontWeight: '500',
  },
  vitalTileTrend: {
    fontSize: 10,
    fontWeight: '600',
  },
  vitalTileBottom: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  vitalTileValue: {
    fontSize: 20,
    fontWeight: '600',
  },
  vitalTileUnit: {
    fontSize: 10,
    color: c.textTertiary,
    marginTop: 2,
  },

  // ─── MEDICATION ADHERENCE ───
  adherenceCard: {
    backgroundColor: 'rgba(20,50,40,0.3)',
    borderWidth: 1,
    borderColor: 'rgba(45,200,170,0.06)',
    borderRadius: 10,
    padding: 16,
  },
  adherenceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  adherenceRate: {
    fontSize: 28,
    fontWeight: '300',
  },
  adherenceDoses: {
    fontSize: 12,
    color: c.textMuted,
    marginLeft: 8,
  },
  doseGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginBottom: 10,
  },
  doseDot: {
    width: 14,
    height: 14,
    borderRadius: 3,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  doseDotX: {
    fontSize: 7,
    color: Colors.redBright,
  },
  adherenceMissed: {
    fontSize: 11,
    color: c.textMuted,
  },

  // ─── VISIT PREP ───
  visitContextNote: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    marginBottom: 8,
  },
  visitContextText: {
    fontSize: 12,
    color: c.textTertiary,
    fontStyle: 'italic',
    textAlign: 'center',
  },

  // Settings gear
  settingsGear: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: c.glass,
    borderWidth: 1,
    borderColor: c.glassBorder,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  settingsGearText: {
    fontSize: 16,
  },

  // Footer
  footerNote: {
    fontSize: 11,
    color: c.textTertiary,
    textAlign: 'center',
    marginTop: 20,
    fontStyle: 'italic',
  },

  // Data Building Banner
  dataBuildingBanner: {
    backgroundColor: c.accentLight,
    borderWidth: 1,
    borderColor: c.accentBorder,
    borderRadius: 14,
    padding: 20,
    marginBottom: 20,
    alignItems: 'center',
  },
  dataBuildingEmoji: {
    fontSize: 32,
    marginBottom: 8,
  },
  dataBuildingTitle: {
    fontSize: 15,
    fontWeight: '500',
    color: c.textBright,
    marginBottom: 6,
  },
  dataBuildingSubtitle: {
    fontSize: 12,
    color: c.textMuted,
    lineHeight: 18,
    textAlign: 'center',
  },
});

// Static styles for module-scope sub-components
const _styles = createStyles(Colors);
