// ============================================================================
// JOURNAL IDENTITY STRIP — Phase 22.1
//
// Single thin line directly under the "Journal" title that anchors
// the page as a handoff document:
//
//   "{date} · {patientName} · {caregiverName}"
//
// Each slot degrades gracefully. The date is always present. The
// patient and caregiver slots are omitted when missing, with the
// middle-dot separators contracting accordingly.
// ============================================================================

import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';

export interface JournalIdentityStripProps {
  /** Pre-formatted display date (e.g. "Monday, May 11"). Always
   *  provided by the parent. */
  date: string;
  /** Patient display name, or empty string when no real name is
   *  set yet (the parent maps the registry placeholder to ''). */
  patientName: string;
  /** Caregiver display name, or null when no caregiver profile
   *  exists. */
  caregiverName: string | null;
}

const DOT = ' · ';

export function JournalIdentityStrip({
  date,
  patientName,
  caregiverName,
}: JournalIdentityStripProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const slots: string[] = [date];
  if (patientName.trim().length > 0) slots.push(patientName.trim());
  if (caregiverName && caregiverName.trim().length > 0) slots.push(caregiverName.trim());

  return (
    <View style={styles.row}>
      <Text style={styles.text} numberOfLines={1}>
        {slots.join(DOT)}
      </Text>
    </View>
  );
}

const createStyles = (c: any) => StyleSheet.create({
  row: {
    marginTop: 2,
    marginBottom: 8,
  },
  text: {
    fontSize: 12,
    color: c.textSecondary,
    letterSpacing: 0.2,
  },
});

export default JournalIdentityStrip;
