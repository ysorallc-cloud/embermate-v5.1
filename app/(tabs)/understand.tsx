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
import { HeroSheet } from '../../components/common/HeroSheet';
import { InsightsHero } from '../../components/insights/InsightsHero';
import { getRingReadiness } from '../../utils/insightsHero';
import { loadDataCoverage, type DataCoverage } from '../../utils/visitCoverage';
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
import { VitalTile, computeVitalTiles } from '../../utils/vitalTiles';
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

// VitalTile + computeVitalTiles + generateSparkPoints moved to utils/vitalTiles
// (STEP 1b — testable per-person tile logic, same pattern as computeDataGaps).

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
  const [coverage, setCoverage] = useState<DataCoverage | null>(null);
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
        // Baseline = this person's readings in the 60 days BEFORE the displayed
        // window, so tile "unusual" flags compare to their own history (not a
        // population cutoff). See computeVitalTiles.
        const baselineStart = new Date(start);
        baselineStart.setDate(baselineStart.getDate() - 60);
        const [readings, baseline] = await Promise.all([
          getVitalsInRange(start.toISOString(), now.toISOString()),
          getVitalsInRange(baselineStart.toISOString(), start.toISOString()),
        ]);
        setVitalTiles(computeVitalTiles(readings, baseline));
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

      // Data coverage — the ring's readiness gate reads daysLogged from here
      // (same canonical coverage as UpcomingVisitInsightsCard's "N of M days").
      try {
        const now = new Date();
        const start = new Date(now);
        start.setDate(start.getDate() - timeRange);
        const cov = await loadDataCoverage(
          toLocalDateString(start),
          toLocalDateString(now),
          timeRange,
        );
        setCoverage(cov);
      } catch (err) {
        logError('UnderstandScreen.loadCoverage', err);
        setCoverage(null);
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

  // Phase 1 Insights rebuild (insights-hero) — the signature adherence ring
  // leads on the HeroSheet plane; THE DATA + UPCOMING VISIT ride the sheet.
  // Ring readiness gates on canonical coverage (daysLogged) + doses (total);
  // below threshold the hero shows PatternsComing, never a 0%/grey ring.
  const readiness = getRingReadiness(coverage, adherence);
  // The ring reads the SAME adherence object the DataCard headline uses (now
  // canonical after the reconcile) — one object → ring % == card % by
  // construction. windowDays comes from the selected range for "PAST N DAYS".
  const ringAdherence = adherence
    ? { rate: adherence.rate, taken: adherence.taken, total: adherence.total, windowDays: timeRange }
    : null;

  return (
    <HeroSheet
      testID="insights"
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />
      }
      hero={
        <InsightsHero
          title="Insights"
          // Phase 15.8 — subtitle anchors to the upcoming appointment when one
          // sits in the canonical window; else the daysOfData copy chain.
          subtitle={computeInsightsSubtitle({
            daysOfData: pageData?.daysOfData ?? 0,
            patientName,
            upcomingAppointment: upcomingAppointment ? {
              provider: upcomingAppointment.provider,
              daysUntil: daysUntilAppointment(upcomingAppointment.date),
            } : null,
          })}
          // Range chips ride with the ring — meaningless over the pre-data state.
          segment={readiness.ready ? <TimeRangeToggle value={timeRange} onChange={setTimeRange} /> : null}
          readiness={readiness}
          adherence={ringAdherence}
        />
      }
    >
      {/* Pre-data honest state — the existing "PATTERNS COMING" preview
          (what-we'll-watch + start-logging tip). Shown in the sheet while the
          hero stays calm; the ring replaces neither, it just appears above
          once there's enough history. Per Flag B: keep the current behavior,
          never a 0%/grey ring. */}
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

      {/* THE DATA — vitals tiles + adherence grid + data gaps. Rides the
          sheet directly (no fold); the ring is the fold above it. */}
      <InsightsDataCard
        timeRange={timeRange}
        vitalTiles={vitalTiles}
        adherence={adherence}
        dataGaps={dataGaps}
      />

      <View style={{ height: SECTION_GAP }} />

      {/* UPCOMING VISIT — caregiver handoff lane (blue). Outside the readiness
          gate so a soon appointment surfaces even in pre-data. */}
      <UpcomingVisitInsightsCard />

      {/* Disclaimer \u2014 gated to the ring-ready (populated) state; on pre-data
          there is nothing to disclaim and the line only adds anxiety. */}
      {readiness.ready && (
        <Text style={styles.footerNote}>
          Analysis based on {timeRange} days of data {'\u00B7'} Not a medical diagnosis
        </Text>
      )}

      <View style={{ height: 40 }} />
    </HeroSheet>
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
