// ============================================================================
// SOAP SECTION FRAME — Phase 27 (F1, 2026-05-21).
//
// SCOPE — IMPORTANT
//
// This frame is used ONLY by the four SOAP sections in the Journal tab's
// Today view (Subjective / Objective / Assessment / Plan). It is NOT a
// general-purpose primitive and MUST NOT be picked up by other surfaces.
//
// JournalSection (components/journal/JournalSection.tsx) remains the
// canonical primitive for the rest of the app (Insights, GestaltSummary,
// TodayNotableMoments' non-SOAP code paths, etc.). Phase 27 Q-27.6 lock:
// inline the new left-rule chrome at the SOAP sites only; leave the
// JournalSection primitive untouched so the chrome change does NOT
// cascade into Insights or other consumers. The Insights redesign is
// separately locked and will set its own chrome.
//
// VISUAL SPEC — banked Journal-cleanup design
//
//   • 2px left rule in the section's tint color. No surrounding border.
//   • No border-radius (no card outline).
//   • No background tint (flat against page; lavender no-fill canon).
//   • 16pt horizontal padding from the left rule to content (Q-27.1.b).
//   • Vertical breathing room above + below content (Spacing.sm).
//   • Generous sibling-section gap so flat sections read as distinct
//     beats (marginBottom Spacing.lg = 28pt).
//   • Eyebrow at the top, routed through SectionEyebrow primitive so
//     canon eyebrow scale + letterSpacing + bottom margin all inherit.
//
// TINT ROLES — preserved from JournalSection's enum
//
//   • caregiverAccent — lavender — Sections 1 (Subjective) + 4 (Plan).
//                       Caregiver→clinician lane bookends.
//   • amber           — Section 3 (Assessment / "Worth flagging").
//   • neutral         — Section 2 (Objective). Border routes through
//                       textTertiary; matches the SectionEyebrow's
//                       default fallback color so the rule reads as a
//                       structural extension of the eyebrow.
//   • sage            — currently unused by SOAP sites but declared for
//                       symmetry with JournalSection's tint enum, so a
//                       future SOAP-section tint swap is a one-key edit.
//
// LAVENDER NO-FILL CANON
//
// The lavender 2px left rule on Sections 1 + 4 uses the bare
// `c.caregiverAccent` token as a thin accent (border, not fill) —
// permitted by the lavender no-fill canon shipped 2026-05-21 (commits
// 562e4010 + 2d83e70f). Eyebrow text on the same sections uses the
// same token as a small-text color, also permitted.
// ============================================================================

import React, { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { SectionEyebrow } from '../SectionEyebrow';
import { Spacing } from '../../theme/theme-tokens';

export type SoapSectionTint = 'caregiverAccent' | 'amber' | 'neutral' | 'sage';

export interface SoapSectionFrameProps {
  eyebrow: string;
  tint: SoapSectionTint;
  children?: React.ReactNode;
}

export function SoapSectionFrame({ eyebrow, tint, children }: SoapSectionFrameProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors, tint), [colors, tint]);
  return (
    <View style={styles.frame}>
      <SectionEyebrow text={eyebrow} tint={eyebrowTintKey(tint)} />
      {children}
    </View>
  );
}

// SectionEyebrow consumes a tint NAME that maps to a colors key. Maps the
// SOAP-section tint enum to the corresponding eyebrow tint key. 'neutral'
// returns undefined so SectionEyebrow falls back to its default
// textTertiary — same logic as JournalSection's mapping.
function eyebrowTintKey(tint: SoapSectionTint): string | undefined {
  if (tint === 'caregiverAccent') return 'caregiverAccent';
  if (tint === 'amber') return 'amber';
  if (tint === 'sage') return 'accent';
  return undefined;
}

function ruleColor(c: any, tint: SoapSectionTint): string {
  switch (tint) {
    case 'caregiverAccent':
      return c.caregiverAccent;
    case 'amber':
      return c.amber;
    case 'sage':
      return c.accent;
    case 'neutral':
      // Matches JournalSection neutral border treatment (Phase 27.5a Bug
      // 1 precedent) — opaque textTertiary so the 2px rule reads as the
      // eyebrow's structural extension.
      return c.textTertiary;
  }
}

function createStyles(c: any, tint: SoapSectionTint) {
  return StyleSheet.create({
    frame: {
      borderLeftWidth: 2,
      borderLeftColor: ruleColor(c, tint),
      paddingLeft: Spacing.s4, // 16pt — Q-27.1.b
      paddingTop: Spacing.sm,
      paddingBottom: Spacing.sm,
      marginBottom: Spacing.lg,
    },
  });
}

export default SoapSectionFrame;
