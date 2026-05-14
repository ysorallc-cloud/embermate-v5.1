// ============================================================================
// JOURNAL SECTION — Phase 27.
//
// Generic outer card wrapping each of the four SOAP-shaped Journal sections
// (Subjective / Objective / Assessment / Plan). Owns the section's color
// encoding (3px left border + 0.06-alpha background tint), the eyebrow at
// the top of the card, and the dimensional rhythm shared across all four
// sections (radius / padding / sibling gap).
//
// Per Phase 27 D1-D3 (audit-confirmed) the supported tints are:
//   • 'caregiverAccent' — lavender — Section 1 (Subjective) and Section 4
//                                    (Plan). Lane bookends — both ends of
//                                    the SOAP arc carry the caregiver-
//                                    handoff voice color established by
//                                    Phase 26 (You-tab + Insights Share
//                                    CTA + "Building toward" banner).
//   • 'amber'           — amber  — Section 3 (Assessment / "Worth
//                                  flagging"). Continuity with the
//                                  pre-Phase-27 TodayNotableMoments tint
//                                  and Phase 22.2's "WORTH MENTIONING —
//                                  amber — attention without alarm".
//   • 'neutral'         — quiet  — Section 2 (Objective / "What was
//                                  logged"). Border routes through
//                                  glassStrong (rgba 0.18) and the bg
//                                  tint through glassFaint (rgba 0.03) —
//                                  both already in the glass alpha
//                                  ladder, no new tokens needed.
//
// The component owns chrome only — children render whatever content the
// section requires. Per Phase 27 F2-F6, sibling consumers pass `bare`
// props to their inner components (GestaltSummary, the four orphan
// narratives, TodayNotableMoments, TodayStillPending, JournalNotesCard)
// so the inner chrome doesn't duplicate this card's chrome.
// ============================================================================

import React, { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { SectionEyebrow } from '../SectionEyebrow';
import { BorderRadius } from '../../theme/theme-tokens';

export type JournalSectionTint = 'caregiverAccent' | 'amber' | 'neutral';

export interface JournalSectionProps {
  eyebrow: string;
  tint: JournalSectionTint;
  children?: React.ReactNode;
}

export function JournalSection({ eyebrow, tint, children }: JournalSectionProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors, tint), [colors, tint]);
  return (
    <View style={styles.card}>
      <SectionEyebrow text={eyebrow} tint={eyebrowTintName(tint)} />
      <View style={styles.body}>{children}</View>
    </View>
  );
}

// SectionEyebrow accepts a tint name that maps to a colors key. The card's
// 'neutral' tint corresponds to no explicit tint on the eyebrow (which
// falls back to textTertiary inside SectionEyebrow itself).
function eyebrowTintName(tint: JournalSectionTint): string | undefined {
  if (tint === 'caregiverAccent') return 'caregiverAccent';
  if (tint === 'amber') return 'amber';
  return undefined;
}

function resolveTintColors(
  c: any,
  tint: JournalSectionTint,
): { border: string; bg: string } {
  switch (tint) {
    case 'caregiverAccent':
      return { border: c.caregiverAccent, bg: c.caregiverAccentBg };
    case 'amber':
      return { border: c.amber, bg: c.amberFaint };
    case 'neutral':
      return { border: c.glassStrong, bg: c.glassFaint };
  }
}

function createStyles(c: any, tint: JournalSectionTint) {
  const { border, bg } = resolveTintColors(c, tint);
  return StyleSheet.create({
    card: {
      borderLeftWidth: 3,
      borderLeftColor: border,
      backgroundColor: bg,
      borderRadius: BorderRadius.md,
      paddingVertical: 11,
      paddingHorizontal: 12,
      marginBottom: 10,
    },
    body: {
      marginTop: 7,
    },
  });
}

export default JournalSection;
