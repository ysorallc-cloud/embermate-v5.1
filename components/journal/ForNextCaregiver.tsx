// ============================================================================
// FOR NEXT CAREGIVER — Phase 5.12.f.
//
// Renders only when at least one item exists. Items derive from two sources:
//   1. Pending scheduled items (passed in by Journal from outcomes.pending).
//   2. Flag-severity day-level changes (sleep notes excluded — flags only).
//
// Wording lives inside the component (template-owned, mirroring the
// 5.12.e matcher pattern) so DayLevelChange stays detection-focused.
// Templates parse the observation strings written by 5.12.4a's detectors
// to extract the BP value / symptom name; the format is fixed there and
// the parsers fall back to a generic line if the format ever drifts.
//
// Ordering: high-priority flags (symptoms, vitals) first, then pending
// tasks, then softer flags (mood, meals). Cap 3 visible bullets; rest
// roll up into "+ N more in handoff". Coral text for flag-derived
// bullets only; pending tasks render in textSecondary.
// ============================================================================

import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { Spacing } from '../../theme/theme-tokens';
import { SectionEyebrow } from '../SectionEyebrow';
import type { DayLevelChange } from '../../services/dayLevelChanges';

interface ForNextCaregiverProps {
  pending: string[];
  dayLevelChanges: DayLevelChange[];
}

interface Bullet {
  text: string;
  fromFlag: boolean;
}

const VISIBLE_BULLET_CAP = 3;

// ============================================================================
// TEMPLATES — parse the observation strings 5.12.4a writes.
// ============================================================================

function bulletForVitalsFlag(c: DayLevelChange): Bullet {
  // 5.12.4a writes: "BP {sys}/{dia} — {N} points above the rolling average"
  const m = c.observation.match(/BP\s+(\d+\/\d+)/);
  const value = m ? m[1] : null;
  const text = value
    ? `Recheck BP tomorrow morning. Highest reading today: ${value}`
    : 'Recheck BP tomorrow morning';
  return { text, fromFlag: true };
}

function bulletForSymptomsFlag(c: DayLevelChange): Bullet {
  // 5.12.4a writes: "New symptom: {names} — not seen in 14 days"
  // Symptom names are free-text so we leave the captured phrase verbatim.
  const m = c.observation.match(/New symptom:\s*([^—]+?)\s*(?:—|$)/);
  const name = m ? m[1].trim() : null;
  const text = name
    ? `Monitor for recurring ${name}`
    : 'Monitor for any recurring symptoms';
  return { text, fromFlag: true };
}

function bulletForMealsFlag(_: DayLevelChange): Bullet {
  return {
    text: 'Encourage meals tomorrow. A meal was refused today',
    fromFlag: true,
  };
}

function bulletForMoodFlag(_: DayLevelChange): Bullet {
  return { text: 'Check in on mood tomorrow', fromFlag: true };
}

// ============================================================================
// ORDERING + ASSEMBLY
// ============================================================================

function buildBullets(
  pending: string[],
  changes: DayLevelChange[],
): Bullet[] {
  const flags = changes.filter((c) => c.severity === 'flag');
  const priority: Bullet[] = [];
  const softer: Bullet[] = [];
  for (const c of flags) {
    switch (c.category) {
      case 'symptoms':
        priority.push(bulletForSymptomsFlag(c));
        break;
      case 'vitals':
        priority.push(bulletForVitalsFlag(c));
        break;
      case 'meals':
        softer.push(bulletForMealsFlag(c));
        break;
      case 'mood':
        softer.push(bulletForMoodFlag(c));
        break;
      // 'sleep' is excluded — note severity only.
    }
  }
  const pendingBullets: Bullet[] = pending.map((p) => ({
    text: p,
    fromFlag: false,
  }));
  return [...priority, ...pendingBullets, ...softer];
}

// ============================================================================
// COMPONENT
// ============================================================================

export function ForNextCaregiver({
  pending,
  dayLevelChanges,
}: ForNextCaregiverProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const all = buildBullets(pending, dayLevelChanges);
  if (all.length === 0) return null;

  const visible = all.slice(0, VISIBLE_BULLET_CAP);
  const overflow = all.length - visible.length;

  return (
    <View style={styles.section}>
      {/* Phase 33b Scope 2 — Surface 8 inline eyebrow style retired
          in favor of the SectionEyebrow primitive (canon-scale 11pt
          via component, lavender garnish via tint="caregiverAccent").
          Bullets + overflow already canon-compliant (no border / bg
          chrome; coral / textSecondary / textTertiary bullet colors
          per existing semantic). */}
      <SectionEyebrow text="For next caregiver" tint="caregiverAccent" />
      {visible.map((b, i) => (
        <Text
          key={`bullet-${i}`}
          testID={`for-next-bullet-${i}`}
          style={[
            styles.bullet,
            { color: b.fromFlag ? colors.criticalAlert : colors.textSecondary },
          ]}
        >
          {`- ${b.text}`}
        </Text>
      ))}
      {overflow > 0 && (
        <Text testID="for-next-overflow" style={styles.overflow}>
          {`+ ${overflow} more in handoff`}
        </Text>
      )}
    </View>
  );
}

const createStyles = (c: any) =>
  StyleSheet.create({
    section: {
      marginVertical: Spacing.sm,
      paddingHorizontal: 2,
      gap: 4,
    },
    bullet: {
      fontSize: 12,
      lineHeight: 18,
      paddingVertical: 2,
    },
    overflow: {
      paddingTop: 4,
      fontSize: 10.5,
      color: c.textTertiary,
    },
  });

export default ForNextCaregiver;
