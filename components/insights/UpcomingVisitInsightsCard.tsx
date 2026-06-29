// ============================================================================
// UPCOMING VISIT INSIGHTS CARD — UX-restructure (Commit 5)
//
// Promoted on the Insights tab when an appointment is within the canonical
// upcoming window (14 days, see utils/appointmentLookahead). Surfaces:
//   • Appointment countdown ("6 days away")
//   • Data coverage progress bar over the visit-prep window (15 days)
//   • Source-count pills (meds / vitals / meals / notes)
//   • Direct "Prepare visit prep →" CTA
//
// Renders nothing when no appointment is in window.
//
// Phase 23.2 F1 — the local UPCOMING_LOOKAHEAD_DAYS = 7 and a duplicate
// daysUntil() helper were retired in favour of the canonical
// appointmentLookahead util (already used by Now and Journal since
// Phase 15.8). Pre-23.2 the divergence meant an appointment 10 days
// away rendered on Now but disappeared from Insights — same patient
// state, inconsistent visibility across tabs.
// ============================================================================

import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { Spacing, Sizing } from '../../theme/theme-tokens';
import { SectionEyebrow } from '../SectionEyebrow';
import { navigate } from '../../lib/navigate';
import {
  getUpcomingAppointments,
  type Appointment,
} from '../../utils/appointmentStorage';
import { getActivePatientId } from '../../storage/patientRegistry';
import { logError } from '../../utils/devLog';
import {
  loadDataCoverage as loadCanonicalCoverage,
  COVERAGE_WINDOW_DAYS,
  type DataCoverage,
} from '../../utils/visitCoverage';
import {
  daysUntilAppointment,
  withinUpcomingWindow,
} from '../../utils/appointmentLookahead';

const SHORT_WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const SHORT_MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

function shortDateLabel(isoDate: string): string {
  const d = new Date(isoDate);
  return `${SHORT_WEEKDAYS[d.getDay()]}, ${SHORT_MONTHS[d.getMonth()]} ${d.getDate()}`;
}

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

async function loadDataCoverage(): Promise<DataCoverage | null> {
  try {
    const patientId = await getActivePatientId();
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - (COVERAGE_WINDOW_DAYS - 1));
    const startStr = isoDate(start);
    const endStr = isoDate(end);
    // Wave-1 Fix #3 — visitCoverage owns the canonical wiring now. meds/notes/
    // days come from the events+instances union; vitals + meals come from the
    // canonical readers (store B / nutrition instances), so the chip can't
    // diverge from the Insights tile or the VP report.
    return await loadCanonicalCoverage(startStr, endStr, COVERAGE_WINDOW_DAYS, patientId);
  } catch (err) {
    logError('UpcomingVisitInsightsCard.coverage', err);
    return null;
  }
}

export function UpcomingVisitInsightsCard() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [appt, setAppt] = useState<Appointment | null>(null);
  const [coverage, setCoverage] = useState<DataCoverage | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const upcoming = await getUpcomingAppointments();
        if (cancelled) return;
        const next = upcoming.find((a) => withinUpcomingWindow(a.date));
        setAppt(next ?? null);
        if (next) {
          const cov = await loadDataCoverage();
          if (!cancelled) setCoverage(cov);
        }
      } catch (err) {
        logError('UpcomingVisitInsightsCard.load', err);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  if (!appt) return null;

  const daysAway = daysUntilAppointment(appt.date);
  const coveragePct = coverage
    ? Math.min(100, Math.round((coverage.daysLogged / coverage.windowDays) * 100))
    : 0;

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => navigate(`/visit-prep?context=insights&apptId=${appt.id}&days=14`)}
      activeOpacity={0.85}
      accessibilityRole="button"
      accessibilityLabel={`Prepare for ${appt.provider} on ${shortDateLabel(appt.date)} — ${daysAway} days away`}
    >
      <View style={styles.headerRow}>
        <SectionEyebrow text="Upcoming visit" tint="caregiverAccent" />
        <Text style={styles.daysAway}>{`${daysAway} days away`}</Text>
      </View>
      <Text style={styles.title}>{`Prepare for ${appt.provider}`}</Text>
      <Text style={styles.subtitle}>
        {`${shortDateLabel(appt.date)} · ${appt.specialty}`}
      </Text>

      {coverage && (
        <View style={styles.coverageWrap}>
          <View style={styles.coverageBarTrack}>
            <View
              style={[
                styles.coverageBarFill,
                { width: `${coveragePct}%` },
              ]}
            />
          </View>
          <Text style={styles.coverageLabel}>
            {`${coverage.daysLogged} of ${coverage.windowDays} days logged`}
          </Text>
        </View>
      )}

      {coverage && (
        <View style={styles.pillRow}>
          <SourcePill label={`${coverage.meds} meds`} active={coverage.meds > 0} c={colors} />
          <SourcePill label={`${coverage.vitals} vitals`} active={coverage.vitals > 0} c={colors} />
          <SourcePill label={`${coverage.meals} meals`} active={coverage.meals > 0} c={colors} />
          <SourcePill label={`${coverage.notes} notes`} active={coverage.notes > 0} c={colors} />
        </View>
      )}

      <View style={styles.ctaRow}>
        <Text style={styles.ctaText}>{'Prepare visit prep →'}</Text>
      </View>
    </TouchableOpacity>
  );
}

function SourcePill({ label, active, c }: { label: string; active: boolean; c: any }) {
  // Phase 33b Scope 2 — Surface 3 lavender chrome retired on pills.
  // Active state now reads as cream with a quiet glass-border hairline;
  // inactive stays at the original lower-alpha glass border. Active
  // text shifts from lavender to cream.
  return (
    <View
      style={[
        {
          paddingHorizontal: 8,
          paddingVertical: 3,
          borderRadius: 10,
          borderWidth: 0.5,
        },
        active
          ? { backgroundColor: 'transparent', borderColor: c.glassStrong }
          : { backgroundColor: 'transparent', borderColor: c.glassBorder },
      ]}
    >
      <Text
        style={{
          fontSize: 10,
          fontWeight: '500',
          color: active ? c.textPrimary : c.textTertiary,
        }}
      >
        {label}
      </Text>
    </View>
  );
}

const createStyles = (c: any) => StyleSheet.create({
  // Phase 33b Scope 2 — Surface 3 lavender scale reduction. Pre-33b
  // the card had full lavender chrome (border + bg + progress fill +
  // pill borders + CTA link, ~70% footprint). 33b retires chrome
  // entirely. Eyebrow + cream body + sage progress fill + cream pills +
  // sage CTA. Eyebrow scale lavender (canon garnish) preserved via
  // SectionEyebrow tint="caregiverAccent". The "daysAway" accent
  // shifts from lavender body to textSecondary cream-muted (metadata,
  // not signal).
  card: {
    marginVertical: Spacing.sm,
    paddingHorizontal: 4,
    paddingVertical: Spacing.sm,
  },
  headerRow: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    marginBottom: 4,
  },
  // Phase 15.12 — local eyebrow style retired; SectionEyebrow with
  // tint="caregiverAccent" preserves the lavender visit-context
  // semantic at canon eyebrow scale.
  daysAway: {
    fontSize: 11,
    fontWeight: '500' as const,
    color: c.textSecondary,
  },
  title: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: c.textPrimary,
  },
  subtitle: {
    fontSize: 12,
    color: c.textSecondary,
    marginTop: 2,
  },
  coverageWrap: {
    marginTop: Spacing.sm,
  },
  coverageBarTrack: {
    height: 4,
    backgroundColor: c.glassBorder,
    borderRadius: 2,
    overflow: 'hidden' as const,
  },
  // Phase 33b Scope 2 — progress fill sage (matches completion semantics
  // across the app — sage = progress / done).
  coverageBarFill: {
    height: 4,
    backgroundColor: c.accent,
    borderRadius: 2,
  },
  coverageLabel: {
    fontSize: 11,
    color: c.textSecondary,
    marginTop: 4,
  },
  pillRow: {
    flexDirection: 'row' as const,
    flexWrap: 'wrap' as const,
    gap: 6,
    marginTop: 8,
  },
  ctaRow: {
    marginTop: Spacing.sm,
    paddingTop: 6,
    borderTopWidth: 0.5,
    borderTopColor: c.glassBorder,
  },
  // Phase 33b Scope 2 — CTA link sage (canon "cream or sage link").
  ctaText: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: c.accent,
  },
});

export default UpcomingVisitInsightsCard;
