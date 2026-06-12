// ============================================================================
// SAMPLE MODE BANNER
// Single muted line shown on Now while the user is exploring with example
// data. Tap opens ManageSampleDataSheet (set up vs. remove).
//
// Surface history (preserved for context):
//   • Pre-33b: full lavender pill chrome (~100% footprint — border + bg +
//     icon + text + chevron).
//   • Phase 33b Scope 2: cream pill + lavender ✦ glyph garnish, no border.
//   • UX-2: pill chrome retired. Single inline tappable line with a
//     trailing "›" chevron.
//   • UX-2 follow-up (post device walk): chevron retired in favour of
//     "· Switch" inline copy so the line reads as a sentence-with-action
//     rather than a button. The whole line is still tappable; the
//     "Switch" word makes the affordance explicit without button chrome.
//
// The ✦ glyph stays at caregiverAccent as a tiny wayfinding garnish.
// ============================================================================

import React, { useMemo } from 'react';
import { Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';

export interface SampleModeBannerProps {
  isSampleMode: boolean;
  onPress: () => void;
}

export function SampleModeBanner({ isSampleMode, onPress }: SampleModeBannerProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  if (!isSampleMode) return null;

  return (
    <TouchableOpacity
      style={styles.line}
      onPress={onPress}
      activeOpacity={0.6}
      accessibilityRole="button"
      accessibilityLabel="Viewing example data. Tap to switch."
      accessibilityHint="Opens the example data sheet to set up your own profile or remove the example."
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
    >
      <Text style={styles.lineText}>
        <Text style={styles.glyph}>{'✦'}</Text>
        <Text>{' Viewing example data · '}</Text>
        <Text style={styles.switchWord}>Switch</Text>
      </Text>
    </TouchableOpacity>
  );
}

const createStyles = (c: any) =>
  StyleSheet.create({
    // UX-2 follow-up — no pill chrome at all. No padding scaffolding,
    // no alignSelf gimmick. Just a single muted line sitting beneath
    // the date row of NowHeader (rendered by Now between the header
    // and the FirstTimeWelcome / StatRings chain).
    line: {
      marginBottom: 12,
    },
    lineText: {
      fontSize: 13,
      color: c.textTertiary,
      letterSpacing: 0.1,
    },
    // Lavender sparkle garnish — the only colored token on this surface.
    glyph: {
      color: c.caregiverAccent,
    },
    // "Switch" reads in the same muted tone as the rest of the line, but
    // slightly stronger weight so the affordance is discoverable. Stays
    // textTertiary — no sage / lavender pop here.
    switchWord: {
      color: c.textTertiary,
      fontWeight: '600',
    },
  });

export default SampleModeBanner;
