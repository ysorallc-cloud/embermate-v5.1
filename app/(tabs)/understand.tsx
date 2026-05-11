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
  Share,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { navigate } from '../../lib/navigate';
import { useLocalSearchParams } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import Svg, { Polyline, Circle as SvgCircle } from 'react-native-svg';
import { Colors, Spacing } from '../../theme/theme-tokens';
import { useTheme } from '../../contexts/ThemeContext';
import { ScreenHeader } from '../../components/ScreenHeader';
import { UpcomingVisitInsightsCard } from '../../components/insights/UpcomingVisitInsightsCard';
// Phase 15.9 — pattern stack moved into its own component with an
// outer collapse so it doesn't dominate vertical real estate.
import { PatternStack } from '../../components/insights/PatternStack';
import { usePatient } from '../../contexts/PatientContext';
import {
  loadUnderstandPageData,
  generatePlainLanguageSummary,
  TimeRange,
  UnderstandPageData,
} from '../../utils/understandInsights';
import { computeDataGaps, DataGap } from '../../utils/insightsDataGaps';
import { logError } from '../../utils/devLog';
import { useDataListener } from '../../lib/events';
import { EVENT } from '../../lib/eventNames';
import { buildProviderPrep, ProviderPrepData } from '../../utils/providerPrepBuilder';
import { ShareToast } from '../../components/shared/ShareToast';
import { InsightsEmptyStatePreview } from '../../components/understand/InsightsEmptyStatePreview';
// Phase 15.10 — recent-window card import + insight-aggregator
// selector + pattern-headline type imports retired. The "This Week"
// callout that consumed them duplicated the Vitals BP tile; its sole
// surface was removed. The card's component file is left in place as
// orphan source for a separate cleanup scope (15.6
// buildJournalPreview pattern).
import { classifyInsightsState, gatingForState } from '../../utils/insightsState';
import { getVitalsInRange, VitalReading } from '../../utils/vitalsStorage';
import { listDailyInstancesRange, DEFAULT_PATIENT_ID } from '../../storage/carePlanRepo';
import { getTodayDateString, toLocalDateString } from '../../services/carePlanGenerator';
// Phase 15.8 — Insights subtitle anchors to the upcoming appointment
// when one exists in the canonical 14-day window. Shared with
// UpcomingAppointmentCard on Now via utils/appointmentLookahead.
import { getUpcomingAppointments, type Appointment } from '../../utils/appointmentStorage';
import { daysUntilAppointment, withinUpcomingWindow } from '../../utils/appointmentLookahead';
import { computeInsightsSubtitle } from '../../utils/insightsSubtitle';

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

// Phase 11.9.3 — DataGap + computeDataGaps moved to utils/insightsDataGaps
// so the integration tests can import them without pulling React Native
// / expo-router. Re-exported via import below.

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

// Phase 11.9.3 — computeDataGaps moved to utils/insightsDataGaps.
// The function stays pure; this extraction enables integration
// tests to assert the gap output without mounting the screen's
// component graph.

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
    const startDate = toLocalDateString(start);

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
  } catch (err) {
    logError('UnderstandScreen.computeAdherence', err);
    return { rate: 0, taken: 0, total: 0, missedDates: [], doseStatuses: [] };
  }
}

// ============================================================================
// Phase 15.9 — SEVERITY constant + correlationSeverity helper moved
// into components/insights/PatternStack.tsx along with the rest of
// the pattern stack machinery.

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function UnderstandScreen() {
  const { colors } = useTheme();
  const { focusTrend } = useLocalSearchParams<{ focusTrend?: string }>();
  const { activePatient } = usePatient();
  const patientName = activePatient?.name && activePatient.name !== 'Patient'
    ? activePatient.name
    : 'your loved one';
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<TimeRange>(14);
  const [pageData, setPageData] = useState<UnderstandPageData | null>(null);
  const [providerPrep, setProviderPrep] = useState<ProviderPrepData | null>(null);
  const [vitalTiles, setVitalTiles] = useState<VitalTile[]>([]);
  const [shareToastVisible, setShareToastVisible] = useState(false);
  const [adherence, setAdherence] = useState<AdherenceData | null>(null);
  // Phase 15.10 — top-ranked pattern state retired with the "This
  // Week" callout that consumed it.
  // Phase 15.8 — next upcoming appointment in the canonical 14-day
  // window, used by the header subtitle to anchor to visit context.
  const [upcomingAppointment, setUpcomingAppointment] = useState<Appointment | null>(null);
  // Phase 15.9 — per-card expand state + chevron anims moved into
  // PatternStack along with the inline render they belonged to.

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [timeRange])
  );

  const insightsReloadTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const insightsLastLoadDone = useRef(0);
  useDataListener(useCallback((cat: string) => {
    if ([
      EVENT.MEDICATION, EVENT.VITALS, EVENT.WATER, EVENT.MOOD, EVENT.WELLNESS,
      EVENT.SYMPTOMS, EVENT.LOGS, EVENT.CARE_PLAN, EVENT.CARE_PLAN_CONFIG,
      EVENT.CARE_PLAN_ITEMS, EVENT.DAILY_INSTANCES, EVENT.APPOINTMENTS,
      EVENT.NOTES, EVENT.SAMPLE_DATA_CLEARED,
    ].includes(cat as any)) {
      // Suppress config events that are self-generated by ensureDailyInstances sync
      if (['carePlanItems', 'carePlanConfig'].includes(cat) && Date.now() - insightsLastLoadDone.current < 2000) return;
      if (insightsReloadTimer.current) clearTimeout(insightsReloadTimer.current);
      insightsReloadTimer.current = setTimeout(() => {
        loadData().finally(() => { insightsLastLoadDone.current = Date.now(); });
      }, 500);
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
      } catch (err) {
        logError('UnderstandScreen.loadVitals', err);
        setVitalTiles([]);
      }

      // Adherence
      try {
        const adh = await computeAdherence(timeRange);
        setAdherence(adh);
      } catch (err) {
        logError('UnderstandScreen.loadAdherence', err);
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
      } catch (err) {
        logError('UnderstandScreen.loadProviderPrep', err);
        setProviderPrep(null);
      }

      // Phase 15.10 — top-ranked pattern load retired with the "This
      // Week" callout. The insight-aggregator selector had no other
      // consumer here.

      // Phase 15.8 — anchor the header subtitle to the next upcoming
      // appointment when one lands in the canonical 14-day window.
      // Uses the same getUpcomingAppointments selector + lookahead
      // helper as UpcomingAppointmentCard on Now to keep the two
      // surfaces in sync.
      try {
        const upcoming = await getUpcomingAppointments();
        const next = upcoming.find((a) => withinUpcomingWindow(a.date)) ?? null;
        setUpcomingAppointment(next);
      } catch (err) {
        logError('UnderstandScreen.loadUpcomingAppointment', err);
        setUpcomingAppointment(null);
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

  // Phase 15.9 — chevron anim ref + toggleCorrelation moved into
  // PatternStack. understand.tsx only sources the array now.
  const patternStackData = pageData?.correlationCards ?? [];

  // Loading state
  if (loading && !pageData) {
    return (
      <View style={styles.container}>
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
      <ShareToast visible={shareToastVisible} onDismiss={() => setShareToastVisible(false)} />

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
          {/* Phase 15.8 — subtitle anchors to upcoming appointment when
              one exists in the canonical 14-day window; otherwise falls
              back to the daysOfData copy chain. Helper lives in
              utils/insightsSubtitle so the copy rules can be pinned
              with pure-function tests. */}
          <ScreenHeader
            title="Insights"
            subtitle={computeInsightsSubtitle({
              daysOfData: pageData?.daysOfData ?? 0,
              patientName,
              upcomingAppointment: upcomingAppointment ? {
                provider: upcomingAppointment.provider,
                daysUntil: daysUntilAppointment(upcomingAppointment.date),
              } : null,
            })}
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
                    <Text style={styles.settingsGearText}>{'⚙'}</Text>
                  </View>
                </TouchableOpacity>
              </View>
            }
          />

          {/* v6.7 Phase 4 — consolidated empty state for under-14-day
              windows. Replaces the prior Patterns Coming + What we'll be
              watching split AND the legacy "No data yet" / "Building
              your picture" banners; one consolidated card + a redirect
              tip card carry the full under-14-days messaging.

              Phase 3.7.3 — the tip card ("Start logging from Now") only
              renders in the empty state. Once the user has logged at
              least one event ('building'), they're already on the
              right track and the tip becomes redundant. */}
          {pageData && !pageData.isSampleData && (() => {
            const days = pageData.daysOfData;
            const events = days > 0 ? 1 : 0;
            const state = classifyInsightsState(days, events);
            const gating = gatingForState(state, days);
            if (!gating.showPatternsComing) return null;
            return (
              <InsightsEmptyStatePreview
                daysOfData={days}
                patientName={patientName}
                showTipCard={gating.showTipCard}
              />
            );
          })()}

          {/* ═══ SECTION 1: THIS WEEK'S PULSE (AI SUMMARY) ═══ */}
          {pageData && pageData.daysOfData >= 7 && (() => {
            const summaryText = generatePlainLanguageSummary(pageData, timeRange);
            if (!summaryText) return null;
            return (
              <View style={styles.aiSummarySection}>
                <Text style={styles.sectionLabel}>This week's pulse</Text>
                <Text style={styles.sectionContext}>
                  An overall read on how {patientName}'s care is going. Higher is better.
                </Text>
                <Text style={styles.aiSummaryLabel}>{'\u2728'} {timeRange}-day summary</Text>
                <Text style={styles.aiSummaryText}>{summaryText}</Text>
                <Text style={styles.aiSummaryDisclaimer}>For informational purposes only · Not a diagnosis</Text>
              </View>
            );
          })()}

          <View style={styles.divider} />

          {/* ═══ SECTION 2: EMBERMATE NOTICED (pattern stack) ═══
              Phase 15.9 — wrapped in PatternStack so the section
              collapses by default and doesn't dominate vertical
              real estate. Inner per-card expand behavior is
              preserved inside the stack. */}
          <PatternStack patterns={patternStackData} />

          {/* ═══ SECTION 3: DATA GAPS ═══
              v6.7 May 1 sizing pass — Phase 5: suppressed for under-7-day
              windows. The InsightsEmptyStatePreview card above already
              explains the data state — surfacing "Missing data" alongside
              it is redundant and reads as scolding. Re-enabled at 7+ days
              when the section adds value (the user has data, this surfaces
              what they DON'T have to lift their visibility). */}
          {pageData && pageData.daysOfData >= 7 && dataGaps.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Missing data</Text>
              <Text style={styles.sectionContext}>
                What we can't track yet. More data means better insights.
              </Text>

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

          {/* ═══ REPORTS ═══
              Phase 3.7.3 — gated to populated state only (≥ 14 days of
              data with events). Visit prep, Care report, and Medication
              report all read sparse and judgment-y at fresh-install
              state; hiding them until there's enough data prevents
              first-impression damage. Default per spec — Visit prep
              follows the same gate as the other reports. */}

          {/* Phase 15.10 — "THIS WEEK" RecentWindowCard retired. It
              duplicated the Vitals BP tile (canonical BP surface lives
              in the Vitals 4-tile grid below). Visual rhythm between
              the patterns section and the Upcoming Visit / Visit Prep
              block may want a SectionEyebrow or divider — filed for
              Phase 15.12 (uniform eyebrow pass). */}

          {/* Phase 5.10.b — UPCOMING VISIT card. Renders OUTSIDE the
              data-state gating so a 5-day-out appointment surfaces even
              in empty/building states. */}
          <UpcomingVisitInsightsCard />

          {pageData && (() => {
            const days = pageData.daysOfData;
            const events = days > 0 ? 1 : 0;
            const state = classifyInsightsState(days, events);
            const gating = gatingForState(state, days);
            if (!gating.showReports) return null;
            return (
          <View style={styles.section}>
            <View style={{ marginTop: Spacing.md }} />
            {[
              { key: 'provider', title: 'Visit prep', subtitle: `Generate a summary to bring to ${patientName}'s next appointment.`, icon: '🩺' },
              { key: 'care', title: 'Care report', subtitle: 'Full PDF with trends and patterns', icon: '📋' },
              { key: 'medication', title: 'Medication report', subtitle: 'Adherence history and side effects', icon: '💊' },
            ].map((report) => (
              <View key={report.key} style={styles.reportCard}>
                <Text style={styles.reportIcon}>{report.icon}</Text>
                <View style={styles.reportInfo}>
                  <Text style={styles.reportTitle}>{report.title}</Text>
                  <Text style={styles.reportSubtitle}>{report.subtitle}</Text>
                </View>
                <TouchableOpacity
                  style={styles.reportShareBtn}
                  onPress={async () => {
                    if (report.key === 'provider') {
                      navigate('/visit-prep');
                      return;
                    }
                    try {
                      setShareToastVisible(true);
                      await Share.share({ message: `${report.title} — Generated by EmberMate` });
                    } catch (_) { /* user cancelled */ }
                  }}
                  accessibilityLabel={`Share ${report.title}`}
                  accessibilityRole="button"
                >
                  <Text style={styles.reportShareText}>Share</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
            );
          })()}

          {/* ═══ SECTION 4: VITALS DASHBOARD ═══ */}
          {vitalTiles.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Vitals this week</Text>
              <Text style={styles.sectionContext}>
                Key numbers averaged over the last {timeRange} days.
              </Text>

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

          {/* ═══ SECTION 5: MEDICATION ADHERENCE ═══
              Phase 3.7.3 — adherence chart NEVER renders below
              POPULATED_DAYS_THRESHOLD (14 days). A 9% reading with sparse
              data reads as judgment to a caregiver and damages trust on
              first impression. Hard-floor gate enforced via
              gatingForState's adherence rule. */}
          {adherence && adherence.total > 0 && pageData && (() => {
            const days = pageData.daysOfData;
            const events = days > 0 ? 1 : 0;
            const state = classifyInsightsState(days, events);
            const gating = gatingForState(state, days);
            return gating.showAdherenceChart;
          })() && (
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Medication adherence</Text>
              <Text style={styles.sectionContext}>
                How consistently meds are being taken as scheduled.
              </Text>

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

          {/* Phase 6.1 — gate the disclaimer to the populated state. On
              empty/building (days < 14) there is nothing to disclaim;
              the line just adds anxiety while implying analysis the user
              can't see. */}
          {pageData && (() => {
            const days = pageData.daysOfData;
            const events = days > 0 ? 1 : 0;
            const state = classifyInsightsState(days, events);
            if (state !== 'populated') return null;
            return (
              <Text style={styles.footerNote}>
                Analysis based on {timeRange} days of data {'\u00B7'} Not a medical diagnosis
              </Text>
            );
          })()}

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
  // Phase 3 page rhythm — every tab's outermost ScrollView lands at
  // paddingTop: 24 / paddingHorizontal: 14. Bottom padding kept modest
  // so the last card doesn't read disconnected from the footer area.
  scrollContent: {
    paddingTop: 24, // allow: tap-target padding (Apple HIG ≥44pt)
    paddingHorizontal: 14, // allow: tap-target padding (Apple HIG ≥44pt)
    paddingBottom: 16, // allow: tap-target padding (Apple HIG ≥44pt)
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.sm,
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
    marginVertical: Spacing.md,
    marginHorizontal: -16,
  },

  // Phase 15.10 — thisWeekSection / thisWeekEyebrow styles retired
  // with the duplicate "This Week" callout that consumed them.

  // Section
  section: {
    marginBottom: 4,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.5,
    color: c.textMuted,
    // Rule 3: sentence case, not ALL CAPS
    marginBottom: 6,
  },
  sectionSublabel: {
    fontSize: 12,
    color: c.textTertiary,
    marginBottom: 14, // allow: off-scale gap (intentional)
  },
  sectionContext: {
    fontSize: 11,
    color: '#4a5a6a',
    marginTop: 2,
    marginBottom: 10,
  },

  // ─── CARE SCORE ───
  // ─── AI SUMMARY (replaces Care Score) ───
  aiSummarySection: {
    borderLeftWidth: 2,
    borderLeftColor: c.caregiverAccentLight || '#A78BFA',
    paddingLeft: 14, // allow: tap-target padding (Apple HIG ≥44pt)
    paddingVertical: 8,
    marginBottom: 8,
  },
  aiSummaryLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: c.caregiverAccentLight || '#A78BFA',
    marginBottom: 6,
  },
  aiSummaryText: {
    fontSize: 14,
    color: c.textSecondary,
    lineHeight: 21,
    marginBottom: 8,
  },
  aiSummaryDisclaimer: {
    fontSize: 11,
    color: c.textMuted,
    fontStyle: 'italic' as const,
  },
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

  // ─── REPORTS ───
  reportCard: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    backgroundColor: c.glass,
    borderWidth: 1,
    borderColor: c.glassBorder,
    borderRadius: 14,
    padding: 12,
    marginBottom: 8,
    gap: 12,
  },
  reportIcon: {
    fontSize: 24,
  },
  reportInfo: {
    flex: 1,
  },
  reportTitle: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: c.textPrimary,
    marginBottom: 2,
  },
  reportSubtitle: {
    fontSize: 12,
    color: c.textMuted,
  },
  reportShareBtn: {
    backgroundColor: c.accent,
    paddingHorizontal: 14, // allow: tap-target padding (Apple HIG ≥44pt)
    paddingVertical: 8,
    borderRadius: 8,
  },
  reportShareText: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: '#fff',
  },

  // ─── VITALS GRID ───
  vitalsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  vitalTile: {
    backgroundColor: c.surface,
    borderWidth: 1,
    borderColor: c.glassBorder,
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
    backgroundColor: c.surface,
    borderWidth: 1,
    borderColor: c.glassBorder,
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
  // allow: 32×32 fixed-dimension icon button — not a card surface.
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
    color: c.textSecondary,
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
