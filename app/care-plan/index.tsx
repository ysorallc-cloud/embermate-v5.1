// ============================================================================
// CARE PLAN HOME — Single list with toggles
// ============================================================================

import React, { useState, useCallback, useRef, useMemo } from 'react';
import { navigate } from '../../lib/navigate';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Spacing, BorderRadius } from '../../theme/theme-tokens';
import { useTheme } from '../../contexts/ThemeContext';
import { useCarePlanConfig } from '../../hooks/useCarePlanConfig';
import {
  BucketType,
  BucketConfig,
  BUCKET_META,
  BUCKET_TYPES,
} from '../../types/carePlanConfig';
import { InfoModal, InfoIconButton } from '../../components/common/InfoModal';
import { SubScreenHeader } from '../../components/SubScreenHeader';
import { SectionEyebrow } from '../../components/SectionEyebrow';
import { usePatient } from '../../contexts/PatientContext';
import { CARE_PLAN_TEMPLATES, CarePlanTemplate, TemplateMedSuggestion } from '../../constants/carePlanTemplates';
import { TemplateMedSeedingModal } from '../../components/careplan/TemplateMedSeedingModal';
import { AddItemSheet } from '../../components/careplan/AddItemSheet';

// Phase 32A F2 — three-section management layout. Each section's bucket
// allocation is hardcoded here per the brief's locked allocation rather
// than derived from PRIMARY/SECONDARY/OPTIONAL — the partition sets in
// types/carePlanConfig.ts encode pre-32A SECTION semantics (e.g.
// SECONDARY = "hidden behind More") that no longer apply to the inline-
// expand layout. The section lists below are the new canonical source
// for "what shows on Care Plan main, where."
//
// MVP suppression (F3 spec) is expressed STRUCTURALLY: errands, shifts,
// and self_care are absent from every section list. They remain in
// BUCKET_TYPES + the OPTIONAL_BUCKETS partition (data-model preserved
// per the brief's render-filter-not-data-deletion lock); they just
// don't appear in any UI section. F1's storage-layer migration forces
// enabled=false on these three for any pre-32A device that had them
// toggled on, so the absence here can't strand existing user state.
const ALWAYS_ON_BUCKETS: BucketType[] = ['meds'];
const DAILY_TRACKING_BUCKETS: BucketType[] = ['vitals', 'wellness', 'meals'];
const ADD_WHEN_READY_BUCKETS: BucketType[] = ['water', 'sleep', 'activity', 'appointments'];

// Phase 32A F3 — MVP render filter, made explicit.
//
// The three buckets below are suppressed from the management UI in v1.0
// but PRESERVED in types/carePlanConfig.ts (BUCKET_TYPES +
// OPTIONAL_BUCKETS partition stays). Lock from the brief:
// render-filter-not-data-deletion. F1's storage migration forces
// enabled=false on these three for any pre-32A device that had them
// toggled on, so the absence from section lists above can't strand
// existing user state.
//
// This const is declarative documentation. The runtime suppression is
// achieved structurally — none of these names appear in the three
// section lists above. v1.1 may promote any of these to ADD WHEN READY
// by removing the name from this set AND adding it to that section
// const. carePlanInlineReframe32A.test.tsx contract 2 + 2b pin both
// sides of the contract — the absence from sections and the presence
// of the named set here.
const MVP_SUPPRESSED_BUCKETS: readonly BucketType[] = ['errands', 'shifts', 'self_care'] as const;

// ============================================================================
// SECTION HEADER ROW
// ============================================================================

// Phase 32A F2 \u2014 SectionHeaderRow retired. Section headers on Care Plan
// main now render through the SectionEyebrow primitive (brand-canon
// uppercase + letterSpacing 1.5). Old SectionHeaderRow + its action /
// onAction affordance had no callers after the restructure.

// ============================================================================
// CATEGORY ROW — replaces BucketCard
// ============================================================================

interface CategoryRowProps {
  bucket: BucketType;
  emoji: string;
  name: string;
  detail: string | null;
  enabled: boolean;
  onToggle: (enabled: boolean) => void;
  onPress: () => void;
}

function CategoryRow({ bucket, emoji, name, detail, enabled, onToggle, onPress }: CategoryRowProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  return (
    <TouchableOpacity
      style={[styles.categoryRow, !enabled && styles.categoryRowDisabled]}
      onPress={enabled ? onPress : undefined}
      activeOpacity={enabled ? 0.7 : 1}
      accessibilityLabel={`${name}, ${enabled ? 'enabled' : 'disabled'}. ${enabled ? 'Tap to configure.' : 'Toggle to enable.'}`}
      accessibilityRole="button"
    >
      {/* Left: emoji + text */}
      <View style={styles.categoryLeft}>
        <Text style={styles.categoryEmoji}>{emoji}</Text>
        <View style={styles.categoryInfo}>
          <Text style={styles.categoryName}>{name}</Text>
          {enabled && detail && <Text style={styles.categoryDetail}>{detail}</Text>}
        </View>
      </View>
      {/* Right: toggle + chevron — fixed width column */}
      <View style={styles.categoryRight}>
        <Switch
          value={enabled}
          onValueChange={onToggle}
          trackColor={{ false: colors.glassStrong, true: colors.accent }}
          thumbColor={enabled ? colors.textPrimary : colors.switchThumbOff}
          ios_backgroundColor={colors.glassStrong}
        />
        {enabled ? (
          <Text style={styles.categoryChevron}>{'\u203A'}</Text>
        ) : (
          <View style={styles.categoryChevronSpacer} />
        )}
      </View>
    </TouchableOpacity>
  );
}

// ============================================================================
// AI INSIGHT CARD
// ============================================================================

interface AIInsightCardProps {
  icon: string;
  title: string;
  message: string;
  onDismiss?: () => void;
}

function AIInsightCard({ icon, title, message, onDismiss }: AIInsightCardProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  return (
    <View style={styles.aiInsightCard}>
      <View style={styles.aiInsightHeader}>
        <Text style={styles.aiInsightIcon}>{icon}</Text>
        <Text style={styles.aiInsightTitle}>{title}</Text>
        {onDismiss && (
          <TouchableOpacity onPress={onDismiss} style={styles.aiInsightDismiss} accessibilityLabel={`Dismiss ${title} insight`} accessibilityRole="button">
            <Text style={styles.aiInsightDismissText}>{'\u00D7'}</Text>
          </TouchableOpacity>
        )}
      </View>
      <Text style={styles.aiInsightMessage}>{message}</Text>
    </View>
  );
}

// ============================================================================
// TEMPLATE CARD
// ============================================================================

interface TemplateCardProps {
  template: CarePlanTemplate;
  onApply: () => void;
}

function TemplateCard({ template, onApply }: TemplateCardProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const bucketNames = template.enabledBuckets
    .map(b => BUCKET_META[b].name)
    .join(', ');

  return (
    <TouchableOpacity
      style={styles.templateCard}
      onPress={onApply}
      activeOpacity={0.7}
      accessibilityLabel={`Apply ${template.name} template`}
      accessibilityRole="button"
    >
      <View style={styles.templateHeader}>
        <Text style={styles.templateEmoji}>{template.emoji}</Text>
        <Text style={styles.templateName}>{template.name}</Text>
      </View>
      <Text style={styles.templateDescription}>{template.description}</Text>
      <Text style={styles.templateBuckets}>Enables: {bucketNames}</Text>
    </TouchableOpacity>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function CarePlanHomeScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { activePatient } = usePatient();
  const patientName =
    activePatient?.name && activePatient.name !== 'Patient'
      ? activePatient.name
      : 'your loved one';
  const {
    config,
    loading,
    hasCarePlan,
    enabledBuckets,
    toggleBucket,
    updateBucket,
    getBucketStatus,
    initializeConfig,
  } = useCarePlanConfig();

  const [dismissedInsights, setDismissedInsights] = useState<string[]>([]);
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [addItemWindow, setAddItemWindow] = useState<string | null>(null);
  const [medSeedingTemplate, setMedSeedingTemplate] = useState<{ name: string; suggestions: TemplateMedSuggestion[] } | null>(null);
  // Phase 32A F2 — accordion state. ONE bucket's drawer is open at a
  // time (per the brief's locked decision); null means no drawer open.
  // Single-bucket type (BucketType | null, NOT an array or Set) is the
  // accordion invariant — pinned by the test contract.
  const [expandedBucket, setExpandedBucket] = useState<BucketType | null>(null);
  const scrollViewRef = useRef<ScrollView>(null);

  const enabledBucketSet = new Set(enabledBuckets);

  // Ensure config exists on first load
  React.useEffect(() => {
    if (!loading && !config) {
      initializeConfig();
    }
  }, [loading, config, initializeConfig]);

  // Phase 32A F2 — toggle behavior with accordion drawer.
  //   • Toggle ON  → write enabled=true, open this bucket's drawer (closes
  //     whichever drawer was previously open per the one-at-a-time lock).
  //   • Toggle OFF → write enabled=false; if this drawer was open, close it.
  // The drawer contents themselves (chips / dropdowns / toggles per
  // bucket) land in Slice B (F6–F12). For F2 the drawer is an empty
  // scaffold so the simulator gate can verify the structure.
  const handleToggleBucket = useCallback(async (bucket: BucketType, enabled: boolean) => {
    await toggleBucket(bucket, enabled);
    if (enabled) {
      setExpandedBucket(bucket);
    } else {
      setExpandedBucket((curr) => (curr === bucket ? null : curr));
    }
  }, [toggleBucket]);

  // Phase 32A F2 — row tap behavior.
  //   • Medications row taps still route to /care-plan/meds (the form
  //     screen stays per brief — adding/editing a med doesn't fit inline).
  //   • Every other bucket tap, when the bucket is enabled, opens or
  //     closes its drawer in the accordion (no router navigation).
  //   • Disabled rows: no-op on tap (the switch is the only way to
  //     enable them, per the brief's "toggle is the affordance" pattern).
  const handleConfigureBucket = useCallback((bucket: BucketType) => {
    if (bucket === 'meds') {
      navigate('/care-plan/meds');
      return;
    }
    // Accordion toggle for the row's drawer.
    setExpandedBucket((curr) => (curr === bucket ? null : bucket));
  }, []);

  const dismissInsight = useCallback((id: string) => {
    setDismissedInsights(prev => [...prev, id]);
  }, []);

  const applyTemplate = useCallback(async (template: CarePlanTemplate) => {
    let currentConfig = config;
    if (!currentConfig) {
      currentConfig = await initializeConfig();
    }

    const enabledSet = new Set(template.enabledBuckets);

    for (const bucket of BUCKET_TYPES) {
      if (!enabledSet.has(bucket)) {
        await updateBucket(bucket, { enabled: false });
      }
    }

    for (const bucket of template.enabledBuckets) {
      const suggestion = template.suggestedSettings[bucket];
      const updates: Partial<BucketConfig> = { enabled: true };

      if (suggestion) {
        if (suggestion.priority) updates.priority = suggestion.priority;
        if (suggestion.timesOfDay) updates.timesOfDay = suggestion.timesOfDay;
      }

      await updateBucket(bucket, updates);

      if (suggestion) {
        const bucketSpecific: Record<string, any> = {};
        if (suggestion.vitalTypes) bucketSpecific.vitalTypes = suggestion.vitalTypes;
        if (suggestion.frequency) bucketSpecific.frequency = suggestion.frequency;
        if (suggestion.trackingStyle) bucketSpecific.trackingStyle = suggestion.trackingStyle;
        if (suggestion.dailyGoalGlasses) bucketSpecific.dailyGoalGlasses = suggestion.dailyGoalGlasses;

        if (Object.keys(bucketSpecific).length > 0) {
          await updateBucket(bucket, bucketSpecific);
        }
      }
    }

    if (template.suggestedMedications && template.suggestedMedications.length > 0) {
      setMedSeedingTemplate({
        name: template.name,
        suggestions: template.suggestedMedications,
      });
    }
  }, [config, initializeConfig, updateBucket]);

  // ============================================================================
  // CONTEXTUAL INSIGHT
  // ============================================================================

  const getContextualInsight = useCallback(() => {
    if (!config) return null;

    if (!hasCarePlan && !dismissedInsights.includes('start-simple')) {
      return {
        id: 'start-simple',
        icon: '\uD83D\uDCA1',
        title: 'Start simple',
        message: 'Try enabling Medications and Mood first. You can add more categories anytime.',
      };
    }

    if (config.meds.enabled) {
      const medsConfig = config.meds;
      if (!medsConfig.medications?.length && !dismissedInsights.includes('add-meds')) {
        return {
          id: 'add-meds',
          icon: '\uD83D\uDC8A',
          title: 'Add medications',
          message: 'Tap Configure on Medications to add your first medication and set up reminders.',
        };
      }

      const medsWithSupply = (medsConfig.medications || []).filter(m => m.supplyEnabled && m.active);
      const medsNeedingRefill = medsWithSupply.filter(m =>
        m.daysSupply !== undefined && m.refillThresholdDays !== undefined &&
        m.daysSupply <= m.refillThresholdDays
      );
      if (medsNeedingRefill.length > 0 && !dismissedInsights.includes('refill-reminder')) {
        return {
          id: 'refill-reminder',
          icon: '\uD83D\uDD14',
          title: 'Refill reminder',
          message: `${medsNeedingRefill[0].name} supply is running low. Consider ordering a refill soon.`,
        };
      }
    }

    const enabledCount = enabledBuckets.length;
    if (enabledCount >= 6 && !dismissedInsights.includes('focus-suggestion')) {
      return {
        id: 'focus-suggestion',
        icon: '\uD83C\uDFAF',
        title: 'Focus for better habits',
        message: "You've enabled many categories. Consider starting with 2-3 that matter most, then add more once those feel natural.",
      };
    }

    if (config.vitals.enabled) {
      const vitalsConfig = config.vitals;
      if ((!vitalsConfig.vitalTypes || vitalsConfig.vitalTypes.length === 0) && !dismissedInsights.includes('select-vitals')) {
        return {
          id: 'select-vitals',
          icon: '\uD83D\uDCCA',
          title: 'Choose vitals to track',
          message: 'Tap Configure on Vitals to select which measurements to track.',
        };
      }
    }

    if (hasCarePlan && config) {
      const anyNotificationsEnabled = enabledBuckets.some((bucket: BucketType) => config[bucket]?.notificationsEnabled);
      if (!anyNotificationsEnabled && !dismissedInsights.includes('enable-notifications')) {
        return {
          id: 'enable-notifications',
          icon: '\uD83D\uDD14',
          title: 'Stay on track',
          message: 'Enable reminders on any category to get gentle notifications when things are due.',
        };
      }
    }

    return null;
  }, [config, hasCarePlan, enabledBuckets, dismissedInsights]);

  const contextualInsight = getContextualInsight();

  if (loading) {
    return (
      <View style={styles.container}>
        <LinearGradient
          colors={[colors.backgroundGradientStart, colors.backgroundGradientEnd]}
          style={styles.gradient}
        >
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.accent} />
          </View>
        </LinearGradient>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <LinearGradient
        colors={[colors.backgroundGradientStart, colors.backgroundGradientEnd]}
        style={styles.gradient}
      >
        {/* Header */}
        <SubScreenHeader
          title="Care Plan"
          subtitle={`Set up what to track for ${patientName}.`}
          rightAction={<InfoIconButton onPress={() => setShowInfoModal(true)} />}
        />

        <ScrollView
          ref={scrollViewRef}
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Info Modal */}
          <InfoModal
            visible={showInfoModal}
            onClose={() => setShowInfoModal(false)}
            title="About Your Care Plan"
            content="Your Care Plan sets the routine for typical days. Changes here update future schedules permanently."
            hint="Use 'Adjust Today' from the Now screen for one-day changes that reset tomorrow."
          />

          {/* Quick Start Templates — only when no care plan exists */}
          {!hasCarePlan && (
            <>
              <Text style={styles.templateIntroLabel}>QUICK START</Text>
              <Text style={styles.templateIntro}>
                Choose a template to get started, then customize as needed.
              </Text>
              {CARE_PLAN_TEMPLATES.map(template => (
                <TemplateCard
                  key={template.id}
                  template={template}
                  onApply={() => applyTemplate(template)}
                />
              ))}
            </>
          )}

          {/* Contextual AI Insight */}
          {contextualInsight && (
            <AIInsightCard
              icon={contextualInsight.icon}
              title={contextualInsight.title}
              message={contextualInsight.message}
              onDismiss={() => dismissInsight(contextualInsight.id)}
            />
          )}

          {/* Phase 32A F2 — three-section management layout.
              ALWAYS ON: meds (no toggle, no drawer; F4 fills the inline meds list).
              DAILY TRACKING: vitals, wellness, meals (toggleable; drawer internals F6/F7/F8).
              ADD WHEN READY: water, sleep, activity, appointments (toggleable; drawer internals F9–F12).
              Errands / Shifts / Self-care intentionally absent from every section
              (MVP render filter expressed structurally; data types preserved). */}
          <SectionEyebrow text="Always on" />
          {ALWAYS_ON_BUCKETS.map(bucket => (
            <TouchableOpacity
              key={bucket}
              style={styles.coreCard}
              onPress={() => handleConfigureBucket(bucket)}
              activeOpacity={0.7}
              accessibilityLabel={`${BUCKET_META[bucket].name}. Tap to configure.`}
              accessibilityRole="button"
            >
              <Text style={styles.categoryEmoji}>{BUCKET_META[bucket].emoji}</Text>
              <View style={styles.categoryInfo}>
                <Text style={styles.categoryName}>{BUCKET_META[bucket].name}</Text>
                {getBucketStatus(bucket) && (
                  <Text style={styles.categoryDetail}>{getBucketStatus(bucket)}</Text>
                )}
              </View>
              <Text style={styles.categoryChevron}>{'\u203A'}</Text>
            </TouchableOpacity>
          ))}

          {/* F4 — inline meds list will mount under the meds row above. */}

          <SectionEyebrow text="Daily tracking" />
          {DAILY_TRACKING_BUCKETS.map(bucket => {
            const isEnabled = enabledBucketSet.has(bucket);
            const isExpanded = expandedBucket === bucket;
            return (
              <React.Fragment key={bucket}>
                <CategoryRow
                  bucket={bucket}
                  emoji={BUCKET_META[bucket].emoji}
                  name={BUCKET_META[bucket].name}
                  detail={isEnabled ? getBucketStatus(bucket) : null}
                  enabled={isEnabled}
                  onToggle={(val) => handleToggleBucket(bucket, val)}
                  onPress={() => handleConfigureBucket(bucket)}
                />
                {isEnabled && isExpanded && (
                  <View testID={`drawer-${bucket}`} style={styles.drawerScaffold}>
                    {/* F6+ fills this drawer with per-bucket internals.
                        At STOP 2 the scaffold is intentionally empty so
                        the simulator gate sees the page structure and
                        accordion behavior without any drawer content. */}
                  </View>
                )}
              </React.Fragment>
            );
          })}

          <SectionEyebrow text="Add when ready" />
          {ADD_WHEN_READY_BUCKETS.map(bucket => {
            const isEnabled = enabledBucketSet.has(bucket);
            const isExpanded = expandedBucket === bucket;
            return (
              <React.Fragment key={bucket}>
                <CategoryRow
                  bucket={bucket}
                  emoji={BUCKET_META[bucket].emoji}
                  name={BUCKET_META[bucket].name}
                  detail={isEnabled ? getBucketStatus(bucket) : null}
                  enabled={isEnabled}
                  onToggle={(val) => handleToggleBucket(bucket, val)}
                  onPress={() => handleConfigureBucket(bucket)}
                />
                {isEnabled && isExpanded && (
                  <View testID={`drawer-${bucket}`} style={styles.drawerScaffold}>
                    {/* F6+ fills this drawer with per-bucket internals. */}
                  </View>
                )}
              </React.Fragment>
            );
          })}

          {/* Bottom spacing */}
          <View style={{ height: 40 }} />
        </ScrollView>
      </LinearGradient>

      {/* Add Item Sheet */}
      <AddItemSheet
        visible={!!addItemWindow}
        windowLabel={addItemWindow ?? undefined}
        onClose={() => setAddItemWindow(null)}
      />

      {/* Med Seeding Modal */}
      {medSeedingTemplate && (
        <TemplateMedSeedingModal
          visible={!!medSeedingTemplate}
          templateName={medSeedingTemplate.name}
          suggestions={medSeedingTemplate.suggestions}
          onClose={() => setMedSeedingTemplate(null)}
        />
      )}
    </SafeAreaView>
  );
}

// ============================================================================
// STYLES
// ============================================================================

const createStyles = (c: typeof Colors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: c.background,
  },
  gradient: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingTop: Platform.OS === 'android' ? 20 : 0,
    paddingBottom: Spacing.sm,
  },
  backButton: {
    width: 44,
    height: 44,
    backgroundColor: c.backgroundElevated,
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backIcon: {
    fontSize: 24,
    color: c.textPrimary,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerLabel: {
    fontSize: 11,
    color: c.textMuted,
    letterSpacing: 1,
    fontWeight: '600',
  },

  // Scroll
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: 40,
  },

  // Phase 32A F2 — Section header chrome retired. SectionEyebrow primitive
  // now owns section eyebrows on Care Plan main, including ALWAYS ON. The
  // pre-32A `coreSectionHeader` / `alwaysOnBadge` / `alwaysOnBadgeText`
  // styles + `sectionHeaderRow` / `sectionHeaderTitle` / `sectionHeaderAction`
  // styles had no callers after the restructure and were dropped.

  // Phase 32A F2 — empty drawer scaffold. Renders below an enabled +
  // expanded toggle row. Slice B (F6–F12) fills this with per-bucket
  // chips / dropdowns / toggles. At STOP 2 the scaffold is intentionally
  // empty so the simulator gate verifies page structure + accordion
  // behavior without any drawer content.
  drawerScaffold: {
    backgroundColor: c.glassFaint,
    borderLeftWidth: 2,
    borderLeftColor: c.accentMuted,
    borderRadius: 8,
    marginTop: -4,
    marginBottom: 8,
    marginHorizontal: 4,
    paddingHorizontal: 14,
    paddingVertical: 12,
    minHeight: 44,
  },
  coreCard: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    backgroundColor: c.glass,
    borderWidth: 1,
    borderColor: c.glassBorder,
    borderRadius: 14,
    padding: 14,
    marginBottom: 6,
    gap: 12,
  },
  // Category Row
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.025)',
  },
  categoryRowDisabled: {
    opacity: 0.45,
  },
  categoryLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: 0,
    gap: 12,
    paddingRight: 12,
  },
  categoryEmoji: {
    fontSize: 22,
    width: 32,
    textAlign: 'center',
    flexShrink: 0,
  },
  categoryInfo: {
    flex: 1,
    minWidth: 0,
  },
  categoryName: {
    fontSize: 15,
    fontWeight: '600',
    color: c.textPrimary,
  },
  categoryDetail: {
    fontSize: 11,
    color: c.textMuted,
    marginTop: 2,
  },
  categoryRight: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    flexShrink: 0,
    width: 72,
    gap: 8,
  },
  categoryChevron: {
    fontSize: 20,
    color: c.textMuted,
    width: 16,
    textAlign: 'center',
  },
  categoryChevronSpacer: {
    width: 16,
  },

  // AI Insight Card — "Stay on track" prompt.
  // Phase 2.6.5: switched from the legacy `purple*` tokens (electric
  // #a78bfa) to the warm `caregiverAccent*` family (#aa8adc) that
  // matches the Phase 7 3-accent budget. Bg 8% → 6%, border stays
  // 25%, hue shifts cool→warm so the card sits cleanly against the
  // warm-charcoal page bg instead of fighting it.
  aiInsightCard: {
    backgroundColor: c.caregiverAccentBg,
    borderWidth: 1,
    borderColor: c.caregiverAccentStrong,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
  },
  aiInsightHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginBottom: Spacing.xs,
  },
  aiInsightIcon: {
    fontSize: 20,
  },
  aiInsightTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    // Lavender stays on the heading + bell only (per spec). Token routed
    // through caregiverAccentText (#d4baff) to match the warm palette.
    color: c.caregiverAccentText,
  },
  aiInsightDismiss: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  aiInsightDismissText: {
    fontSize: 20,
    color: c.textHalf,
  },
  aiInsightMessage: {
    fontSize: 14,
    color: c.textSecondary,
    lineHeight: 20,
  },

  // Templates
  templateIntroLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: c.textHalf,
    letterSpacing: 1,
    marginBottom: Spacing.sm,
    marginTop: Spacing.lg,
  },
  templateIntro: {
    fontSize: 14,
    color: c.textSecondary,
    lineHeight: 20,
    marginBottom: Spacing.md,
  },
  templateCard: {
    backgroundColor: c.glassFaint,
    borderWidth: 1,
    borderColor: c.glassActive,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  templateHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginBottom: Spacing.xs,
  },
  templateEmoji: {
    fontSize: 22,
  },
  templateName: {
    fontSize: 16,
    fontWeight: '600',
    color: c.textPrimary,
  },
  templateDescription: {
    fontSize: 13,
    color: c.textSecondary,
    lineHeight: 18,
    marginBottom: Spacing.xs,
  },
  templateBuckets: {
    fontSize: 12,
    color: c.accent,
    fontWeight: '500',
  },
});
