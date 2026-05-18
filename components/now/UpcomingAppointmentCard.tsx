// ============================================================================
// UPCOMING APPOINTMENT CARD — Phase 5.10.b (15.7 consolidation)
//
// Now-tab block for the next upcoming appointment.
// Surfaces a small "Prepare visit prep →" link in lavender ghost styling.
// Renders nothing when no appointment is within the lookahead window.
//
// Phase 15.7 — UPCOMING_LOOKAHEAD_DAYS bumped 7 → 14. This card
// became the sole upcoming-appointment surface on Now after the
// inline "Upcoming This Week" block in now.tsx was retired; the
// inline block used a 14-day window, and per the consolidation
// audit the more inclusive window is canonical. The eyebrow copy
// also shifted from the static "COMING UP" to a dynamic
// "UPCOMING · N DAYS" where N is days-until-appointment.
// SectionEyebrow component swap is deferred to 15.12.
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
import { logError } from '../../utils/devLog';
import {
  UPCOMING_LOOKAHEAD_DAYS,
  daysUntilAppointment,
  withinUpcomingWindow,
} from '../../utils/appointmentLookahead';

// Phase 15.8 — UPCOMING_LOOKAHEAD_DAYS now sourced from
// utils/appointmentLookahead (Insights subtitle reuses it). Re-exported
// here for back-compat with the 15.7 test that imports it from this
// path.
export { UPCOMING_LOOKAHEAD_DAYS };

const SHORT_WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const SHORT_MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

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
        const next = upcoming.find((a) => withinUpcomingWindow(a.date));
        setAppt(next ?? null);
      } catch (err) {
        logError('UpcomingAppointmentCard.load', err);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  if (!appt) return null;

  const n = daysUntilAppointment(appt.date);
  const eyebrowLabel = `UPCOMING · ${n} ${n === 1 ? 'DAY' : 'DAYS'}`;

  return (
    <View
      style={styles.card}
      accessibilityRole="summary"
      accessibilityLabel={`Upcoming in ${n} ${n === 1 ? 'day' : 'days'}: ${appt.specialty} with ${appt.provider} on ${shortDateLabel(appt.date)}`}
    >
      <SectionEyebrow text={eyebrowLabel} tint="caregiverAccent" />
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
  // Phase 33b Scope 2 — Surface 2 lavender scale reduction. Pre-33b
  // card had full lavender chrome (border + bg + link); 33b retires
  // chrome entirely. Eyebrow + cream body sit on page bg; link
  // migrates from lavender to sage (canon "cream or sage link" target).
  card: {
    marginTop: Spacing.md,
    marginBottom: Spacing.sm,
    paddingHorizontal: 4,
  },
  // Phase 15.12 — local eyebrow style retired; SectionEyebrow with
  // tint="caregiverAccent" preserves the lavender garnish at canon
  // eyebrow scale.
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
    color: c.accent,
  },
});

export default UpcomingAppointmentCard;
