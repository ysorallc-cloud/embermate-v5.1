// ============================================================================
// UPCOMING VISIT INSIGHTS CARD — UX-restructure (Commit 5)
//
// Promoted on the Insights tab when an appointment is within 7 days.
// Surfaces:
//   • Appointment countdown ("6 days away")
//   • Data coverage progress bar over the visit-prep window (15 days)
//   • Source-count pills (meds / vitals / meals / notes)
//   • Direct "Prepare visit prep →" CTA
//
// Renders nothing when no appointment is in window.
// ============================================================================

import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { Spacing, Sizing } from '../../theme/theme-tokens';
import { navigate } from '../../lib/navigate';
import {
  getUpcomingAppointments,
  type Appointment,
} from '../../utils/appointmentStorage';
import { getEventsByDateRange } from '../../storage/eventRepo';
import { getActivePatientId } from '../../storage/patientRegistry';
import { logError } from '../../utils/devLog';

const UPCOMING_LOOKAHEAD_DAYS = 7;
const COVERAGE_WINDOW_DAYS = 15;

const SHORT_WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const SHORT_MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

interface DataCoverage {
  daysLogged: number;
  windowDays: number;
  meds: number;
  vitals: number;
  meals: number;
  notes: number;
}

function withinDays(isoDate: string, days: number): boolean {
  const apptMs = new Date(isoDate).getTime();
  const nowMs = Date.now();
  const diff = (apptMs - nowMs) / (1000 * 60 * 60 * 24);
  return diff >= 0 && diff <= days;
}

function daysUntil(isoDate: string): number {
  const apptMs = new Date(isoDate).getTime();
  const nowMs = Date.now();
  return Math.max(0, Math.ceil((apptMs - nowMs) / (1000 * 60 * 60 * 24)));
}

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
    const events = await getEventsByDateRange(
      isoDate(start),
      isoDate(end),
      patientId,
    );
    let meds = 0;
    let vitals = 0;
    let meals = 0;
    let notes = 0;
    const dayKeys = new Set<string>();
    for (const e of events) {
      const day = e.timestamp.slice(0, 10);
      dayKeys.add(day);
      if (e.type === 'medication_taken' || e.type === 'medication_skipped') meds += 1;
      else if (e.type === 'vitals_recorded') vitals += 1;
      else if (e.type === 'meal_logged') meals += 1;
      else if (e.type === 'note_added') notes += 1;
    }
    return {
      daysLogged: dayKeys.size,
      windowDays: COVERAGE_WINDOW_DAYS,
      meds, vitals, meals, notes,
    };
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
        const next = upcoming.find((a) => withinDays(a.date, UPCOMING_LOOKAHEAD_DAYS));
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

  const daysAway = daysUntil(appt.date);
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
        <Text style={styles.eyebrow}>{'UPCOMING VISIT'}</Text>
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
          ? { backgroundColor: c.caregiverAccentBg, borderColor: c.caregiverAccentStrong }
          : { backgroundColor: 'transparent', borderColor: c.glassBorder },
      ]}
    >
      <Text
        style={{
          fontSize: 10,
          fontWeight: '500',
          color: active ? c.caregiverAccent : c.textTertiary,
        }}
      >
        {label}
      </Text>
    </View>
  );
}

const createStyles = (c: any) => StyleSheet.create({
  card: {
    marginVertical: Spacing.sm,
    paddingHorizontal: Sizing.cardInternalPadding,
    paddingVertical: Spacing.sm,
    backgroundColor: c.caregiverAccentBg,
    borderWidth: 0.5,
    borderColor: c.caregiverAccentStrong,
    borderRadius: Sizing.cardRadius,
  },
  headerRow: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    marginBottom: 4,
  },
  eyebrow: {
    fontSize: 10,
    fontWeight: '600' as const,
    letterSpacing: 0.5,
    color: c.caregiverAccent,
  },
  daysAway: {
    fontSize: 11,
    fontWeight: '500' as const,
    color: c.caregiverAccent,
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
  coverageBarFill: {
    height: 4,
    backgroundColor: c.caregiverAccent,
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
    borderTopColor: c.caregiverAccentStrong,
  },
  ctaText: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: c.caregiverAccent,
  },
});

export default UpcomingVisitInsightsCard;
