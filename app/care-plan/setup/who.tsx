// ============================================================================
// CARE PLAN SETUP — STEP 1 (WHO) — Phase 5.13.b.
//
// First wizard step. Collects patient + caregiver names. Both prefill from
// canonical sources:
//   • Patient name → useActivePatientNameRaw (5.13.1.a). Returns null when
//     no real name is set, so an unconfigured profile leaves the input
//     empty rather than seeded with "your loved one".
//   • Caregiver name → caregiverProfileRepo.getCaregiverProfile (unchanged).
//
// Cancel routes back based on the `from` param (Settings → /settings,
// banner|transition → /(tabs)/now, onboarding → onboarding stack).
// Done writes name through writePatientName (5.13.1.b helper) + saves
// wizard progress at step 'template' + navigates to step 2.
// ============================================================================

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTheme } from '../../../contexts/ThemeContext';
import { Spacing } from '../../../theme/theme-tokens';
import { useActivePatientNameRaw } from '../../../hooks/useActivePatientName';
import {
  getCaregiverProfile,
  saveCaregiverProfile,
} from '../../../storage/caregiverProfileRepo';
import { writePatientName } from '../../../utils/patientNameWriter';
import {
  saveWizardProgress,
} from '../../../storage/wizardProgressRepo';
import { logError } from '../../../utils/devLog';

type WizardEntrySource = 'settings' | 'banner' | 'transition' | 'onboarding';

export default function WizardStepWho() {
  const router = useRouter();
  const { from: fromRaw } = useLocalSearchParams<{ from?: string }>();
  const from = (fromRaw ?? '') as WizardEntrySource | '';

  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const initialPatientName = useActivePatientNameRaw() ?? '';
  const [patientName, setPatientName] = useState(initialPatientName);
  const [caregiverName, setCaregiverName] = useState('');
  const [busy, setBusy] = useState(false);
  const [startedAt] = useState(() => new Date().toISOString());

  // Prefill caregiver from the storage layer once on mount.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const profile = await getCaregiverProfile();
        if (cancelled) return;
        if (profile?.name) setCaregiverName(profile.name);
      } catch (err) {
        logError('WizardStepWho.loadCaregiver', err);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const trimmedPatient = patientName.trim();
  const canProceed = trimmedPatient.length > 0 && !busy;

  const handleNext = useCallback(async () => {
    if (!canProceed) return;
    setBusy(true);
    try {
      await writePatientName('default', trimmedPatient);
      const trimmedCaregiver = caregiverName.trim();
      if (trimmedCaregiver.length > 0) {
        const shortName = trimmedCaregiver.split(/\s+/)[0];
        await saveCaregiverProfile({
          name: trimmedCaregiver,
          shortName: shortName || undefined,
        });
      }
      await saveWizardProgress({
        step: 'template',
        patientName: trimmedPatient,
        caregiverName: trimmedCaregiver || undefined,
        startedAt,
      });
      const fromParam = from || 'settings';
      router.push({
        pathname: '/care-plan/setup/template',
        params: { from: fromParam },
      } as any);
    } catch (err) {
      logError('WizardStepWho.handleNext', err);
    } finally {
      setBusy(false);
    }
  }, [canProceed, trimmedPatient, caregiverName, startedAt, from, router]);

  const handleCancel = useCallback(() => {
    // Cancel routing by entry source. Sample data was already cleared
    // before the wizard mounted in the transition path, so 'transition'
    // returns to Now (banner won't be there). Settings users return to
    // Settings; onboarding users return inside the onboarding stack.
    if (from === 'settings') {
      router.replace('/settings' as any);
      return;
    }
    if (from === 'onboarding') {
      router.replace('/(onboarding)' as any);
      return;
    }
    // 'banner' or 'transition' (or unknown) — Now is the safe default.
    router.replace('/(tabs)/now' as any);
  }, [from, router]);

  return (
    <View style={styles.container}>
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.select({ ios: 'padding', android: undefined })}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
          >
            {/* Progress + step label */}
            <View style={styles.progressRow}>
              <View style={[styles.dot, styles.dotActive]} />
              <View style={styles.dot} />
              <View style={styles.dot} />
            </View>
            <Text style={styles.stepLabel}>{'STEP 1 OF 3'}</Text>

            <Text style={styles.headerTitle}>{'Who are you caring for?'}</Text>
            <Text style={styles.headerSubtitle}>
              {'Just a name — you can add details anytime.'}
            </Text>

            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>{'THEIR NAME'}</Text>
              <TextInput
                style={styles.input}
                value={patientName}
                onChangeText={setPatientName}
                placeholder={'e.g. Mom, Dad, Linda'}
                placeholderTextColor={colors.textTertiary}
                autoCapitalize="words"
                autoFocus
                accessibilityLabel="Patient name"
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>{'YOUR NAME (optional)'}</Text>
              <TextInput
                style={styles.input}
                value={caregiverName}
                onChangeText={setCaregiverName}
                placeholder={'Your first name'}
                placeholderTextColor={colors.textTertiary}
                autoCapitalize="words"
                accessibilityLabel="Your name"
              />
            </View>

            <Text style={styles.helper}>
              {"We use your name on shared handoffs and visit reports — so the next caregiver knows who wrote what."}
            </Text>
          </ScrollView>

          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.primary, !canProceed && styles.primaryDisabled]}
              onPress={handleNext}
              disabled={!canProceed}
              accessibilityRole="button"
              accessibilityLabel="Next — continue to template selection"
              accessibilityState={{ disabled: !canProceed }}
              testID="wizard-who-next"
            >
              <Text style={styles.primaryText}>{busy ? 'Saving…' : 'Next →'}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.cancel}
              onPress={handleCancel}
              accessibilityRole="button"
              accessibilityLabel="Cancel and return"
              testID="wizard-who-cancel"
            >
              <Text style={styles.cancelText}>{'Cancel'}</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
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
    // Phase 33b extension lavender no-fill canon — site #5. Wizard
    // pagination dot lands on sage (action-affirmative progress
    // indicator) per the no-fill canon, matching the matching dots in
    // confirm.tsx / template.tsx.
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
    fieldGroup: {
      marginBottom: Spacing.md,
    },
    fieldLabel: {
      fontSize: 10,
      fontWeight: '600' as const,
      letterSpacing: 0.5,
      color: c.textTertiary,
      marginBottom: 6,
    },
    input: {
      backgroundColor: c.glass,
      borderWidth: 0.5,
      borderColor: c.glassBorder,
      borderRadius: 10,
      paddingVertical: 12,
      paddingHorizontal: 14, // allow: tap-target padding (Apple HIG)
      fontSize: 15,
      color: c.textPrimary,
    },
    helper: {
      fontSize: 11,
      lineHeight: 16,
      color: c.textTertiary,
      marginTop: Spacing.sm,
      fontStyle: 'italic' as const,
    },
    actions: {
      paddingHorizontal: 14, // allow: page-rhythm horizontal inset
      paddingBottom: Spacing.md,
      paddingTop: Spacing.sm,
      gap: 8,
    },
    // Phase 33b extension Lock 2 — wizard CTA lane assignment.
    // Step 1 (who.tsx) is action-affirmative ("set up the patient") →
    // sage (c.accent). Lane progresses sage → sage → lavender across
    // the wizard's three steps; lavender stays reserved for the
    // step-3 commit ("Done — let's start" on confirm.tsx, Tier 3
    // caregiver→clinician handoff per Phase 26 F4).
    primary: {
      backgroundColor: c.accent,
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
      color: c.textPrimary,
    },
    cancel: {
      paddingVertical: 12,
      alignItems: 'center' as const,
    },
    cancelText: {
      fontSize: 13,
      color: c.textTertiary,
    },
  });
