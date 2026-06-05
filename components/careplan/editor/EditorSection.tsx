// ============================================================================
// EditorSection — Phase 34 F5.0 primitive.
//
// One labeled sub-block (header + optional narration + body slot) that
// the four v1 care-plan editor drawers (Meds, Wellness-split, Meals,
// Vitals) compose to form their What → When → Reminder skeletons.
//
// Pure presentational: the primitive owns no state. Adopting drawers
// retain ownership of their data + interaction. The primitive's only
// purpose is to standardize the chrome so every editor looks and works
// the same — the F5 plan's load-bearing visual invariant.
//
// CONTRACT (pinned by __tests__/components/editorSection34F5_0.test.tsx):
//
//   1. TITLE renders with the existing-drawer uppercase header chrome
//      (fontSize 10, fontWeight 600, letterSpacing 1.5, uppercase,
//      textTertiary). Matches VitalsDrawer / MealsDrawer /
//      WellnessDrawer existing `label` rules verbatim so adopting
//      drawers can retire their inline label styles with zero visual
//      regression.
//   2. `narration` is optional. When set to a non-blank string, a
//      Text node renders below the title in textSecondary. When
//      undefined / empty / whitespace-only, NO Text node renders —
//      no empty-string ghost, no collapsed spacing.
//   3. BODY slot — children render below the title (and below the
//      narration when present). The primitive does not wrap or
//      restyle children.
//   4. NO STATE OWNED — re-rendering with different props produces
//      the corresponding tree without sticky state.
//
// CONSUMED BY: F5.1 (Vitals), F5.2 (Meals), F5.3 (Wellness split),
//              F5.4 (Meds). Each adoption lands in its own atomic
//              commit per the standing pattern.
// ============================================================================

import React from 'react';
import { View, Text, StyleSheet, type ViewStyle } from 'react-native';
import { useTheme } from '../../../contexts/ThemeContext';

export interface EditorSectionProps {
  /** Section header text. Rendered with the uppercase chrome shared
   *  across the existing care-plan drawers. */
  title: string;
  /** Optional one-sentence caregiver-facing narration. When set to a
   *  non-blank string, renders below the title in the secondary tone.
   *  When undefined / empty / whitespace-only, the narration Text
   *  node is omitted entirely (no empty-line ghost). */
  narration?: string;
  /** Optional style override on the outer wrapper. Adopting drawers
   *  use this for per-instance spacing adjustments only; structural
   *  chrome (title + narration) is non-overridable by design. */
  style?: ViewStyle;
  /** Body slot — chips, list, switch row, etc. Rendered verbatim. */
  children: React.ReactNode;
}

export function EditorSection({
  title,
  narration,
  style,
  children,
}: EditorSectionProps) {
  const { colors } = useTheme();
  const trimmedNarration = (narration ?? '').trim();
  const showNarration = trimmedNarration.length > 0;

  return (
    <View style={[styles.container, style]}>
      <Text
        testID="editor-section-title"
        style={[styles.title, { color: colors.textTertiary }]}
      >
        {title}
      </Text>
      {showNarration && (
        <Text
          testID="editor-section-narration"
          style={[styles.narration, { color: colors.textSecondary }]}
        >
          {trimmedNarration}
        </Text>
      )}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 12,
  },
  // Mirrors the shared `label` chrome in VitalsDrawer / MealsDrawer /
  // WellnessDrawer (fontSize 10 / weight 600 / letterSpacing 1.5 /
  // uppercase / textTertiary). Adopting drawers retire their inline
  // `styles.label` and route through this primitive.
  title: {
    fontSize: 10,
    fontWeight: '600' as const,
    letterSpacing: 1.5,
    textTransform: 'uppercase' as const,
    marginBottom: 6,
  },
  // The narration line is the new F5 chrome — the calm caregiver-
  // facing sentence under each section. textSecondary keeps it one
  // weight quieter than primary content but warmer than the
  // textTertiary uppercase title.
  narration: {
    fontSize: 12,
    lineHeight: 16,
    marginBottom: 8,
  },
});
