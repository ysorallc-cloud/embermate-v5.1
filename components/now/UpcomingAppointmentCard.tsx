// ============================================================================
// UPCOMING APPOINTMENT CARD — Phase 5.10.b
//
// Now-tab COMING UP block for the next upcoming appointment within 7 days.
// Surfaces a small "Prepare visit prep →" link in lavender ghost styling.
// Renders nothing when no appointment is within the lookahead window.
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

export function UpcomingAppointmentCard() {
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
        logError('UpcomingAppointmentCard.load', err);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  if (!appt) return null;

  return (
    <View
      style={styles.card}
      accessibilityRole="summary"
      accessibilityLabel={`Coming up: ${appt.specialty} with ${appt.provider} on ${shortDateLabel(appt.date)}`}
    >
      <Text style={styles.eyebrow}>{'COMING UP'}</Text>
      <Text style={styles.title}>{`${appt.specialty} with ${appt.provider}`}</Text>
      <Text style={styles.subtitle}>{shortDateLabel(appt.date)}</Text>
      <TouchableOpacity
        onPress={() => navigate(`/visit-prep?context=now&apptId=${appt.id}&days=14`)}
        accessibilityRole="button"
        accessibilityLabel="Prepare visit prep for this appointment"
        style={styles.prepareLink}
        hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
      >
        <Text style={styles.prepareLinkText}>{'Prepare visit prep →'}</Text>
      </TouchableOpacity>
    </View>
  );
}

const createStyles = (c: any) => StyleSheet.create({
  card: {
    marginTop: Spacing.md,
    marginBottom: Spacing.sm,
    paddingHorizontal: Sizing.cardInternalPadding,
    paddingVertical: Spacing.sm,
    backgroundColor: c.caregiverAccentBg,
    borderWidth: 0.5,
    borderColor: c.caregiverAccentStrong,
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
  prepareLink: {
    marginTop: 6,
    alignSelf: 'flex-end',
    paddingVertical: 2,
    paddingLeft: 8,
  },
  prepareLinkText: {
    fontSize: 11,
    fontWeight: '500' as const,
    color: c.caregiverAccent,
  },
});

export default UpcomingAppointmentCard;
