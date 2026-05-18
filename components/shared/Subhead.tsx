// ============================================================================
// Subhead — witness-voice subhead component (Phase 33b Scope 1)
//
// Renders directly below the canonical greeting block on Now + You tabs
// (and any future surface that wants a paired greeting + witness-voice
// line). Carries the italic-serif register that Phase 33b moved OUT of
// the greeting line per the Path 2 lock that superseded Q-33.5's
// italic-greeting interpretation.
//
// v1.0 / Phase 33b ships this component EMPTY/NULL per Path A discipline
// (Q-33b.3 lock). No consumer sites wire content yet. v1.1 fills via
// rewritten caregiverWitnessBuilder, at which point:
//   • NowGreeting renders Subhead below dateSubtitle (Q-33b.5 path a —
//     3-line stack: greeting / dateSubtitle / subhead)
//   • support.tsx greeting renders Subhead below greeting (between
//     greeting and caregiverChip — final placement re-evaluated when
//     subhead content fills per Q-33b.5)
//   • AffirmationHeader retires in v1.1 with Subhead absorbing its role
//     per project_witness_voice_v1_1_backlog.md coupled-item plan
//
// Style canonical per project_brand_alignment_canon.md `.phone-greeting-sub`:
//   font-size: 14
//   color: text-secondary (cream-tan, dimmer than greeting's textPrimary)
//   line-height: 1.5 → 21pt at 14pt fontSize
//   margin-top: --s2 (= 8pt) — Phase 33b uses Spacing.s2
//   font-family: italic serif — Phase 33b uses Fonts.serifItalic
//   font-weight: 400
//   font-style: italic
//
// Null-handling: when children is falsy (null / undefined / empty
// string), Subhead returns null. No phantom whitespace, no marginTop
// allocated for nothing. Consumers can safely use either:
//   <Subhead>{maybeText}</Subhead>   // Subhead handles null internally
//   {maybeText ? <Subhead>{maybeText}</Subhead> : null}  // explicit guard
// Both patterns yield identical zero-footprint behavior when text is
// absent.
// ============================================================================

import React, { useMemo } from 'react';
import { Text, StyleSheet } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { Colors, Spacing, Fonts } from '../../theme/theme-tokens';

export interface SubheadProps {
  children?: string | null;
}

export function Subhead({ children }: SubheadProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  if (!children || (typeof children === 'string' && children.trim().length === 0)) {
    return null;
  }
  return <Text style={styles.text}>{children}</Text>;
}

const createStyles = (c: typeof Colors) =>
  StyleSheet.create({
    text: {
      fontFamily: Fonts.serifItalic,
      fontStyle: 'italic' as const,
      fontSize: 14,
      fontWeight: '400' as const,
      lineHeight: 21,
      marginTop: Spacing.s2,
      color: c.textSecondary,
    },
  });

export default Subhead;
