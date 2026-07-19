import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, Spacing, BorderRadius } from '../../theme/theme-tokens';
import { useTheme } from '../../contexts/ThemeContext';
import type { MealsDetail } from '../../utils/careSummaryBuilder';

interface Props {
  meals: MealsDetail;
  fluidTarget?: number | null;
  swallowingIssues?: boolean | null;
  hydrationGlasses?: number | null;
  /** Phase 27 F4 — strip outer card chrome. See MedicationsNarrative. */
  bare?: boolean;
  /** Phase 27 F3 — pending dedup. When true, suppress pending-meal copy
   *  (the "{names} scheduled." line + the per-meal "scheduled for {time}
   *  — not yet logged." rows) so pending meals surface only in Section
   *  4's STILL PENDING list. Defaults to false. */
  loggedOnly?: boolean;
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

export function MealsNarrative({ meals, fluidTarget, swallowingIssues, hydrationGlasses, bare = false, loggedOnly = false }: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const hasHydration = hydrationGlasses != null && hydrationGlasses > 0;
  if (meals.total === 0 && !hasHydration) return null;

  const completed = meals.meals.filter(m => m.status === 'completed');
  const pending = meals.meals.filter(m => m.status === 'pending');
  // A meal whose window has passed un-logged reads 'missed' (careSummaryBuilder
  // maps it via getCareItemStatus); an explicitly skipped meal reads 'skipped'.
  // Both fell through the old completed/pending bucketing and were silently
  // dropped from the handoff — a care item lost to the next caregiver. They are
  // surfaced here like MedicationsNarrative does (missed flagged, skipped
  // neutral), and — being closed facts, not still-actionable — are NOT
  // suppressed by loggedOnly (that flag defers only still-PENDING items to
  // Section 4's "Still pending").
  const missed = meals.meals.filter(m => m.status === 'missed');
  const skipped = meals.meals.filter(m => m.status === 'skipped');
  const allCompleted = completed.length === meals.total;
  const noneCompleted = completed.length === 0;

  // Phase 27 F3 — pending dedup. Under loggedOnly, the component must
  // not surface pending-meal copy: drop the "{names} scheduled." tail
  // in the noneCompleted branch and skip the per-meal "scheduled for
  // {time} — not yet logged." rows in the partial-completed branch.
  // Both move into Section 4's STILL PENDING list. When loggedOnly +
  // noneCompleted + no hydration, the whole component returns null;
  // Section 2's bucket gate handles the empty-state copy at the
  // section level.
  if (loggedOnly && noneCompleted && !hasHydration && missed.length === 0 && skipped.length === 0) return null;

  const parts: React.ReactNode[] = [];

  if (allCompleted) {
    const details = completed.map(m => {
      let desc = m.name;
      if (m.appetite) desc += ` (${m.appetite})`;
      if (m.description) desc += `: ${m.description}`;
      return desc;
    }).join(', ');
    parts.push(
      <Text key="all" style={styles.narrative}>
        <Text style={styles.bold}>All meals logged today.</Text> {details}.
      </Text>
    );
  } else if (noneCompleted) {
    // Phase 27 closeout — pending may be empty when meals.total > 0
    // but all meals are skipped/missed (so completed.length === 0
    // AND pending.length === 0). Pre-fix the JSX template
    //   "No meals logged yet. {names} scheduled."
    // rendered as "No meals logged yet.  scheduled." (double space,
    // orphan "scheduled.") when names was empty. Same render-layer
    // string-concat shape as Phase 27 Tuning 1's dose dedupe.
    // When meals were missed/skipped, those specific lines (appended below)
    // carry the story — don't prepend a generic "No meals logged yet." that
    // reads as still-pending and buries the miss.
    if (missed.length === 0 && skipped.length === 0) {
      const names = pending.map(m => m.name).join(', ');
      parts.push(
        <Text key="none" style={styles.narrative}>
          {names.length > 0 && !loggedOnly
            ? `No meals logged yet. ${names} scheduled.`
            : 'No meals logged yet.'}
        </Text>
      );
    }
  } else {
    for (const m of completed) {
      let text = `${m.name} logged`;
      if (m.appetite) text += ` (${m.appetite})`;
      text += '.';
      parts.push(
        <Text key={`c-${m.name}`} style={styles.narrative}>
          <Text style={styles.bold}>{m.name}</Text> logged{m.appetite ? ` (${m.appetite})` : ''}{m.description ? ` — ${m.description}` : ''}.
        </Text>
      );
    }
    if (!loggedOnly) for (const m of pending) {
      const timeStr = m.scheduledTime ? formatTime(m.scheduledTime) : 'today';
      parts.push(
        <Text key={`p-${m.name}`} style={styles.narrative}>
          <Text style={styles.bold}>{m.name}</Text> scheduled for {timeStr}{' \u2014 '}
          <Text style={styles.flagged}>not yet logged.</Text>
        </Text>
      );
    }
  }

  // Missed meals — flagged, always surfaced (a missed meal is a reportable
  // handoff fact, not a still-pending item). Mirrors MedicationsNarrative's
  // missed treatment.
  for (const m of missed) {
    parts.push(
      <Text key={`m-${m.name}`} style={styles.narrative}>
        <Text style={styles.bold}>{m.name}</Text>{' — '}
        <Text style={styles.flagged}>missed.</Text>
      </Text>
    );
  }

  // Skipped meals — neutral, always surfaced (a logged caregiver decision).
  for (const m of skipped) {
    parts.push(
      <Text key={`s-${m.name}`} style={styles.narrative}>
        <Text style={styles.bold}>{m.name}</Text>{' — '}skipped.
      </Text>
    );
  }

  // Hydration tracking
  if (hasHydration) {
    const targetStr = fluidTarget ? ` / ${fluidTarget} oz target` : '';
    parts.push(
      <Text key="hydration" style={[styles.narrative, { marginTop: 4 }]}>
        Fluid intake: {hydrationGlasses} glasses{targetStr}.
      </Text>
    );
  }

  // Swallowing issues flag (Tier 3)
  if (swallowingIssues) {
    parts.push(
      <Text key="swallowing" style={[styles.narrative, styles.flagged, { marginTop: 4 }]}>
        Swallowing difficulties noted.
      </Text>
    );
  }

  if (bare) {
    return <View>{parts}</View>;
  }
  return (
    <View style={styles.card}>
      {parts}
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
  narrative: {
    fontSize: 14,
    color: c.textSecondary,
    lineHeight: 20,
    marginBottom: 2,
  },
  bold: {
    fontWeight: '600',
    color: c.textPrimary,
  },
  flagged: {
    color: c.amber,
  },
});
