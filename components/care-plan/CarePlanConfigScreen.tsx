// ============================================================================
// CARE PLAN CONFIG SCREEN — Layout primitive shared by every
// app/care-plan/<bucket>.tsx config screen.
//
// Phase 10.1 of the Care Plan config pass. Mirrors the LogScreen
// primitive's role: owns the page rhythm so consumers focus on their
// configuration content, not chrome plumbing.
//
// ┌─ chrome ────────────────────────────────────┐  background variant
// │                                              │  selected by consumer
// │  ┌─ header ────────────────────────────────┐ │  ~32pt single row +
// │  │ [←]  Title                              │ │  optional subtitle
// │  │      "Set up the bucket." (subtitle)    │ │
// │  ├──────────────────────────────────────────┤ │
// │  │  ScrollView                              │ │
// │  │   children — caller owns rhythm inside   │ │
// │  └──────────────────────────────────────────┘ │
// └──────────────────────────────────────────────┘
//
// ## Chrome variants
//
//   • gradient        — bucket-config family (flat warm-charcoal page)
//                       Default. Used by activity / meals / sleep /
//                       vitals / water / wellness / meds.
//   • aurora-care     — coordination screens (errands / shifts).
//   • aurora-support  — self-care screen.
//   • aurora-log      — regimen-management screens (manage).
//
// The Aurora variants are intentional UX signals already established
// in the codebase pre-Phase 10. The primitive preserves them rather
// than forcing visual unification — the audit at 10.0 confirmed they
// reflect distinct user contexts.
//
// ## Patient-agnostic
//
// The primitive does NOT read or interpolate the patient name. Phase
// 10's copy pass dropped per-screen patient-name echoes; the primitive
// must not reintroduce them. Patient context surfaces through the
// screen header in the four-tab shell, not through every config
// subtitle.
// ============================================================================

import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Spacing } from '../../theme/theme-tokens';
import { useTheme } from '../../contexts/ThemeContext';
import { BackButton } from '../common/BackButton';
import { AuroraBackground } from '../aurora/AuroraBackground';

export type CarePlanConfigChrome =
  | 'gradient'
  | 'aurora-care'
  | 'aurora-support'
  | 'aurora-log';

export interface CarePlanConfigScreenProps {
  /** Title rendered next to the back button. Single line. */
  title: string;
  /** Optional subtitle rendered under the title. No patient-name interpolation. */
  subtitle?: string;
  /** Background chrome variant. Defaults to 'gradient' (flat page). */
  chrome?: 'gradient' | 'aurora-care' | 'aurora-support' | 'aurora-log';
  /** Back-button handler — typically `() => navigateBack()`. */
  onBack: () => void;
  /** The screen's configuration body — caller owns internal rhythm. */
  children: React.ReactNode;
}

const CHROME_TO_AURORA: Partial<
  Record<CarePlanConfigChrome, 'care' | 'support' | 'log'>
> = {
  'aurora-care': 'care',
  'aurora-support': 'support',
  'aurora-log': 'log',
};

export function CarePlanConfigScreen({
  title,
  subtitle,
  chrome = 'gradient',
  onBack,
  children,
}: CarePlanConfigScreenProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const auroraVariant = CHROME_TO_AURORA[chrome];

  return (
    <View style={styles.root}>
      {auroraVariant ? <AuroraBackground variant={auroraVariant} /> : null}
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.header} testID="careplan-config-header">
          <TouchableOpacity
            testID="careplan-config-back"
            onPress={onBack}
            accessibilityRole="button"
            accessibilityLabel="Go back"
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            style={styles.backButton}
          >
            <BackButton onPress={onBack} />
          </TouchableOpacity>
          <View style={styles.titleBlock}>
            <Text style={styles.title} testID="careplan-config-title">
              {title}
            </Text>
            {subtitle ? (
              <Text
                style={styles.subtitle}
                testID="careplan-config-subtitle"
              >
                {subtitle}
              </Text>
            ) : null}
          </View>
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {children}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const createStyles = (c: typeof Colors) => StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: c.background,
  },
  safeArea: {
    flex: 1,
  },
  // Compact header — ~32pt paddingTop matches the four-tab contract
  // pinned in Phase 5.13.4 (combined with the safe-area inset, this
  // gives roughly the same total breathing-room without eating the
  // ~12% of screen height the legacy 56pt produced on notched phones).
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 14, // allow: page-rhythm horizontal inset
    paddingTop: 32,
    paddingBottom: Spacing.md,
    gap: 12, // allow: tap-target spacing between back button and title block
  },
  backButton: {
    // BackButton component owns its own visuals; this wrapper just
    // anchors the tap target on the row.
  },
  titleBlock: {
    flex: 1,
  },
  title: {
    fontSize: 22,
    fontWeight: '500',
    color: c.textPrimary,
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 13,
    color: c.textSecondary,
    lineHeight: 18,
    marginTop: 4,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 14, // allow: page-rhythm horizontal inset
    paddingBottom: Spacing.xl,
  },
});
