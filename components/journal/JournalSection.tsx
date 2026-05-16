// ============================================================================
// JOURNAL SECTION — Phase 27 (extended by Phase 28).
//
// Generic outer card wrapping section-shaped content surfaces. Owns the
// section's color encoding (3px left border + 0.06-alpha background tint),
// the eyebrow at the top of the card, and the dimensional rhythm shared
// across consumers (radius / padding / sibling gap).
//
// Despite the file name, the primitive is consumed beyond Journal — Phase 28
// uses it for the Insights three-card restructure. Renaming deferred; the
// rename has zero behavioral payoff and touches every Journal consumer.
//
// Supported tints (Phase 28 D1 — Option A added 'sage'):
//   • 'caregiverAccent' — lavender — Journal Subjective + Plan; Insights
//                                    WHAT'S AHEAD (Phase 28 Section 3).
//   • 'amber'           — amber   — Journal Assessment.
//   • 'neutral'         — quiet   — Journal Objective; Insights THE DATA
//                                   (Phase 28 Section 2). Border routes
//                                   through textTertiary (Phase 27.5a Bug
//                                   1 fix) and bg through glassFaint.
//   • 'sage'            — green   — Insights THE READ (Phase 28 Section 1).
//                                   Border c.accent (#5fb88a), bg
//                                   c.accentFaint (rgba 0.06). The "sage"
//                                   label here is GREEN sage; theme-tokens'
//                                   `sage` family is misleadingly named
//                                   lavender and is NOT what's used here.
//                                   Phase 28 D1 picked the green encoding
//                                   to keep the three-card semantic
//                                   separation (read / data / ahead).
//
// The component owns chrome only — children render whatever content the
// section requires.
// ============================================================================

import React, { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { SectionEyebrow } from '../SectionEyebrow';
import { BorderRadius } from '../../theme/theme-tokens';

export type JournalSectionTint = 'caregiverAccent' | 'amber' | 'neutral' | 'sage';

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
  if (tint === 'sage') return 'accent';
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
      // Phase 27.5a Bug 1 — neutral border was c.glassStrong (rgba
      // alpha 0.18). At that alpha the 3px border was barely
      // perceptible compared to the full-opacity hex borders on the
      // other two tints. Phase 27 spec said "full color, not muted
      // alpha"; textTertiary is the opaque-neutral counterpart and
      // matches the SectionEyebrow's default color (Section 2's
      // eyebrow has no `tint` prop → falls back to textTertiary),
      // so the border becomes the eyebrow's structural extension.
      // bg stays glassFaint — the body wash should remain quiet.
      return { border: c.textTertiary, bg: c.glassFaint };
    case 'sage':
      // Phase 28 D1 — green sage (c.accent #5fb88a) at the same
      // 0.06 alpha as the lavender + amber tints. c.accentFaint
      // was already provisioned in dark + light theme tokens; no
      // new token additions needed. The "sage" label is local to
      // this enum — theme-tokens' `sage` family is unrelated
      // (misleadingly-named lavender, not consumed here).
      return { border: c.accent, bg: c.accentFaint };
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
