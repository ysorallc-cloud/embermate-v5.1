// ============================================================================
// CARE PLAN SETUP — STEP 2 (TEMPLATE) — Phase 5.13.c.
//
// Single-select template picker. Shows the seven CARE_PLAN_TEMPLATES plus
// a "Start blank" row that skips the apply path entirely.
//
// On Next:
//   • If a real template was picked, run applyCarePlanTemplate (the shared
//     util — same path Care Plan home calls). When the result carries
//     pendingMedSeeding, mount TemplateMedSeedingModal in place; the
//     modal's onClose advances to step 3.
//   • If "Start blank" was picked, skip the apply and advance directly.
//   • Either way: saveWizardProgress({ step: 'confirm', templateId }).
//
// Back returns to step 1 (router.back) with progress preserved by the
// repo's TTL — the user can revise their name + come back.
// ============================================================================

import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTheme } from '../../../contexts/ThemeContext';
import { Spacing, Sizing } from '../../../theme/theme-tokens';
import {
  CARE_PLAN_TEMPLATES,
  type CarePlanTemplate,
} from '../../../constants/carePlanTemplates';
import { applyCarePlanTemplate } from '../../../utils/applyCarePlanTemplate';
import { saveWizardProgress } from '../../../storage/wizardProgressRepo';
import { TemplateMedSeedingModal } from '../../../components/careplan/TemplateMedSeedingModal';
import { logError } from '../../../utils/devLog';

const BLANK_ID = 'blank';

interface TemplateChoice {
  id: string;
  name: string;
  emoji: string;
  description: string;
  template: CarePlanTemplate | null; // null for the blank choice
}

export default function WizardStepTemplate() {
  const router = useRouter();
  const { from: fromRaw } = useLocalSearchParams<{ from?: string }>();
  const from = fromRaw ?? 'settings';

  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [pendingMedSeeding, setPendingMedSeeding] =
    useState<CarePlanTemplate | null>(null);

  // The seven templates plus the blank-start row. Memoised so the
  // template list isn't rebuilt on each render.
  const choices: TemplateChoice[] = useMemo(() => {
    const real: TemplateChoice[] = CARE_PLAN_TEMPLATES.map((t) => ({
      id: t.id,
      name: t.name,
      emoji: t.emoji,
      description: t.description,
      template: t,
    }));
    real.push({
      id: BLANK_ID,
      name: 'Start blank',
      emoji: '✨',
      description: "I'll choose what to track myself.",
      template: null,
    });
    return real;
  }, []);

  const advanceToConfirm = useCallback(() => {
    router.push({
      pathname: '/care-plan/setup/confirm',
      params: { from },
    } as any);
  }, [router, from]);

  const handleNext = useCallback(async () => {
    if (!selectedId || busy) return;
    setBusy(true);
    try {
      const choice = choices.find((c) => c.id === selectedId);
      if (!choice) return;

      await saveWizardProgress({
        step: 'confirm',
        templateId: selectedId,
        startedAt: new Date().toISOString(),
      });

      if (choice.id === BLANK_ID || !choice.template) {
        // Blank-start path: no config write, no med seeding.
        advanceToConfirm();
        return;
      }

      const result = await applyCarePlanTemplate(choice.template);
      if (result.pendingMedSeeding) {
        // Mount the seeding modal in place. Its onClose handler advances
        // the wizard so the user always lands on step 3 after dismissing.
        setPendingMedSeeding(result.pendingMedSeeding);
        return;
      }
      advanceToConfirm();
    } catch (err) {
      logError('WizardStepTemplate.handleNext', err);
    } finally {
      setBusy(false);
    }
  }, [selectedId, busy, choices, advanceToConfirm]);

  const handleSeedingClose = useCallback(() => {
    setPendingMedSeeding(null);
    advanceToConfirm();
  }, [advanceToConfirm]);

  const canProceed = !!selectedId && !busy;

  return (
    <View style={styles.container}>
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* Progress + step label */}
          <View style={styles.progressRow}>
            <View style={[styles.dot, styles.dotActive]} />
            <View style={[styles.dot, styles.dotActive]} />
            <View style={styles.dot} />
          </View>
          <Text style={styles.stepLabel}>{'STEP 2 OF 3'}</Text>

          <Text style={styles.headerTitle}>{'What kind of care?'}</Text>
          <Text style={styles.headerSubtitle}>
            {'Pick a starting point. Everything is editable later.'}
          </Text>

          <View style={styles.list}>
            {choices.map((choice) => {
              const selected = selectedId === choice.id;
              return (
                <TouchableOpacity
                  key={choice.id}
                  testID={`wizard-template-${choice.id}`}
                  style={[styles.row, selected && styles.rowSelected]}
                  onPress={() => setSelectedId(choice.id)}
                  activeOpacity={0.85}
                  accessibilityRole="button"
                  accessibilityLabel={`${choice.name} — ${choice.description}`}
                  accessibilityState={{ selected }}
                >
                  <View style={styles.rowHeader}>
                    <Text style={styles.rowEmoji}>{choice.emoji}</Text>
                    <Text style={[styles.rowName, selected && styles.rowNameSelected]}>
                      {choice.name}
                    </Text>
                    {selected && <Text style={styles.rowDot}>{'●'}</Text>}
                  </View>
                  <Text style={styles.rowDescription}>{choice.description}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>

        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.primary, !canProceed && styles.primaryDisabled]}
            onPress={handleNext}
            disabled={!canProceed}
            accessibilityRole="button"
            accessibilityLabel="Next — continue to confirm step"
            accessibilityState={{ disabled: !canProceed }}
            testID="wizard-template-next"
          >
            <Text style={styles.primaryText}>{busy ? 'Applying…' : 'Next →'}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.back}
            onPress={() => router.back()}
            accessibilityRole="button"
            accessibilityLabel="Back to step 1"
            testID="wizard-template-back"
          >
            <Text style={styles.backText}>{'Back'}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      {pendingMedSeeding && (
        <TemplateMedSeedingModal
          visible={!!pendingMedSeeding}
          templateName={pendingMedSeeding.name}
          suggestions={pendingMedSeeding.suggestedMedications ?? []}
          onClose={handleSeedingClose}
        />
      )}
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
    // Phase 33b extension lavender no-fill canon — site #4. Wizard
    // pagination dot lands on sage (action-affirmative progress
    // indicator) per the no-fill canon, matching the matching dot in
    // confirm.tsx / who.tsx.
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
    list: {
      gap: 10,
    },
    row: {
      backgroundColor: c.glass,
      borderWidth: 0.5,
      borderColor: c.glassBorder,
      borderRadius: Sizing.cardRadius,
      padding: Sizing.cardInternalPadding,
    },
    rowSelected: {
      backgroundColor: c.caregiverAccentFaint,
      borderColor: c.caregiverAccentStrong,
    },
    rowHeader: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      gap: 8,
      marginBottom: 4,
    },
    rowEmoji: {
      fontSize: 18,
    },
    rowName: {
      flex: 1,
      fontSize: 14,
      fontWeight: '600' as const,
      color: c.textPrimary,
    },
    rowNameSelected: {
      color: c.caregiverAccentText,
    },
    rowDot: {
      fontSize: 10,
      color: c.caregiverAccent,
    },
    rowDescription: {
      fontSize: 12,
      lineHeight: 17,
      color: c.textSecondary,
    },
    actions: {
      paddingHorizontal: 14, // allow: page-rhythm horizontal inset
      paddingBottom: Spacing.md,
      paddingTop: Spacing.sm,
      gap: 8,
    },
    // Phase 33b extension Lock 2 — wizard CTA lane assignment.
    // Step 2 (template.tsx) "Next →" is forward-progress between
    // wizard steps (not a commit) → sage (c.accent). Lane reasoning
    // matches step 1; lavender stays reserved for the step-3 commit
    // ("Done — let's start" on confirm.tsx).
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
    back: {
      paddingVertical: 12,
      alignItems: 'center' as const,
    },
    backText: {
      fontSize: 13,
      color: c.textTertiary,
    },
  });
