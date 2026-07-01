// ============================================================================
// UNDERSTAND PAGE - "Insights" — the correlation layer
//
// Phase 28 Batch B F6 (audit-revised cadence — absorbs F7+F8+F9 atomic):
// the page collapses into the three-card structure locked by the Batch B
// audit:
//   1. <InsightsReadCard>          — THE READ (sage). Subsumes the prior
//                                     "This week's pulse" prose summary +
//                                     PatternStack "EmberMate noticed".
//   2. <InsightsDataCard>          — THE DATA (neutral). Subsumes the prior
//                                     Vitals Dashboard + Medication
//                                     Adherence + Missing Data (now folded
//                                     to a single footer line).
//   3. <UpcomingVisitInsightsCard> — Section 3 (caregiver→clinician handoff
//                                     lane). Mounted post-F5 at 35c5441b.
//
// Retired in this commit (per Q-B-F6.1–F6.7 locks):
//   • generatePlainLanguageSummary import + Section 1 PULSE render block
//   • standalone Share CTA + handleShareSelection + ShareToast wiring
//   • inline Vitals / Adherence / Data Gaps render blocks + their styles
//   • PatternStack mount (subsumed by InsightsReadCard's pattern callout)
//   • pre-existing orphan code — CareScoreRing, computeHealthScore,
//     healthScore/periodLabel consts, Svg/SvgCircle/CareScoreFactor refs
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { navigate } from '../../lib/navigate';
import { useLocalSearchParams } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { Colors, Spacing } from '../../theme/theme-tokens';
import {
  SECTION_GAP,
  TITLE_CLEARANCE,
  TypeScale,
} from '../../theme/spacing';
import { useTheme } from '../../contexts/ThemeContext';
import { ScreenHeader } from '../../components/ScreenHeader';
import { InsightsReadCard } from '../../components/insights/InsightsReadCard';
import { InsightsDataCard } from '../../components/insights/InsightsDataCard';
import { PatternsZone } from '../../components/insights/PatternsZone';
import { UpcomingVisitInsightsCard } from '../../components/insights/UpcomingVisitInsightsCard';
import { usePatient } from '../../contexts/PatientContext';
import {
  loadUnderstandPageData,
  TimeRange,
  UnderstandPageData,
} from '../../utils/understandInsights';
import { computeDataGaps } from '../../utils/insightsDataGaps';
import { logError } from '../../utils/devLog';
import { useDataListener } from '../../lib/events';
import { EVENT } from '../../lib/eventNames';
import { InsightsEmptyStatePreview } from '../../components/understand/InsightsEmptyStatePreview';
// Phase 15.10 — recent-window card import + insight-aggregator
// selector + pattern-headline type imports retired. The "This Week"
// callout that consumed them duplicated the Vitals BP tile; its sole
// surface was removed. The card's component file is left in place as
// orphan source for a separate cleanup scope (15.6
// buildJournalPreview pattern).
import { classifyInsightsState, gatingForState, EMPTY_STATE_DAYS_THRESHOLD } from '../../utils/insightsState';
import { getVitalsInRange, VitalReading } from '../../utils/vitalsStorage';
import { listDailyInstancesRange, DEFAULT_PATIENT_ID } from '../../storage/carePlanRepo';
import { getTodayDateString, toLocalDateString } from '../../services/carePlanGenerator';
import { computeCanonicalAdherence } from '../../utils/adherenceCanonical';
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
// DATA EXPANDER — F7 collapsed-at-fold wrapper for InsightsDataCard.
// Renders a single-tap row with the data eyebrow + chevron; expands to
// reveal the wrapped surface.
// ============================================================================

function DataExpander({ children }: { children: React.ReactNode }) {
  const { colors } = useTheme();
  const [expanded, setExpanded] = useState(false);
  const styles = useMemo(() => StyleSheet.create({
    row: {
      flexDirection: 'row' as const,
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 14, // allow: tap-target padding (Apple HIG ≥44pt)
      borderTopWidth: 0.5,
      borderTopColor: colors.glassBorder,
      borderBottomWidth: 0.5,
      borderBottomColor: colors.glassBorder,
    },
    label: {
      ...TypeScale.body,
      color: colors.textSecondary,
    },
    labelStrong: {
      color: colors.textPrimary,
      fontWeight: '500' as const,
    },
    chevron: {
      ...TypeScale.body,
      color: colors.textTertiary,
    },
    body: {
      paddingTop: 12,
    },
  }), [colors]);
  return (
    <View>
      <TouchableOpacity
        style={styles.row}
        onPress={() => setExpanded((v) => !v)}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel="The data: vitals and adherence grid"
        accessibilityState={{ expanded }}
        testID="insights-data-expander"
      >
        <Text style={styles.label}>
          <Text style={styles.labelStrong}>The data</Text>
          {' — vitals · adherence grid'}
        </Text>
        <Text style={styles.chevron}>{expanded ? '▴' : '▾'}</Text>
      </TouchableOpacity>
      {expanded && <View style={styles.body}>{children}</View>}
    </View>
  );
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

    // CANONICAL adherence — the ring, this card, and the clinician PDFs
    // (care-report, visitPrepPdf) all read ONE source: computeCanonicalAdherence,
    // where rate = taken/total and skipped counts AGAINST. Previously this
    // computed (taken+skipped)/total, which credited skipped doses — it inflated
    // the rate (the dangerous direction for a health app) and disagreed with the
    // very PDF a caregiver hands their clinician. rate/taken/total now flow from
    // the canonical function so Insights can never drift from the artifacts again.
    const canonical = await computeCanonicalAdherence(timeRange);
    const { rate, taken, total } = canonical;

    // Dose grid + missed dates are presentation extras built from the same
    // instances. The grid still distinguishes 'skipped' visually — only the
    // headline RATE is the reconciled number.
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
  // Phase 28 Batch B F5 — providerPrep state retired with the
  // visit-context note. The note duplicated UpcomingVisitInsightsCard's
  // appointment context; one entry point per surface.
  const [vitalTiles, setVitalTiles] = useState<VitalTile[]>([]);
  const [adherence, setAdherence] = useState<AdherenceData | null>(null);
  // Phase 15.10 — top-ranked pattern state retired with the "This
  // Week" callout that consumed it.
  // Phase 15.8 — next upcoming appointment in the canonical 14-day
  // window, used by the header subtitle to anchor to visit context.
  const [upcomingAppointment, setUpcomingAppointment] = useState<Appointment | null>(null);
  // Phase 16.4 — ShareSheet state retired with the runtime mount;
  // the direct Visit Prep button replaces it. Phase 21 will restore.
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

      // Phase 28 Batch B F5 — provider-prep useEffect retired alongside
      // the visit-context note. UpcomingVisitInsightsCard remains the
      // sole appointment-context surface on Insights (it consumes
      // appointmentStorage + visitCoverage independently; no shared
      // state needed here).

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

  // Phase 28 Batch B F6 — `patternStackData` feeds InsightsReadCard's
  // pattern callout (subsumed from the prior PatternStack mount).
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
  const dataGaps = pageData ? computeDataGaps(pageData, timeRange) : [];

  return (
    <View style={styles.container}>
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
              // F7 — settings gear retired from Insights header. Time-range
              // chips (7d/14d/30d) stay as the sole right-side affordance.
              // Settings is reached from the You tab where it belongs.
              pageData && !pageData.isSampleData && pageData.daysOfData >= EMPTY_STATE_DAYS_THRESHOLD ? (
                <TimeRangeToggle value={timeRange} onChange={setTimeRange} />
              ) : null
            }
          />
          {/* F7 — TITLE_CLEARANCE below ScreenHeader before first zone. */}
          <View style={{ height: TITLE_CLEARANCE }} />

          {/* v6.7 Phase 4 — consolidated empty state for under-14-day
              windows. Replaces the prior Patterns Coming + What we'll be
              watching split AND the legacy "No data yet" / "Building
              your picture" banners; one consolidated card + a redirect
              tip card carry the full under-14-days messaging.

              Phase 3.7.3 — the tip card ("Start logging from Now") only
              renders in the empty state. Once the user has logged at
              least one event ('building'), they're already on the
              right track and the tip becomes redundant. */}
          {/* Phase 28a — the daysOfData < EMPTY_STATE_DAYS_THRESHOLD
              gate is what fixes the co-render bug. Pre-28a the
              empty-state preview rendered for the entire building
              state (days 1-13), but the pulse + data-gaps surfaces
              below independently rendered starting at day 7. The
              7-13 day window stacked both groups. Now the empty-
              state preview hides at-or-above day 7, exactly aligned
              with where the partial-populated surfaces start.
              !isSampleData stays as defensive documentation that
              two distinct sample-data paths exist (synthetic-preview
              via getSampleData() vs seeded data via
              sampleDataGenerator); the guard protects both. */}
          {pageData && !pageData.isSampleData && pageData.daysOfData < EMPTY_STATE_DAYS_THRESHOLD && (() => {
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

          {/* ═══ F7 PATTERNS ZONE (z1, coral cards) ═══
              Each pattern surfaces as its own coral card under the
              "📈 PATTERNS · understand" eyebrow. Null-renders when
              there are no patterns; the parent doesn't gate. */}
          <PatternsZone patterns={patternStackData} />

          <View style={{ height: SECTION_GAP }} />

          {/* ═══ F7 THE READ zone (sage, gestalt prose + metric tiles) ═══
              InsightsReadCard's internal "{N} patterns worth discussing"
              callout is suppressed by passing patterns={[]}; the patterns
              now surface above via PatternsZone. The card's own JournalSection
              sage chrome stays — F7's "open prose, no grid boxes" reframe
              is a v1.1 polish item for this card. */}
          {pageData && (
            <InsightsReadCard
              timeRange={timeRange}
              pageData={pageData}
              patterns={[]}
            />
          )}

          <View style={{ height: SECTION_GAP }} />

          {/* ═══ F7 THE DATA — collapsed at fold ═══
              "The data — vitals · adherence grid ▾" — toggles open the
              full InsightsDataCard surface (vitals tiles + adherence +
              data-gaps line). Defaults to collapsed so the page's first
              paint is THE READ + Patterns; the Data is one tap away. */}
          <DataExpander>
            <InsightsDataCard
              timeRange={timeRange}
              vitalTiles={vitalTiles}
              adherence={adherence}
              dataGaps={dataGaps}
            />
          </DataExpander>

          {/* ═══ SECTION 3: UPCOMING VISIT (caregiver→clinician handoff lane) ═══
              Phase 28 Batch B F5 (35c5441b) — moved to Section 3 position.
              Renders outside the data-state gating so a 5-day-out
              appointment surfaces even in empty/building states. */}
          <UpcomingVisitInsightsCard />

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
  // Phase 33 F10 — marginBottom 4 → Spacing.s4 (= 16). The Phase 33
  // audit's Target 2 description named `marginVertical: Spacing.sm`
  // which no longer exists in this file (refactor-drift since
  // audit-time). Fix applied to the closest semantically-equivalent
  // current property — the section wrapper's own marginBottom — to
  // provide breathing room before the next section's content. Dividers
  // between sections continue to add their own marginVertical
  // Spacing.md (20pt) on top.
  section: {
    marginBottom: Spacing.s4,
  },
  // Phase 15.12 — sectionLabel style retired. All 4 understand.tsx
  // uses were swept onto components/SectionEyebrow.tsx for uniform
  // eyebrow typography (uppercase, fontSize 8, weight 500) across
  // Insights surfaces. The "Rule 3: sentence case" comment retired
  // with the style — the eyebrow primitive forces all caps.
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
