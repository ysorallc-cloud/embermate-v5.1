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
// Phase 32A F5 — Quick Start TemplateCard surface retired from home
// (P1 lock). The wizard's own template step stays unchanged; templates
// just no longer surface on Care Plan main. Imports for CARE_PLAN_TEMPLATES,
// CarePlanTemplate, TemplateMedSuggestion, TemplateMedSeedingModal are
// dropped from this file.
import { AddItemSheet } from '../../components/careplan/AddItemSheet';
// Phase 32A Slice B — per-bucket drawer internals. Each drawer is a
// self-contained component file under components/careplan/drawers/.
// Drawers receive the bucket's current config + an onUpdate dispatcher;
// they own their internal chips/dropdowns/toggles per the brief's per-
// bucket spec.
import { ActivityDrawer } from '../../components/careplan/drawers/ActivityDrawer';

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

// Phase 32A F4 — time-of-day label map for the Medications inline list.
// Matches the labels in TIME_OF_DAY_OPTIONS (types/carePlanConfig.ts:193)
// — the canonical labels surface in other meds UIs too, so the inline
// list reads consistent with /medication-form and /care-plan/meds.
const MEDS_TIME_LABEL: Record<string, string> = {
  morning: 'Morning',
  midday: 'Midday',
  evening: 'Evening',
  night: 'Night',
  custom: 'Custom',
};

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

// Phase 32A F5 — TemplateCard component retired (P1 lock). The brief
// out-of-scope explicitly rejects templates on Care Plan main. The
// wizard's own template step is OUT OF SCOPE for 32A — wizardStepTemplate
// tests continue to pin the wizard's TemplateMedSeedingModal flow.

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
  // Phase 32A F5 — medSeedingTemplate state retired with the Quick Start
  // template surface. The wizard's own template step keeps its mount.
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

  // Phase 32A F5 — applyTemplate callback retired with the Quick Start
  // surface (P1 lock). The wizard's own apply path lives in
  // utils/applyCarePlanTemplate.ts and is invoked from the wizard's
  // template step — unchanged.

  // ============================================================================
  // CONTEXTUAL INSIGHT
  // ============================================================================

  const getContextualInsight = useCallback(() => {
    if (!config) return null;

    // Phase 32A F5 \u2014 start-simple banner retired (P2). Its CTA referenced
    // "Mood" (not a row in the new layout) and recommended enabling
    // Medications (always on now).

    if (config.meds.enabled) {
      const medsConfig = config.meds;
      if (!medsConfig.medications?.length && !dismissedInsights.includes('add-meds')) {
        return {
          id: 'add-meds',
          icon: '\uD83D\uDC8A',
          title: 'Add medications',
          // Phase 32A F5 copy refresh \u2014 points at F4's inline affordance.
          // Pre-32A copy said "Tap Configure on Medications", but the
          // Configure button retired with F2.
          message: 'Tap + Add medication under the Medications row to set up your first medication and reminders.',
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

    // Phase 32A F5 \u2014 focus-suggestion banner retired (brief: "works against
    // the toggle-on-with-defaults pattern and reads as scolding the
    // caregiver for using the app").
    // Phase 32A F5 \u2014 select-vitals banner retired (P2). Its CTA referenced
    // a "Configure" button on the Vitals row that retired with F2; the new
    // path is "Tap Vitals row \u2192 drawer opens", which the user already does
    // when toggling Vitals on.

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

          {/* Phase 32A F5 — Quick Start Templates surface retired (P1 lock).
              The brief out-of-scope explicitly rejects templates: "EmberMate
              isn't right-sized for specific scenarios, templates would
              pretend it is." The wizard's own template step at
              app/care-plan/setup/template.tsx is OUT OF SCOPE for 32A. */}

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

          {/* Phase 32A F4 — Medications inline list. The brief says
              Medications is always expanded with a compact inline list
              of existing meds; "edit" affordances route to the canonical
              per-med edit form at /medication-form?id=…&source=careplan
              (matches app/care-plan/meds.tsx:466 — the brief's
              "or whatever the existing path is" defers to this entry
              point). "+ Add medication" routes to the same form without
              an id. Empty state surfaces a single inline row. */}
          <View testID="meds-inline-list" style={styles.medsInlineList}>
            {(config?.meds?.medications ?? []).filter(m => m.active).length === 0 ? (
              <TouchableOpacity
                style={styles.medsInlineAddRow}
                onPress={() => navigate('/medication-form?source=careplan')}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel="No meds added yet. Add medication."
              >
                <Text style={styles.medsInlineEmptyText}>No meds added yet</Text>
                <Text style={styles.medsInlineAddCta}>{'+ Add medication'}</Text>
              </TouchableOpacity>
            ) : (
              <>
                {(config?.meds?.medications ?? []).filter(m => m.active).map((med) => {
                  const tods = (med.timesOfDay ?? []).map(t => MEDS_TIME_LABEL[t] ?? t).join(' · ');
                  return (
                    <TouchableOpacity
                      key={med.id}
                      style={styles.medsInlineRow}
                      onPress={() => navigate(`/medication-form?id=${med.id}&source=careplan`)}
                      activeOpacity={0.7}
                      accessibilityRole="button"
                      accessibilityLabel={`Edit ${med.name}, ${med.dosage}${tods ? `, ${tods}` : ''}`}
                    >
                      <View style={styles.medsInlineRowInfo}>
                        <Text style={styles.medsInlineRowName}>{med.name}</Text>
                        <Text style={styles.medsInlineRowDetail}>
                          {med.dosage}{tods ? ` · ${tods}` : ''}
                        </Text>
                      </View>
                      <Text style={styles.categoryChevron}>{'›'}</Text>
                    </TouchableOpacity>
                  );
                })}
                <TouchableOpacity
                  style={styles.medsInlineAddRow}
                  onPress={() => navigate('/medication-form?source=careplan')}
                  activeOpacity={0.7}
                  accessibilityRole="button"
                  accessibilityLabel="Add medication"
                >
                  <Text style={styles.medsInlineAddCta}>{'+ Add medication'}</Text>
                </TouchableOpacity>
              </>
            )}
          </View>

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
                {isEnabled && isExpanded && config && (
                  <View testID={`drawer-${bucket}`} style={styles.drawerScaffold}>
                    {bucket === 'activity' && (
                      <ActivityDrawer
                        config={config.activity}
                        onUpdate={(updates) => updateBucket('activity', updates)}
                      />
                    )}
                    {/* F9 Water / F10 Sleep / F12 Appointments fill below. */}
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

      {/* Phase 32A F5 — TemplateMedSeedingModal mount retired from home
          (P1 lock). The wizard's template step keeps its own mount of
          this modal — unchanged. */}
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

  // Phase 32A F4 — Medications inline list (compact rows + add affordance).
  medsInlineList: {
    marginTop: -2,
    marginBottom: 8,
    marginHorizontal: 4,
    paddingHorizontal: 14,
  },
  medsInlineRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: c.glassFaint,
    borderRadius: 8,
    marginBottom: 4,
    gap: 12,
  },
  medsInlineRowInfo: {
    flex: 1,
  },
  medsInlineRowName: {
    fontSize: 14,
    fontWeight: '500' as const,
    color: c.textPrimary,
  },
  medsInlineRowDetail: {
    marginTop: 2,
    fontSize: 12,
    color: c.textSecondary,
  },
  medsInlineAddRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderStyle: 'dashed' as const,
    borderColor: c.glassBorder,
    borderRadius: 8,
    marginTop: 2,
    gap: 12,
  },
  medsInlineAddCta: {
    fontSize: 13,
    fontWeight: '500' as const,
    color: c.accent,
  },
  medsInlineEmptyText: {
    fontSize: 13,
    color: c.textSecondary,
    flex: 1,
  },

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

  // Phase 32A F5 — Templates styles retired with the Quick Start surface
  // (P1 lock). templateIntroLabel / templateIntro / templateCard /
  // templateHeader / templateEmoji / templateName / templateDescription /
  // templateBuckets had no callers after the retirement.
});
