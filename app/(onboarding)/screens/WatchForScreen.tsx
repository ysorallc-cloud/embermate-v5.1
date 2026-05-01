// ============================================================================
// WATCH FOR SCREEN
//
// "Things to watch for" — one card per condition with 3-4 caregiver-natural
// items. Designed to be reused: the onboarding flow renders this with
// onContinue → "Get Started", Settings renders it without onSkip and with
// onContinue → navigateBack().
//
// Onboarding integration (Phase 3) is parked until the onboarding flow gains
// a conditions-capture step. Until then the screen is consumed by Settings
// only — the contract is identical and ready to slot in.
// ============================================================================

import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useTheme } from '../../../contexts/ThemeContext';
import {
  getWatchlistForCondition,
  CUSTOM_CONDITION_FALLBACK,
} from '../../../data/conditionWatchlists';
import { WatchForCard } from '../../../components/watchFor/WatchForCard';

export interface WatchForScreenProps {
  /** Free-text condition strings to render — typically pulled from
      MedicalInfo.diagnoses or the onboarding patient-setup step. */
  conditions: string[];
  onContinue: () => void;
  /** Hide the Skip-for-now link by leaving onSkip undefined. */
  onSkip?: () => void;
  /** Optional override for the title (e.g. Settings vs onboarding tone). */
  title?: string;
  /** Optional subtitle override (Settings shows Last shown / extra context). */
  subtitle?: string;
}

export function WatchForScreen({
  conditions,
  onContinue,
  onSkip,
  title = 'Things to watch for',
  subtitle = "For each condition you've added.",
}: WatchForScreenProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={styles.root}>
      <View style={styles.headerRow}>
        <View style={{ flex: 1 }} />
        {onSkip && (
          <TouchableOpacity
            testID="watch-for-skip"
            onPress={onSkip}
            accessibilityRole="button"
            accessibilityLabel="Skip for now"
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={styles.skipLink}>{'Skip for now'}</Text>
          </TouchableOpacity>
        )}
      </View>

      <Text style={styles.title}>{title}</Text>
      <Text style={styles.subtitle}>{subtitle}</Text>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {conditions.map((conditionInput) => {
          const list = getWatchlistForCondition(conditionInput);
          // testID matches the library conditionId for known conditions;
          // for custom strings, fall back to a slugged input so tests can
          // still target it deterministically.
          const slug = list?.conditionId
            ?? conditionInput.toLowerCase().replace(/[^a-z0-9]+/g, '_');
          return (
            <WatchForCard
              key={slug}
              testID={`watch-for-card-${slug}`}
              displayName={list?.displayName || conditionInput}
              watchlist={list}
              fallback={CUSTOM_CONDITION_FALLBACK}
            />
          );
        })}

        <Text style={styles.footerHint}>
          You can find this list anytime in Settings → What to watch for.
        </Text>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          testID="watch-for-continue"
          style={styles.continueButton}
          onPress={onContinue}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="Continue"
        >
          <Text style={styles.continueText}>{'Continue →'}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const createStyles = (c: any) => StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: c.background,
    paddingHorizontal: 20,
    paddingTop: 56,
    paddingBottom: 24,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    minHeight: 24,
    marginBottom: 12,
  },
  skipLink: {
    fontSize: 12,
    color: c.textTertiary,
    fontWeight: '500',
  },
  title: {
    fontSize: 32,
    fontWeight: '300',
    color: c.textPrimary,
    letterSpacing: -0.5,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 13,
    color: c.textSecondary,
    lineHeight: 20,
    marginBottom: 20,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  footerHint: {
    fontSize: 11,
    color: c.textTertiary,
    marginTop: 8,
    fontStyle: 'italic',
    lineHeight: 17,
  },
  footer: {
    paddingTop: 12,
    borderTopWidth: 0.5,
    borderTopColor: c.glassHover,
  },
  continueButton: {
    backgroundColor: c.accent,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  continueText: {
    fontSize: 14,
    fontWeight: '600',
    color: c.textPrimary,
  },
});

export default WatchForScreen;
