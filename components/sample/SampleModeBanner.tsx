// ============================================================================
// SAMPLE MODE BANNER
// Single muted line shown on Now while the user is exploring with example
// data. Tap opens ManageSampleDataSheet (set up vs. remove).
//
// UX-2 pre-launch — pill chrome retired in favour of a quiet text line.
// Pre-UX-2 history (preserved for context):
//   Phase 33b Scope 2 reframed the surface per Q-33b.7 lock: cream pill,
//   small lavender sparkle icon, no border. Pre-33b the entire pill carried
//   lavender chrome (~100% footprint — border + bg + icon + text + chevron).
// UX-2 takes the next step: no pill at all. The sample-mode state is meta /
// system, not section chrome; a single muted line ("✦ Viewing example
// data ›") reads as wayfinding without competing with Now's content.
// The ✦ glyph stays at caregiverAccent as a tiny garnish accent.
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
      accessibilityLabel="Viewing example data. Tap to manage."
      accessibilityHint="Opens the example data sheet to set up your own profile or remove the example."
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
    >
      <Text style={styles.lineText}>
        <Text style={styles.glyph}>{'✦'}</Text>
        <Text>{' Viewing example data '}</Text>
        <Text style={styles.chevron}>{'›'}</Text>
      </Text>
    </TouchableOpacity>
  );
}

const createStyles = (c: any) =>
  StyleSheet.create({
    // UX-2 pre-launch — no pill chrome (no background, no border,
    // no rounded corners). Just a single inline tappable line.
    line: {
      paddingHorizontal: 16, // allow: tap-target padding (Apple HIG ≥44pt)
      paddingVertical: 6,
      marginBottom: 12,
      alignSelf: 'flex-start',
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
    chevron: {
      color: c.textTertiary,
      fontWeight: '500',
    },
  });

export default SampleModeBanner;
