// ============================================================================
// MEDICATIONS NARRATIVE — Journal Section 2 (Objective) row content.
//
// Phase 27.5b F4 — restructured from paragraph prose into a per-row
// list. Pre-27.5b each medication rendered as a sentence inside a
// shared paragraph wall; with five-plus meds the row read as
// unscannable text. Post-27.5b each medication is its own ROW with
// name + dose on the LEFT column and status / time on the RIGHT.
// Scannable at a glance for the Journal Section 2 row, with a design
// forward-fit for eventual Visit Prep PDF consumption.
//
// The per-status branches preserved from the pre-27.5b shape:
//   • completed → right column shows taken time
//   • pending   → right column shows scheduled time + "not yet"
//   • skipped   → right column shows "skipped"
//   • missed    → right column shows "missed"
//
// Phase 27 Tuning 1 dose-stutter dedupe (dosageSuffix helper)
// preserved unchanged — sample data carries the dose in `name`
// ("Warfarin 5mg") AND in `dosage` ("5mg"); the helper suppresses the
// duplicate.
// ============================================================================

import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, Spacing, BorderRadius } from '../../theme/theme-tokens';
import { useTheme } from '../../contexts/ThemeContext';
import type { MedicationDetail } from '../../utils/careSummaryBuilder';

interface Props {
  medications: MedicationDetail[];
  showPurpose?: boolean;
  /** Phase 27 F4 — strip the outer card chrome (backgroundColor +
   *  borderWidth + borderRadius + padding). Used when nested inside
   *  Journal Section 2's neutral card so the chrome doesn't double-up.
   *  Defaults to false for any standalone consumer. */
  bare?: boolean;
}

function formatTime(isoOrHHmm: string): string {
  try {
    const date = new Date(isoOrHHmm);
    if (!isNaN(date.getTime())) {
      return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    }
  } catch { /* fall through */ }
  return isoOrHHmm;
}

// Phase 27 Tuning 1 — dose-stutter dedupe.
//
// Sample data (and some production records) carry the dose embedded
// in `name` ("Warfarin 5mg") AND in the separate `dosage` field
// ("5mg"). Rendering both unconditionally produced the simulator
// stutter "Warfarin 5mg 5mg taken at 4:30 PM." Return the dosage
// only when it's NOT already in the trailing portion of name —
// otherwise return '' so the prose path can safely concat it.
function dosageSuffix(name: string, dosage: string | undefined): string {
  if (!dosage) return '';
  const trimmedName = name.trim();
  const trimmedDose = dosage.trim();
  if (trimmedName.endsWith(trimmedDose)) return '';
  return ` ${trimmedDose}`;
}

// Per-status right-column copy. Inline helper rather than a lookup
// table so the time interpolation stays readable.
function rightColumnText(m: MedicationDetail): { text: string; flagged: boolean } {
  if (m.status === 'completed') {
    const time = m.takenAt ? formatTime(m.takenAt) : formatTime(m.scheduledTime);
    return { text: time, flagged: false };
  }
  if (m.status === 'pending') {
    const time = formatTime(m.scheduledTime);
    return { text: `${time} — not yet`, flagged: true };
  }
  if (m.status === 'skipped') {
    return { text: 'skipped', flagged: false };
  }
  if (m.status === 'missed') {
    return { text: 'missed', flagged: true };
  }
  // Defensive fallback for any future status — show scheduled time.
  return { text: formatTime(m.scheduledTime), flagged: false };
}

export function MedicationsNarrative({ medications, bare = false }: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  if (medications.length === 0) return null;

  const rows = medications.map((m, i) => {
    const leftText = `${m.name}${dosageSuffix(m.name, m.dosage)}`;
    const right = rightColumnText(m);
    return (
      <View key={`med-${i}-${m.name}`} style={styles.row} testID={`med-row-${i}`}>
        <Text style={styles.left} testID={`med-row-left-${i}`}>
          {leftText}
        </Text>
        <Text
          style={[styles.right, right.flagged && styles.rightFlagged]}
          testID={`med-row-right-${i}`}
        >
          {right.text}
        </Text>
      </View>
    );
  });

  // Side effects, when present, render as a trailing element below
  // the list (preserved behavior — the visit-prep / handoff reader
  // wants to see flagged side effects without scanning each row).
  const withSideEffects = medications.filter((m) => m.sideEffects && m.sideEffects.length > 0);
  const sideEffectsNode =
    withSideEffects.length > 0 ? (
      <Text key="side-effects" style={styles.sideEffects}>
        Side effects noted: {withSideEffects.flatMap((m) => m.sideEffects!).join(', ')}.
      </Text>
    ) : null;

  if (bare) {
    return (
      <View>
        {rows}
        {sideEffectsNode}
      </View>
    );
  }

  return (
    <View style={styles.card}>
      {rows}
      {sideEffectsNode}
    </View>
  );
}

const createStyles = (c: typeof Colors) => StyleSheet.create({
  card: {
    backgroundColor: c.glassHover,
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  // Phase 27.5b F4 — row layout. Name + dose on the left grows to fill
  // available space; status / time on the right is fixed-content,
  // right-aligned. paddingVertical gives each row a small breathing
  // bound so a 5-row list doesn't compress visually.
  row: {
    flexDirection: 'row' as const,
    alignItems: 'baseline' as const,
    justifyContent: 'space-between' as const,
    paddingVertical: 3,
  },
  left: {
    flex: 1,
    fontSize: 14,
    color: c.textPrimary,
    fontWeight: '500' as const,
    paddingRight: 8, // allow: column gap (Apple HIG)
  },
  right: {
    fontSize: 13,
    color: c.textSecondary,
    textAlign: 'right' as const,
  },
  rightFlagged: {
    color: c.amber,
  },
  sideEffects: {
    fontSize: 13,
    color: c.textSecondary,
    lineHeight: 19,
    marginTop: 6,
  },
});
