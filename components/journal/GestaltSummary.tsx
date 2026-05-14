// ============================================================================
// GESTALT SUMMARY — Phase 22.1
//
// One short witness-voice paragraph anchoring the journal day. Sits
// directly under the identity strip, above the day picker. Reads as
// part of the handoff document, not as page chrome.
//
// Source of the paragraph text: passed in by the parent as a single
// resolved string. The parent (app/(tabs)/journal.tsx) already
// resolves caregiver-authored tone → auto narrative summary → "No
// record from this day." fallback for the legacy mood line; 22.1
// reuses that resolution and gives it new visual treatment here.
//
// This component does NOT fetch, NOT aggregate, NOT call log
// engines. Pure presentation. Mirrors the Phase 16.2
// CaregiverNotesBlock no-log-aggregation pattern (architectural pin
// in the test).
//
// Visual treatment per spec: lavender (caregiverAccent) left-border
// accent on a subtle background tint. Matches the visit-prep
// semantic used elsewhere.
// ============================================================================

import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';

export interface GestaltSummaryProps {
  /** The resolved one-paragraph summary string, or null/whitespace
   *  to render the graceful fallback. */
  summary: string | null;
  /**
   * Phase 27 F3 — strip the standalone card chrome (caregiverAccentBg
   * background + 3px left border + radius + padding). Used when the
   * component is nested inside a JournalSection wrapper, which carries
   * the chrome at the section level. Defaults to false so any
   * standalone consumer keeps the pre-27 visual.
   */
  bare?: boolean;
}

const FALLBACK_TEXT = 'No record from this day.';

export function GestaltSummary({ summary, bare = false }: GestaltSummaryProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const trimmed = (summary ?? '').trim();
  const text = trimmed.length > 0 ? trimmed : FALLBACK_TEXT;

  if (bare) {
    return <Text style={styles.text}>{text}</Text>;
  }
  return (
    <View style={styles.block}>
      <Text style={styles.text}>{text}</Text>
    </View>
  );
}

const createStyles = (c: any) => StyleSheet.create({
  block: {
    marginTop: 12, // allow: gestalt anchor breathing room above day picker
    marginBottom: 12, // allow: gestalt anchor breathing room above day picker
    paddingVertical: 12, // allow: paragraph internal padding (Apple HIG ≥44pt block)
    paddingHorizontal: 14, // allow: paragraph internal padding (Apple HIG ≥44pt block)
    backgroundColor: c.caregiverAccentBg || 'rgba(170,138,220,0.08)',
    borderLeftWidth: 3,
    borderLeftColor: c.caregiverAccentStrong || c.caregiverAccent,
    borderRadius: 6,
  },
  text: {
    fontSize: 13,
    lineHeight: 19,
    color: c.textPrimary,
    fontStyle: 'italic',
  },
});

export default GestaltSummary;
