// ============================================================================
// HEROSHEET — Design-Lock §3 hero-plane → content-sheet scaffold.
//
// Every main tab reads as: a calm hero plane (near-solid two-stop gradient +
// ONE faint glow — no busy multi-radial, no leaf motifs) with a content sheet
// rising over it (figure-ground split). The sheet overlaps the hero
// (marginTop −18/−22), has a rounded top, a seam shadow, and a grab handle.
// Generous air; the sheet starts low enough that the hero breathes.
//
// Foundation primitive for the Phase-1 tab rebuilds. The whole thing scrolls
// as one (hero scrolls away with the sheet) unless `scroll={false}`. Hero
// content goes in `hero`; sheet content is `children`.
// ============================================================================

import React, { useMemo } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  ViewStyle,
  StyleProp,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '../../theme/theme-tokens';
import { useTheme } from '../../contexts/ThemeContext';

export interface HeroSheetProps {
  /** Hero-plane content (greeting / title / narrative). */
  hero: React.ReactNode;

  /** Sheet content (the screen body). */
  children: React.ReactNode;

  /** Wrap the sheet body in a ScrollView (default true). */
  scroll?: boolean;

  /** Hero plane min height (default 200). */
  heroMinHeight?: number;

  /** How far the sheet rises over the hero (lock −18/−22; default 20). */
  sheetOverlap?: number;

  /** Extra styles for the sheet container. */
  sheetStyle?: StyleProp<ViewStyle>;

  /** Extra styles for the scroll content container. */
  contentContainerStyle?: StyleProp<ViewStyle>;

  testID?: string;
}

export const HeroSheet: React.FC<HeroSheetProps> = ({
  hero,
  children,
  scroll = true,
  heroMinHeight = 200,
  sheetOverlap = 20,
  sheetStyle,
  contentContainerStyle,
  testID,
}) => {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const heroPlane = (
    <LinearGradient
      colors={[colors.heroGradientStart, colors.heroGradientEnd]}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
      style={[styles.hero, { minHeight: heroMinHeight }]}
      testID={testID ? `${testID}-hero` : undefined}
    >
      {/* ONE faint glow (lock §3) — soft low-opacity wash, not a radial lib. */}
      <View
        style={[styles.heroGlow, { backgroundColor: colors.heroGlow }]}
        pointerEvents="none"
      />
      {hero}
    </LinearGradient>
  );

  const sheet = (
    <View
      style={[styles.sheet, { marginTop: -sheetOverlap }, sheetStyle]}
      testID={testID ? `${testID}-sheet` : undefined}
    >
      {/* Grab handle — the seam affordance. */}
      <View style={styles.grabHandle} pointerEvents="none" />
      {children}
    </View>
  );

  return (
    <View style={styles.page} testID={testID}>
      {scroll ? (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={contentContainerStyle}
        >
          {heroPlane}
          {sheet}
        </ScrollView>
      ) : (
        <>
          {heroPlane}
          {sheet}
        </>
      )}
    </View>
  );
};

const createStyles = (c: typeof Colors) =>
  StyleSheet.create({
    page: {
      flex: 1,
      backgroundColor: c.background,
    },
    hero: {
      paddingTop: 56,
      paddingHorizontal: 20,
      paddingBottom: 36, // generous air — sheet starts low so hero breathes
      overflow: 'hidden',
      position: 'relative',
    },
    heroGlow: {
      position: 'absolute',
      top: -60,
      right: -40,
      width: 220,
      height: 220,
      borderRadius: 110,
      opacity: 1,
    },
    sheet: {
      backgroundColor: c.sheet,
      borderTopLeftRadius: 28,
      borderTopRightRadius: 28,
      paddingTop: 10,
      paddingHorizontal: 16,
      paddingBottom: 32,
      minHeight: 400,
      // Seam shadow — the sheet casts up onto the hero.
      shadowColor: '#000',
      shadowOffset: { width: 0, height: -3 },
      shadowOpacity: 0.18,
      shadowRadius: 12,
      elevation: 8,
    },
    grabHandle: {
      alignSelf: 'center',
      width: 36,
      height: 4,
      borderRadius: 2,
      backgroundColor: c.glassBorder,
      marginBottom: 12,
    },
  });

export default HeroSheet;
