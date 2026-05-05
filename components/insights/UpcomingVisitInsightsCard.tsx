// ============================================================================
// UPCOMING VISIT INSIGHTS CARD — Phase 5.10.b
//
// Mounts on the Insights tab ABOVE the data-state gating block so users
// can prep for an imminent appointment before the populated-state Reports
// section unlocks. Renders nothing when no appointment is within 7 days.
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
import { logError } from '../../utils/devLog';

const UPCOMING_LOOKAHEAD_DAYS = 7;

const SHORT_WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const SHORT_MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

function withinDays(isoDate: string, days: number): boolean {
  const apptMs = new Date(isoDate).getTime();
  const nowMs = Date.now();
  const diff = (apptMs - nowMs) / (1000 * 60 * 60 * 24);
  return diff >= 0 && diff <= days;
}

function shortDateLabel(isoDate: string): string {
  const d = new Date(isoDate);
  return `${SHORT_WEEKDAYS[d.getDay()]}, ${SHORT_MONTHS[d.getMonth()]} ${d.getDate()}`;
}

export function UpcomingVisitInsightsCard() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [appt, setAppt] = useState<Appointment | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const upcoming = await getUpcomingAppointments();
        if (cancelled) return;
        const next = upcoming.find((a) => withinDays(a.date, UPCOMING_LOOKAHEAD_DAYS));
        setAppt(next ?? null);
      } catch (err) {
        logError('UpcomingVisitInsightsCard.load', err);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  if (!appt) return null;

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => navigate(`/visit-prep?context=insights&apptId=${appt.id}&days=14`)}
      activeOpacity={0.85}
      accessibilityRole="button"
      accessibilityLabel={`Prepare for ${appt.provider} on ${shortDateLabel(appt.date)} — visit prep`}
    >
      <Text style={styles.eyebrow}>{'UPCOMING VISIT'}</Text>
      <Text style={styles.title}>{`Prepare for ${appt.provider}`}</Text>
      <Text style={styles.subtitle}>
        {`${shortDateLabel(appt.date)} — generate a summary`}
      </Text>
    </TouchableOpacity>
  );
}

const createStyles = (c: any) => StyleSheet.create({
  card: {
    marginVertical: Spacing.sm,
    paddingHorizontal: Sizing.cardInternalPadding,
    paddingVertical: Spacing.sm,
    backgroundColor: c.caregiverAccentBg,
    borderWidth: 0.5,
    borderColor: c.caregiverAccentBorder,
    borderRadius: Sizing.cardRadius,
  },
  eyebrow: {
    fontSize: 10,
    fontWeight: '600' as const,
    letterSpacing: 0.5,
    color: c.caregiverAccent,
    marginBottom: 4,
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
});

export default UpcomingVisitInsightsCard;
