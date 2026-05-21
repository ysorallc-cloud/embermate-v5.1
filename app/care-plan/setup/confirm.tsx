// ============================================================================
// CARE PLAN SETUP — STEP 3 (CONFIRM) — Phase 5.13.d.
//
// Final wizard step. Reads the carePlanConfig that step 2 wrote and
// renders two sections:
//
//   CORE — ALWAYS ON   meds + vitals (always-on for v1; clinical safety)
//                      Required, not toggleable. Shown for transparency.
//   OPTIONAL           every other bucket; flat toggle row per bucket.
//                      Toggling persists immediately via setBucketEnabled.
//
// On Done:
//   • Marks @embermate_first_real_mode_landed = 'false' so the Now-tab
//     welcome card (5.13.e) shows once.
//   • clearWizardProgress()
//   • router.replace('/(tabs)/now') — replace, not push, so back button
//     does not re-enter the wizard.
//
// "Start blank" template path: step 2 didn't write any buckets, so the
// CORE section is empty and OPTIONAL renders every bucket toggled off.
// ============================================================================

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Switch,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { useTheme } from '../../../contexts/ThemeContext';
import { Spacing, Sizing } from '../../../theme/theme-tokens';
import { useActivePatientName } from '../../../hooks/useActivePatientName';
import {
  BUCKET_TYPES,
  BUCKET_META,
  PRIMARY_BUCKETS,
  SECONDARY_BUCKETS,
  OPTIONAL_BUCKETS,
  type BucketType,
  type CarePlanConfig,
} from '../../../types/carePlanConfig';
import {
  getOrCreateCarePlanConfig,
  setBucketEnabled,
} from '../../../storage/carePlanConfigRepo';
import { clearWizardProgress } from '../../../storage/wizardProgressRepo';
import { logError } from '../../../utils/devLog';
import { SectionEyebrow } from '../../../components/SectionEyebrow';

const FIRST_REAL_MODE_KEY = '@embermate_first_real_mode_landed';
const PATIENT_ID = 'default';

// CORE buckets — always-on for v1. The wizard surfaces them as required,
// not toggleable; the user sees the bucket but cannot disable it.
const CORE_BUCKETS: ReadonlySet<BucketType> = new Set(['meds', 'vitals']);

// Phase 33b extension Lock 2 — three-section split.
//
// Pre-fix the OPTIONAL section listed all 9 toggles in one block. A
// first-time caregiver had no signal that 4 of those 9 (appointments,
// errands, shifts, self_care) wouldn't appear on the Now-tab daily
// scan even though they'd write to the same setBucketEnabled.
//
// Post-fix the OPTIONAL block splits into two:
//   • NOW_TAB_BUCKETS  — primary + secondary, minus CORE. These render
//                        as tiles on the Now tab's stats row (per
//                        StatRings RENDERABLE_KEYS).
//   • CARE_PLAN_BUCKETS — OPTIONAL_BUCKETS from types/carePlanConfig.
//                        Calendar/list items that live on Care Plan
//                        screens, not on Now.
//
// Persistence unchanged — toggling any of the 9 still writes to
// setBucketEnabled. UX-only fix.
const NOW_TAB_BUCKETS: ReadonlySet<BucketType> = new Set(
  [...PRIMARY_BUCKETS, ...SECONDARY_BUCKETS].filter((b) => !CORE_BUCKETS.has(b)),
);
const CARE_PLAN_BUCKETS: ReadonlySet<BucketType> = new Set(OPTIONAL_BUCKETS);

interface BucketRow {
  type: BucketType;
  name: string;
  emoji: string;
  enabled: boolean;
}

export default function WizardStepConfirm() {
  const router = useRouter();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const patientName = useActivePatientName();

  const [config, setConfig] = useState<CarePlanConfig | null>(null);
  const [busy, setBusy] = useState(false);

  // Load the config once on mount; toggles update local state + persist.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const c = await getOrCreateCarePlanConfig(PATIENT_ID);
        if (cancelled) return;
        setConfig(c);
      } catch (err) {
        logError('WizardStepConfirm.load', err);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const rows: BucketRow[] = useMemo(() => {
    if (!config) return [];
    return BUCKET_TYPES.map((type) => ({
      type,
      name: BUCKET_META[type].name,
      emoji: BUCKET_META[type].emoji,
      enabled: config[type]?.enabled === true,
    }));
  }, [config]);

  const coreRows = rows.filter((r) => CORE_BUCKETS.has(r.type));
  const nowTabRows = rows.filter((r) => NOW_TAB_BUCKETS.has(r.type));
  const carePlanRows = rows.filter((r) => CARE_PLAN_BUCKETS.has(r.type));

  const handleToggle = useCallback(async (type: BucketType, next: boolean) => {
    setConfig((prev) =>
      prev
        ? {
            ...prev,
            [type]: { ...(prev[type] ?? { enabled: false }), enabled: next },
          }
        : prev,
    );
    try {
      await setBucketEnabled(PATIENT_ID, type, next);
    } catch (err) {
      logError('WizardStepConfirm.toggle', err);
    }
  }, []);

  const handleDone = useCallback(async () => {
    if (busy) return;
    setBusy(true);
    try {
      await AsyncStorage.setItem(FIRST_REAL_MODE_KEY, 'false');
      await clearWizardProgress();
      router.replace('/(tabs)/now' as any);
    } catch (err) {
      logError('WizardStepConfirm.done', err);
      setBusy(false);
    }
  }, [busy, router]);

  return (
    <View style={styles.container}>
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* Progress + step label */}
          <View style={styles.progressRow}>
            <View style={[styles.dot, styles.dotActive]} />
            <View style={[styles.dot, styles.dotActive]} />
            <View style={[styles.dot, styles.dotActive]} />
          </View>
          <Text style={styles.stepLabel}>{'STEP 3 OF 3'}</Text>

          <Text style={styles.headerTitle}>{`Confirm ${patientName}’s plan`}</Text>
          <Text style={styles.headerSubtitle}>
            {'Tap any to adjust. You can always change later.'}
          </Text>

          {/* All three section eyebrows route through SectionEyebrow at
              canon scale + letterSpacing 1.5 (Phase 33b Scope 3) +
              tint="caregiverAccent" for lane-coherence across the
              wizard's three steps. */}

          {coreRows.some((r) => r.enabled) && (
            <View style={styles.section}>
              <SectionEyebrow text="Core — always on" tint="caregiverAccent" />
              {coreRows
                .filter((r) => r.enabled)
                .map((r) => (
                  <View
                    key={r.type}
                    testID={`wizard-confirm-core-${r.type}`}
                    style={styles.row}
                  >
                    <Text style={styles.rowEmoji}>{r.emoji}</Text>
                    <Text style={styles.rowName}>{r.name}</Text>
                    <Text style={styles.requiredLabel}>{'Required'}</Text>
                  </View>
                ))}
            </View>
          )}

          <View style={styles.section}>
            <SectionEyebrow text="These show on your Now tab" tint="caregiverAccent" />
            {nowTabRows.map((r) => (
              <View
                key={r.type}
                testID={`wizard-confirm-now-${r.type}`}
                style={styles.row}
              >
                <Text style={styles.rowEmoji}>{r.emoji}</Text>
                <Text style={styles.rowName}>{r.name}</Text>
                <Switch
                  value={r.enabled}
                  onValueChange={(v) => handleToggle(r.type, v)}
                  trackColor={{ false: colors.glassBorder, true: colors.accent }}
                  thumbColor={'#ffffff'}
                  accessibilityLabel={`${r.name} — ${r.enabled ? 'enabled' : 'disabled'}`}
                />
              </View>
            ))}
          </View>

          <View style={styles.section}>
            <SectionEyebrow text="These show on your Care Plan" tint="caregiverAccent" />
            {carePlanRows.map((r) => (
              <View
                key={r.type}
                testID={`wizard-confirm-careplan-${r.type}`}
                style={styles.row}
              >
                <Text style={styles.rowEmoji}>{r.emoji}</Text>
                <Text style={styles.rowName}>{r.name}</Text>
                <Switch
                  value={r.enabled}
                  onValueChange={(v) => handleToggle(r.type, v)}
                  trackColor={{ false: colors.glassBorder, true: colors.accent }}
                  thumbColor={'#ffffff'}
                  accessibilityLabel={`${r.name} — ${r.enabled ? 'enabled' : 'disabled'}`}
                />
              </View>
            ))}
          </View>
        </ScrollView>

        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.primary, busy && styles.primaryDisabled]}
            onPress={handleDone}
            disabled={busy}
            accessibilityRole="button"
            accessibilityLabel="Done — start using the care plan"
            accessibilityState={{ disabled: busy }}
            testID="wizard-confirm-done"
          >
            <Text style={styles.primaryText}>
              {busy ? 'Finishing…' : "Done — let's start"}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.back}
            onPress={() => router.back()}
            accessibilityRole="button"
            accessibilityLabel="Back to step 2"
            testID="wizard-confirm-back"
          >
            <Text style={styles.backText}>{'Back'}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </View>
  );
}

const createStyles = (c: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: c.background,
    },
    scrollContent: {
      paddingHorizontal: 14, // allow: page-rhythm horizontal inset
      paddingTop: Spacing.lg,
      paddingBottom: Spacing.xl,
    },
    progressRow: {
      flexDirection: 'row' as const,
      gap: 6,
      justifyContent: 'center' as const,
      marginBottom: Spacing.sm,
    },
    dot: {
      width: 6,
      height: 6,
      borderRadius: 3,
      backgroundColor: c.caregiverAccentLight,
    },
    // Phase 33b extension lavender no-fill canon — site #2. Wizard
    // pagination dot is a progress indicator (action-affirmative lane,
    // not handoff). Flipped from lavender fill to sage `c.accent` so the
    // dot matches the dominant "this step is active" semantics used
    // elsewhere in the app.
    dotActive: {
      backgroundColor: c.accent,
    },
    stepLabel: {
      fontSize: 10,
      letterSpacing: 0.5,
      fontWeight: '600' as const,
      color: c.caregiverAccent,
      textAlign: 'center' as const,
      marginBottom: Spacing.lg,
    },
    headerTitle: {
      fontSize: 22,
      fontWeight: '500' as const,
      color: c.textPrimary,
      letterSpacing: -0.3,
      marginBottom: 6,
    },
    headerSubtitle: {
      fontSize: 13,
      color: c.textSecondary,
      lineHeight: 18,
      marginBottom: Spacing.lg,
    },
    section: {
      marginBottom: Spacing.lg,
    },
    // Lock 2 — local `eyebrow` style retired; all three section eyebrows
    // now route through SectionEyebrow (canon 11pt + letterSpacing 1.5).
    row: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      gap: 12,
      paddingVertical: 12,
      paddingHorizontal: Sizing.cardInternalPadding,
      backgroundColor: c.glass,
      borderWidth: 0.5,
      borderColor: c.glassBorder,
      borderRadius: Sizing.cardRadius,
      marginBottom: 6,
    },
    rowEmoji: {
      fontSize: 18,
    },
    rowName: {
      flex: 1,
      fontSize: 14,
      fontWeight: '500' as const,
      color: c.textPrimary,
    },
    requiredLabel: {
      fontSize: 10,
      fontWeight: '500' as const,
      letterSpacing: 0.3,
      color: c.textTertiary,
      textTransform: 'uppercase' as const,
    },
    actions: {
      paddingHorizontal: 14, // allow: page-rhythm horizontal inset
      paddingBottom: Spacing.md,
      paddingTop: Spacing.sm,
      gap: 8,
    },
    // Phase 33b extension lavender no-fill canon — site #3. "Done — let's
    // start" is the wizard's handoff-lane finalize button (caregiver →
    // care-plan-as-handoff-document, Lock 2 lane progression: sage who →
    // sage template → lavender confirm). Pre-cleanup it carried a
    // saturated `c.caregiverAccent` fill. Under the new canon lavender
    // is restricted to eyebrow-scale text + thin accents, so the lane
    // signal moves into the chrome: dark/glass fill + 1pt lavender
    // border + lavender label. Keeps the button visually distinct from
    // sage-affirmative CTAs while satisfying the no-fill rule.
    primary: {
      backgroundColor: c.background,
      borderWidth: 1,
      borderColor: c.caregiverAccent,
      borderRadius: 11,
      paddingVertical: 14, // allow: primary CTA tap-target (Apple HIG)
      alignItems: 'center' as const,
    },
    primaryDisabled: {
      opacity: 0.4,
    },
    primaryText: {
      fontSize: 15,
      fontWeight: '600' as const,
      color: c.caregiverAccent,
    },
    back: {
      paddingVertical: 12,
      alignItems: 'center' as const,
    },
    backText: {
      fontSize: 13,
      color: c.textTertiary,
    },
  });
