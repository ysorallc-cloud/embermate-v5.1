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
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, BorderRadius } from '../../theme/theme-tokens';
import { useTheme } from '../../contexts/ThemeContext';
import { useCarePlanConfig } from '../../hooks/useCarePlanConfig';
import { getWellnessCadenceText } from '../../utils/wellnessCadenceText';
import {
  BucketType,
  BucketConfig,
  BUCKET_META,
  BUCKET_TYPES,
  MVP_HIDDEN_BUCKETS,
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
import { WaterDrawer } from '../../components/careplan/drawers/WaterDrawer';
import { SleepDrawer } from '../../components/careplan/drawers/SleepDrawer';
import { MealsDrawer } from '../../components/careplan/drawers/MealsDrawer';
import { AppointmentsDrawer } from '../../components/careplan/drawers/AppointmentsDrawer';
import { VitalsDrawer } from '../../components/careplan/drawers/VitalsDrawer';
import { WellnessDrawer } from '../../components/careplan/drawers/WellnessDrawer';
// Phase 32A.1 F2 — Medications inline list extracted into its own
// drawer component. Like WellnessDrawer this drawer self-manages its
// data via useCarePlanConfig (per-med shape is richer than a bucket
// config). The inline JSX block + MEDS_TIME_LABEL map + medsInline*
// styles in this file are retired.
import { MedicationsDrawer } from '../../components/careplan/drawers/MedicationsDrawer';

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
// Phase 34 F4 — "Add when ready" section list is DERIVED from
// MVP_HIDDEN_BUCKETS, not hardcoded. All four optional buckets are
// v1-hidden, so this resolves to [] in v1 and the section is guarded
// (below) so no empty zone renders. v1.1 unhide = remove a bucket
// from MVP_HIDDEN_BUCKETS → it reappears in this section automatically.
const ADD_WHEN_READY_BUCKETS_ALL: BucketType[] = ['water', 'sleep', 'activity', 'appointments'];
const ADD_WHEN_READY_BUCKETS: BucketType[] = ADD_WHEN_READY_BUCKETS_ALL.filter(
  b => !MVP_HIDDEN_BUCKETS.includes(b),
);

// Phase 33 F2 — line-icon set replacing the pre-33 emoji glyphs on
// every Care Plan category row. User-locked mapping (2026-05-25):
// medkit (not medical — warm, not hospital-clinical), pulse, partly-
// sunny, restaurant, water, moon, walk, calendar. All -outline
// variants for the thin-stroke / cream-muted register. Stroke color
// is c.textSecondary at render time; no fill, no color-coding.
// BUCKET_META.emoji STAYS in types/carePlanConfig.ts — other surfaces
// (Now-tab, Insights, etc.) still consume it. Phase 33 is Care Plan
// only; this map is the local override for this file.
const BUCKET_ICON_MAP: Record<BucketType, React.ComponentProps<typeof Ionicons>['name']> = {
  meds: 'medkit-outline',
  vitals: 'pulse-outline',
  wellness: 'partly-sunny-outline',
  meals: 'restaurant-outline',
  water: 'water-outline',
  sleep: 'moon-outline',
  activity: 'walk-outline',
  appointments: 'calendar-outline',
  // Retired buckets — kept in the map for type completeness (Record
  // requires every BucketType key). 32A's render filter prevents
  // them from reaching the UI; the icon choice here is incidental.
  errands: 'list-outline',
  shifts: 'people-outline',
  self_care: 'heart-outline',
};

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

// Phase 32A.1 F2 — MEDS_TIME_LABEL retired. Moved into
// components/careplan/drawers/MedicationsDrawer.tsx with the inline
// list extraction.

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
  name: string;
  detail: string | null;
  enabled: boolean;
  onToggle: (enabled: boolean) => void;
  onPress: () => void;
}

function CategoryRow({ bucket, name, detail, enabled, onToggle, onPress }: CategoryRowProps) {
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
      {/* Left: icon + text. Phase 33 F2 retired the emoji glyph in
          favor of a thin Ionicons outline icon, cream-muted stroke,
          in a fixed 24pt gutter so header + rows align on one left
          edge. */}
      <View style={styles.categoryLeft}>
        <View style={styles.categoryEmoji}>
          <Ionicons name={BUCKET_ICON_MAP[bucket]} size={20} color={colors.textSecondary} />
        </View>
        <View style={styles.categoryInfo}>
          <Text style={styles.categoryName}>{name}</Text>
          {enabled && detail && <Text style={styles.categoryDetail}>{detail}</Text>}
        </View>
      </View>
      {/* Right: toggle + chevron — fixed width column */}
      <View style={styles.categoryRight}>
        {/* Phase 33 F3 — muted toggle ON state. trackColor.true was
            colors.accent (saturated sage #5fb88a, loud against the
            cream-on-warm-charcoal palette when 5 rows light up at
            once); now colors.accentMuted (same sage at 50% alpha)
            so ON reads quiet but clearly sage. ON thumb / OFF track
            / OFF thumb / iOS background all unchanged — single
            token swap. Behavior unchanged (visual only). */}
        <Switch
          value={enabled}
          onValueChange={onToggle}
          trackColor={{ false: colors.glassStrong, true: colors.accentMuted }}
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
  // Phase 33 F4 → updated by Phase 34 F3.1 — wellness cadence
  // subtitle now reads carePlanConfig.wellness.timesOfDay (the
  // source of truth the F2/F3 generator AND the F3.1 wellness
  // chips read). The P5 bridge store (useWellnessSettings) is no
  // longer touched here; the subtitle, the chips, and generation
  // all agree.
  const getBucketDetail = useCallback((bucket: BucketType): string | null => {
    if (bucket === 'wellness') {
      // F3.1 — read carePlanConfig.wellness.timesOfDay directly,
      // matching the source the F2/F3 generator and the F3.1
      // wellness chips both use. Pre-F3.1 this read the P5 store
      // (wellnessSettings.{morning,evening}.enabled), which
      // diverged from generation.
      return getWellnessCadenceText(config?.wellness?.timesOfDay as any);
    }
    return getBucketStatus(bucket);
  }, [config, getBucketStatus]);

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
  // Phase 32A.1 F1 — Medications drawer state. Medications is OUTSIDE the
  // accordion (Q-32A.1.2 + Q-32A.1.3 lock): the row is always shown,
  // independent of which DAILY TRACKING / ADD WHEN READY drawer is open.
  // Default open (always-shown semantic — caregiver sees their meds
  // immediately on opening Care Plan).
  const [medsExpanded, setMedsExpanded] = useState<boolean>(true);
  // Phase 32A.1 F8 — Edit-mode state for the meds drawer LIFTS up here
  // from MedicationsDrawer (where F6 placed it). The Edit/Done toggle
  // moves into the meds HEADER row (right-aligned next to the caret)
  // instead of sitting on its own row above the list — the in-drawer
  // row created a visual gap that read as two zones. Visual-only fix;
  // behavior unchanged (still toggles MedRow's leading minus-circle,
  // still shares the F3 soft-delete Alert flow). State lifts because
  // the toggle now lives in a sibling component (this file) that owns
  // the header row.
  const [medsEditMode, setMedsEditMode] = useState<boolean>(false);
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

  // Phase 32A F2 (Phase 32A.1 reframe): row tap behavior for the accordion
  // drawers. Medications is OUTSIDE the accordion now — its row taps
  // toggle medsExpanded directly (handleToggleMedsExpanded below) and
  // do NOT route through this handler. Every other bucket tap, when
  // enabled, opens or closes its drawer in the accordion. Disabled rows
  // are no-ops on tap.
  const handleConfigureBucket = useCallback((bucket: BucketType) => {
    setExpandedBucket((curr) => (curr === bucket ? null : bucket));
  }, []);

  // Phase 32A.1 F1 — Medications row toggle. Independent of the
  // accordion; never touches setExpandedBucket so opening Vitals /
  // Wellness / etc. doesn't collapse the meds drawer, and toggling
  // meds doesn't collapse whichever accordion drawer is open.
  const handleToggleMedsExpanded = useCallback(() => {
    setMedsExpanded((prev) => !prev);
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
          <View testID="section-zone-always-on" style={styles.sectionZone}>
          {/* Phase 32A.1 F1 \u2014 Medications row converts from chevron-
              navigate-to-list (which routed to the now-retired
              retired /care-plan/meds subscreen) into expand/caret behavior. Tap
              the row toggles medsExpanded. Caret indicator reflects
              the current state ('\u02C7' down when expanded; '\u203A'
              right when collapsed). Row is OUTSIDE the accordion \u2014
              setMedsExpanded never touches expandedBucket. */}
          {ALWAYS_ON_BUCKETS.map(bucket => {
            // Phase 32A.1 F8 - Edit/Done toggle visibility gated on
            // (medsExpanded && there's at least one med). No meds ->
            // nothing to edit; collapsed drawer -> toggle hidden so
            // the row reads as a clean expand affordance.
            const medsCount = config?.meds?.medications?.length ?? 0;
            const showEditToggle = medsExpanded && medsCount > 0;
            return (
              <View key={bucket} style={styles.coreCard}>
                {/* Main tap area: emoji + name + status. Tapping this
                    or the chevron toggles medsExpanded. Edit lives as
                    a sibling touch zone between them (right-aligned,
                    same line as caret per the STOP-C visual fix). */}
                <TouchableOpacity
                  style={styles.coreCardMain}
                  onPress={handleToggleMedsExpanded}
                  activeOpacity={0.7}
                  accessibilityLabel={`${BUCKET_META[bucket].name}. ${medsExpanded ? 'Tap to collapse.' : 'Tap to expand.'}`}
                  accessibilityRole="button"
                  accessibilityState={{ expanded: medsExpanded }}
                >
                  <View style={styles.categoryEmoji}>
                    <Ionicons name={BUCKET_ICON_MAP[bucket]} size={20} color={colors.textSecondary} />
                  </View>
                  <View style={styles.categoryInfo}>
                    <Text style={styles.categoryName}>{BUCKET_META[bucket].name}</Text>
                    {getBucketDetail(bucket) && (
                      <Text style={styles.categoryDetail}>{getBucketDetail(bucket)}</Text>
                    )}
                  </View>
                </TouchableOpacity>
                {showEditToggle && (
                  <TouchableOpacity
                    style={styles.medsHeaderEditToggle}
                    onPress={() => setMedsEditMode((v) => !v)}
                    activeOpacity={0.7}
                    accessibilityRole="button"
                    accessibilityLabel={medsEditMode ? 'Done editing medications' : 'Edit medications'}
                    accessibilityState={{ selected: medsEditMode }}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Text style={styles.medsHeaderEditLabel}>
                      {medsEditMode ? 'Done' : 'Edit'}
                    </Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  style={styles.coreCardChevron}
                  onPress={handleToggleMedsExpanded}
                  activeOpacity={0.7}
                  accessibilityRole="button"
                  accessibilityLabel={medsExpanded ? 'Collapse Medications' : 'Expand Medications'}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Text style={styles.categoryChevron}>
                    {medsExpanded ? '\u02C7' : '\u203A'}
                  </Text>
                </TouchableOpacity>
              </View>
            );
          })}

          {/* Phase 32A.1 F2 — MedicationsDrawer mount. Gated on
              medsExpanded (F1 locks "always-shown" default true,
              tap-row-to-collapse). Drawer self-manages its data via
              useCarePlanConfig; receives editMode from the lifted
              parent state (F8) so per-row minus-circles stay in sync
              with the Edit toggle in the header row.
              Phase 32A.1 F9 (STOP-C device-walk fix) — wrap the drawer
              in the SHARED drawerScaffold (same testID convention,
              same glassFaint ground + 2px sage left-rule) so meds
              read as one contained drawer like the 7 sibling drawers,
              not floating cards. */}
          {medsExpanded && (
            <View testID="drawer-meds" style={styles.drawerScaffold}>
              <MedicationsDrawer editMode={medsEditMode} />
            </View>
          )}
          </View>

          <SectionEyebrow text="Daily tracking" />
          <View testID="section-zone-daily-tracking" style={styles.sectionZone}>
          {DAILY_TRACKING_BUCKETS.map(bucket => {
            const isEnabled = enabledBucketSet.has(bucket);
            const isExpanded = expandedBucket === bucket;
            return (
              <React.Fragment key={bucket}>
                <CategoryRow
                  bucket={bucket}
                  name={BUCKET_META[bucket].name}
                  detail={isEnabled ? getBucketDetail(bucket) : null}
                  enabled={isEnabled}
                  onToggle={(val) => handleToggleBucket(bucket, val)}
                  onPress={() => handleConfigureBucket(bucket)}
                />
                {isEnabled && isExpanded && config && (
                  <View testID={`drawer-${bucket}`} style={styles.drawerScaffold}>
                    {bucket === 'vitals' && (
                      <VitalsDrawer
                        config={config.vitals}
                        onUpdate={(updates) => updateBucket('vitals', updates)}
                        enabled={isEnabled}
                        onToggleEnabled={(val) => handleToggleBucket('vitals', val)}
                      />
                    )}
                    {bucket === 'wellness' && (
                      // F7 — WellnessDrawer reads/writes the wellness
                      // store internally via useWellnessSettings (P5
                      // bridge — separate from useCarePlanConfig).
                      <WellnessDrawer />
                    )}
                    {bucket === 'meals' && (
                      <MealsDrawer
                        config={config.meals}
                        onUpdate={(updates) => updateBucket('meals', updates)}
                      />
                    )}
                  </View>
                )}
              </React.Fragment>
            );
          })}
          </View>

          {/* Phase 34 F4 — guard the whole "Add when ready" section on a
              non-empty bucket list. All four optional buckets are
              v1-hidden (MVP_HIDDEN_BUCKETS) so ADD_WHEN_READY_BUCKETS
              resolves to [] in v1 → the section (eyebrow + zone) does
              not render. v1 Care Plan presents as complete; no empty
              zone, no "coming soon." v1.1 unhide re-populates the list
              and the section reappears automatically. */}
          {ADD_WHEN_READY_BUCKETS.length > 0 && (
          <>
          <SectionEyebrow text="Add when ready" />
          <View testID="section-zone-add-when-ready" style={styles.sectionZone}>
          {ADD_WHEN_READY_BUCKETS.map(bucket => {
            const isEnabled = enabledBucketSet.has(bucket);
            const isExpanded = expandedBucket === bucket;
            return (
              <React.Fragment key={bucket}>
                <CategoryRow
                  bucket={bucket}
                  name={BUCKET_META[bucket].name}
                  detail={isEnabled ? getBucketDetail(bucket) : null}
                  enabled={isEnabled}
                  onToggle={(val) => handleToggleBucket(bucket, val)}
                  onPress={() => handleConfigureBucket(bucket)}
                />
                {isEnabled && isExpanded && config && (
                  <View testID={`drawer-${bucket}`} style={styles.drawerScaffold}>
                    {bucket === 'water' && (
                      <WaterDrawer
                        config={config.water}
                        onUpdate={(updates) => updateBucket('water', updates)}
                      />
                    )}
                    {bucket === 'sleep' && (
                      <SleepDrawer
                        config={config.sleep}
                        onUpdate={(updates) => updateBucket('sleep', updates)}
                      />
                    )}
                    {bucket === 'activity' && (
                      <ActivityDrawer
                        config={config.activity}
                        onUpdate={(updates) => updateBucket('activity', updates)}
                      />
                    )}
                    {bucket === 'appointments' && (
                      <AppointmentsDrawer
                        config={config.appointments}
                        onUpdate={(updates) => updateBucket('appointments', updates)}
                      />
                    )}
                  </View>
                )}
              </React.Fragment>
            );
          })}
          </View>
          </>
          )}

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

  // Phase 32A.1 F2 — medsInline* styles retired. Moved into
  // components/careplan/drawers/MedicationsDrawer.tsx with the
  // inline list extraction.

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
  // Phase 33 F1 — three identical grounded zones. Always On / Daily
  // Tracking / Add When Ready each wrap in this container. Tokens
  // are canon-locked + already in use elsewhere (bgRaised = F10
  // swipe foreground; hairlineInset = F9 row dividers) — zero new
  // colors. User-locked "all three identical" — no warmer treatment
  // for the meds / always-on zone; no per-section variant exists.
  sectionZone: {
    backgroundColor: c.bgRaised,
    borderWidth: 1,
    borderColor: c.hairlineInset,
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
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
  // Phase 32A.1 F8 - sub-zones for the meds header row. Splitting the
  // single-TouchableOpacity row into three touch zones so the Edit
  // toggle can sit inline (right-aligned, sibling to the caret)
  // without nesting touchables. The main zone holds emoji + name,
  // the chevron zone wraps the caret with a larger tap area, and the
  // Edit toggle slots between them when meds exist.
  coreCardMain: {
    flex: 1,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 12,
  },
  coreCardChevron: {
    paddingHorizontal: 4,
    paddingVertical: 4,
  },
  medsHeaderEditToggle: {
    paddingHorizontal: 8,
    paddingVertical: 4, // allow: tap-target padding (Apple HIG ≥44pt with hitSlop)
  },
  medsHeaderEditLabel: {
    fontSize: 13,
    fontWeight: '500' as const,
    color: c.accent,
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
  // Phase 33 F2 — fixed-width gutter for the Ionicons line icon
  // (formerly the emoji <Text>). 24pt locked so the meds header +
  // sibling category rows share ONE left edge for their name text.
  // The icon itself is 20pt and centers in this 24pt slot.
  categoryEmoji: {
    width: 24,
    alignItems: 'center',
    justifyContent: 'center',
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
