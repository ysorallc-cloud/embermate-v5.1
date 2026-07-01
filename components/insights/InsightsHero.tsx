// ============================================================================
// INSIGHTS HERO — the content of the HeroSheet hero plane (insights-hero).
//
// Title + range segment (top row), subtitle, then the signature object:
//   • ready  → AdherenceRing + read-line
//   • !ready → PatternsComing (honest pre-data state; NO 0%/grey ring)
//
// The ring vs pre-data choice is made upstream (getRingReadiness) and passed
// in as `readiness` — this component just renders the chosen surface.
// ============================================================================

import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, Fonts, Spacing } from '../../theme/theme-tokens';
import { useTheme } from '../../contexts/ThemeContext';
import { AdherenceRing } from './AdherenceRing';
import { InsightsReadLine } from './InsightsReadLine';
import {
  buildAdherenceRead,
  ringWindowLabel,
  type RingReadiness,
} from '../../utils/insightsHero';

export interface InsightsHeroProps {
  title: string;
  subtitle?: string | null;
  /** The 7d/14d/30d range toggle, rendered top-right. */
  segment?: React.ReactNode;
  readiness: RingReadiness;
  /** Canonical adherence for the selected window (drives the ring % + read). */
  adherence: { rate: number; taken: number; total: number; windowDays: number } | null;
}

export function InsightsHero({ title, subtitle, segment, readiness, adherence }: InsightsHeroProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={styles.hero}>
      <View style={styles.topRow}>
        <Text style={styles.title} accessibilityRole="header">{title}</Text>
        {segment ? <View style={styles.segment}>{segment}</View> : null}
      </View>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}

      {/* The signature ring appears ONLY when there's enough logged history.
          Below threshold the hero stays calm (title + subtitle); the honest
          pre-data "PATTERNS COMING" state lives in the sheet
          (InsightsEmptyStatePreview) — never a 0%/grey ring here. */}
      {readiness.ready && adherence ? (
        <View style={styles.object}>
          <AdherenceRing
            pct={adherence.rate}
            windowLabel={ringWindowLabel(adherence.windowDays)}
            testID="insights-adherence-ring"
          />
          <View style={{ height: 14 }} />
          <InsightsReadLine
            segments={buildAdherenceRead(adherence)}
            testID="insights-read-line"
          />
        </View>
      ) : null}
    </View>
  );
}

const createStyles = (c: typeof Colors) =>
  StyleSheet.create({
    hero: {
      paddingHorizontal: 20,
      paddingTop: 8,
    },
    topRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    title: {
      fontFamily: Fonts.title,
      fontSize: 30,
      letterSpacing: 0.2,
      color: c.textPrimary,
    },
    segment: {
      marginLeft: 12,
    },
    subtitle: {
      fontFamily: Fonts.body,
      fontSize: 13.5,
      lineHeight: 19,
      color: c.textSecondary,
      marginTop: 4,
    },
    object: {
      alignItems: 'center',
      marginTop: Spacing.md,
    },
  });

export default InsightsHero;
