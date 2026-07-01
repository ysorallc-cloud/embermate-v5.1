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
import { FlagIcon, RecordIcon, HandoffIcon } from './JournalSectionIcons';

// Journal rebuild S2 (journal-aligned) — the SOAP frame's chrome changed from
// a 2px LEFT RULE to the mockup's form: a double-line divider above a
// color-coded caps header with an icon. Tint drives the header color + icon.
export type SoapSectionTint = 'caregiverAccent' | 'amber' | 'neutral' | 'sage' | 'coral' | 'blue';
export type SoapSectionIcon = 'flag' | 'record' | 'handoff';

export interface SoapSectionFrameProps {
  eyebrow: string;
  tint: SoapSectionTint;
  /** Optional caps-header glyph, colored to match the tint. */
  icon?: SoapSectionIcon;
  children?: React.ReactNode;
}

export function SoapSectionFrame({ eyebrow, tint, icon, children }: SoapSectionFrameProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const color = sectionColor(colors, tint);
  return (
    <View style={styles.frame}>
      <View style={styles.dblWrap}>
        <View style={styles.dbl1} />
        <View style={styles.dbl2} />
      </View>
      <View style={styles.header}>
        {icon ? renderIcon(icon, color) : null}
        <SectionEyebrow text={eyebrow} tint={eyebrowTintKey(tint)} />
      </View>
      {children}
    </View>
  );
}

function renderIcon(icon: SoapSectionIcon, color: string): React.ReactNode {
  if (icon === 'flag') return <FlagIcon color={color} />;
  if (icon === 'record') return <RecordIcon color={color} />;
  if (icon === 'handoff') return <HandoffIcon color={color} />;
  return null;
}

// SectionEyebrow resolves a tint that is a colors KEY. 'neutral' returns
// undefined so it falls back to textTertiary.
function eyebrowTintKey(tint: SoapSectionTint): string | undefined {
  if (tint === 'caregiverAccent') return 'caregiverAccent';
  if (tint === 'amber') return 'amber';
  if (tint === 'sage') return 'accent';
  if (tint === 'coral') return 'coral';
  if (tint === 'blue') return 'blue';
  return undefined; // neutral
}

function sectionColor(c: any, tint: SoapSectionTint): string {
  switch (tint) {
    case 'caregiverAccent': return c.caregiverAccent;
    case 'amber': return c.amber;
    case 'sage': return c.accent;
    case 'coral': return c.coral;
    case 'blue': return c.blue;
    case 'neutral':
    default: return c.textTertiary;
  }
}

function createStyles(c: any) {
  return StyleSheet.create({
    frame: {
      marginBottom: Spacing.lg,
    },
    // Double-line divider (journal-aligned `.dbl-wrap`): a firmer line over a
    // fainter one, marking the section boundary.
    dblWrap: {
      marginVertical: 8,
    },
    dbl1: {
      height: 1,
      backgroundColor: c.glassBorder,
    },
    dbl2: {
      height: 1,
      backgroundColor: c.hairlineInset,
      marginTop: 2,
    },
    // Header row: icon + caps eyebrow.
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 9,
    },
  });
}

export default SoapSectionFrame;
