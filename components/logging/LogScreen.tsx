// ============================================================================
// LOG SCREEN — Layout primitive shared by every app/log-*.tsx sub-page.
//
// The pattern (Phase 9.1 of the May 2 logging-flow pass):
//
//   ┌─ header ───────────────────────────────────┐  ~30pt single row
//   │ [←]  Title                                  │
//   │      "0 of 3 today" (countSubtitle, opt.)   │  4pt below title
//   ├──────────────────────────────────────────────┤
//   │  children — the screen's primary input zone │
//   │  (caller owns rhythm/spacing inside)        │
//   ├──────────────────────────────────────────────┤
//   │              ┌──────────┐                    │
//   │              │   Save   │  filled sage CTA   │
//   │              └──────────┘                    │
//   │              Cancel        ghost text link   │
//   └──────────────────────────────────────────────┘
//
// The component is purely structural. It enforces the rhythm and the CTA
// hierarchy contract; it does NOT know anything about meal types, vitals
// fields, mood scales, or any other domain. Children render inside a
// scrolling input zone.
//
// CTA contract (Phase 7 3-accent budget):
//   • Primary CTA filled sage `c.accent` with dark text `#0a1510` —
//     the canonical save/confirm affordance shared with ReflectionCard
//     and the medication-form save row.
//   • Cancel is a ghost text link in `c.textSecondary` — no bg, no
//     border, no fill. Tap area cleared by hitSlop.
//   • No off-budget colors anywhere in the primitive.
// ============================================================================

import React, { useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Sizing } from '../../theme/theme-tokens';
import { useTheme } from '../../contexts/ThemeContext';
import { BackButton } from '../common/BackButton';

export interface LogScreenProps {
  /** Title rendered next to the back button on the compact header row. */
  title: string;
  /** One-line subtitle below the title (e.g. "0 of 3 today"). */
  countSubtitle?: string;
  /** Back-button handler — typically `() => navigateBack()`. */
  onBack: () => void;
  /** The single primary CTA — filled sage. Action verb labelled. */
  primaryAction: {
    label: string;
    onPress: () => void;
    disabled?: boolean;
  };
  /** Whether to render the ghost cancel link below the CTA. Defaults true. */
  showCancel?: boolean;
  /** Cancel handler. Defaults to onBack when omitted. */
  onCancel?: () => void;
  /** The screen's primary input zone — caller owns internal rhythm. */
  children: React.ReactNode;
}

export function LogScreen({
  title,
  countSubtitle,
  onBack,
  primaryAction,
  showCancel = true,
  onCancel,
  children,
}: LogScreenProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={styles.root} testID="log-screen-root">
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        {/* Compact header — back button + title + optional subtitle on a single row */}
        <View style={styles.header} testID="log-screen-header">
          <BackButton onPress={onBack} />
          <View style={styles.titleBlock}>
            <Text style={styles.title} testID="log-screen-title">{title}</Text>
            {countSubtitle ? (
              <Text style={styles.subtitle} testID="log-screen-subtitle">
                {countSubtitle}
              </Text>
            ) : null}
          </View>
        </View>

        {/* Primary input zone — caller renders here */}
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {children}
        </ScrollView>

        {/* Footer — single primary CTA + optional ghost cancel link */}
        <View style={styles.footer}>
          <TouchableOpacity
            testID="log-screen-primary-cta"
            style={[
              styles.primaryCta,
              primaryAction.disabled && styles.primaryCtaDisabled,
            ]}
            onPress={primaryAction.onPress}
            disabled={primaryAction.disabled}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel={primaryAction.label}
            accessibilityState={{ disabled: !!primaryAction.disabled }}
          >
            <Text style={styles.primaryCtaText} testID="log-screen-primary-cta-text">
              {primaryAction.label}
            </Text>
          </TouchableOpacity>

          {showCancel ? (
            <TouchableOpacity
              testID="log-screen-cancel"
              style={styles.cancel}
              onPress={onCancel ?? onBack}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              accessibilityRole="button"
              accessibilityLabel="Cancel"
            >
              <Text style={styles.cancelText} testID="log-screen-cancel-text">
                Cancel
              </Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </SafeAreaView>
    </View>
  );
}

const createStyles = (c: typeof Colors) => StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: c.background,
  },
  // Compact header — single ~30pt row holding the back button + title
  // (subtitle wraps to a second line below the title, not a new row).
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14, // allow: tap-target padding (Apple HIG ≥44pt)
    paddingTop: 12,
    paddingBottom: 12,
    gap: 12,
  },
  titleBlock: {
    flex: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: c.textPrimary,
  },
  subtitle: {
    fontSize: 12,
    color: c.textSecondary,
    marginTop: 2,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 8,
    paddingHorizontal: 14, // allow: tap-target padding (Apple HIG ≥44pt)
    paddingBottom: 24,
  },
  footer: {
    paddingHorizontal: 14, // allow: tap-target padding (Apple HIG ≥44pt)
    paddingTop: 12,
    paddingBottom: 16,
    alignItems: 'center',
    gap: 12,
  },
  primaryCta: {
    width: '100%',
    height: Sizing.buttonHeight,
    borderRadius: Sizing.buttonRadius,
    backgroundColor: c.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryCtaDisabled: {
    opacity: 0.5,
  },
  primaryCtaText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0a1510',
  },
  cancel: {
    paddingVertical: 4,
  },
  cancelText: {
    fontSize: 13,
    color: c.textSecondary,
  },
});

export default LogScreen;
