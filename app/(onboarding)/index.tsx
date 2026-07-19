// ============================================================================
// ONBOARDING FLOW — 4-Screen Emotional Flow (pre-launch redesign)
// Welcome (C1) → Privacy (C2) → Name (C3) → Landing (C4)
//
// SCOPED REPLACEMENT — not a rebuild. The wizard at /care-plan/setup
// stays intact and is reachable post-onboarding from the Now tab's
// Care Plan link. Onboarding's job is the emotional landing: voice,
// brand register, and the minimum capture (patient name) needed to
// personalize the Now tab.
//
// Phase 16.3 — "Who are you caring for?" (WhoIsThisForScreen) cut
// from the welcome flow earlier; careMode hardcoded 'caregiver'.
// File left as orphan source per the established pattern.
//
// Pre-launch redesign C4 — the prior 5-screen flow
//   Welcome → Privacy → Meet (sample) → As You Use → Get Started
// is restructured. MeetSampleScreen, AsYouUseScreen, GetStartedScreen
// retired from the main flow. NameScreen (C3) replaces patient-name
// capture; LandingScreen (C4) is the new completion screen with
// "Meet {name}." display + warm italic + "Start with {name}" CTA.
// completeOnboarding now writes the three required keys + calls
// writePatientName + generates the default care plan + lands the
// user on /(tabs)/now (no wizard handoff).
//
// The cut screens (MeetSampleScreen / AsYouUseScreen / GetStartedScreen)
// remain on disk as orphan source per the established 15.10 / 15.6
// pattern; a separate cleanup scope can sweep them later. The Set Up
// + Sample option from GetStartedScreen is retired in v1; users who
// want the populated example exercise it from a future Settings
// surface.
// ============================================================================

import React, { useRef, useState, useMemo } from 'react';
import { View, StyleSheet, FlatList, Pressable, Text, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { useSharedValue, useAnimatedScrollHandler } from 'react-native-reanimated';
import { router } from 'expo-router';
import { safeSetItem } from '../../utils/safeStorage';

import { WelcomeScreen } from './screens/WelcomeScreen';
import { PrivacyDisclaimerScreen } from './screens/PrivacyDisclaimerScreen';
import { NameScreen } from './screens/NameScreen';
import { WatchingForScreen } from './screens/WatchingForScreen';
import { MedicationsScreen } from './screens/MedicationsScreen';
import { LandingScreen } from './screens/LandingScreen';

import { PaginationDots } from './components/PaginationDots';
import { logError } from '../../utils/devLog';
import { Colors, Typography, Spacing, BorderRadius } from '../../theme/theme-tokens';
import { useTheme } from '../../contexts/ThemeContext';
import { StorageKeys } from '../../utils/storageKeys';
import {
  generateCarePlanFromOnboarding,
  OnboardingAnswers,
  CareArea,
  CareRelationship,
} from '../../utils/onboardingToPlan';
import { saveCarePlanConfig } from '../../storage/carePlanConfigRepo';
import { writeOnboardingMedications, type OnboardingMedEntry } from '../../utils/onboardingMedsWriter';
import { writePatientName } from '../../utils/patientNameWriter';
import { updatePatient } from '../../storage/patientRegistry';
import { DEFAULT_PATIENT_ID } from '../../storage/carePlanRepo';

// Onboarding redesign fix — width is single-sourced from
// useWindowDimensions inside the component. Removing the module-level
// Dimensions.get('window') usage stops the orange-sliver bleed where
// the screen self-sized to a stale value while the FlatList page
// width tracked the live window.

const AnimatedFlatList = Animated.createAnimatedComponent(FlatList);

// 5-screen flow (Phase 16.3): Welcome → Privacy → Meet → As You Use → Get Started.
// "Who Is This For" cut — see header comment for the careMode-as-theater
// audit finding.
//
// v6.7 limitation: the "What to watch for" screen
// (app/(onboarding)/screens/WatchForScreen.tsx) is reachable from
// Settings → "What to watch for" but NOT from this flow. The flow doesn't
// capture the patient's diagnoses yet, so there's nothing for the screen
// to render here. Inserting it cleanly requires a conditions-capture step
// (free-text + library-aware picker) that warrants its own UX pass; that
// design lands with v7. Until then, the WatchForScreen contract is ready
// to slot in once a Diagnosis[] is captured on this side of onboarding.
// Onboarding redesign C4 — final 4-screen flow.
//   0 → Welcome (C1) — voice-setting hero
//   1 → Privacy   (C2) — disclaimer + terms
//   2 → Name      (C3) — patient-name capture
//   3 → Landing   (C4) — "Meet {name}." + completion
const ONBOARDING_SCREENS = [
  { id: '1', title: 'Welcome' },
  { id: '2', title: 'Privacy' },
  { id: '3', title: 'Name' },        // name + "who are they to you?" (relationship)
  { id: '4', title: 'WatchingFor' }, // Q2 — what are you keeping an eye on?
  { id: '5', title: 'Medications' }, // enrichment Piece 2 — real meds → real schedule
  { id: '6', title: 'Landing' },
];

export default function OnboardingFlow() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const flatListRef = useRef<FlatList>(null);
  // Onboarding redesign fix — single source of truth for slide width.
  // useWindowDimensions tracks the live window; the FlatList page
  // width, getItemLayout, and renderItem wrapper all read from here.
  const { width: SCREEN_WIDTH } = useWindowDimensions();
  const scrollX = useSharedValue(0);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [disclaimerAccepted, setDisclaimerAccepted] = useState(false);
  // Onboarding redesign C3 — patient name captured by NameScreen,
  // threaded to C4's Landing screen for "Meet {name}." interpolation
  // and to writePatientName at completion. Default empty until C3.
  const [patientName, setPatientName] = useState('');
  // onboarding-personalize — relationship (optional; folded into the name
  // screen) + Q2 care-area selections. Both default to "unset"; the
  // generator applies DEFAULT_CARE_AREAS for empty careAreas, and an
  // unset relationship leaves registry.relationship undefined (never 'self').
  const [relationship, setRelationship] = useState<CareRelationship | undefined>(undefined);
  const [careAreas, setCareAreas] = useState<CareArea[]>([]);
  // Enrichment Piece 2 — meds entered in the onboarding med-step. Written into
  // config.meds.medications at completion via the canonical addMedicationToPlan
  // path. Empty when the caregiver skips the step.
  const [medications, setMedications] = useState<OnboardingMedEntry[]>([]);
  // Phase 16.3 — careMode hardcoded to 'caregiver' (primary EmberMate
  // use case). Retained as a literal for the generateCarePlanFromOnboarding
  // answers shape below.
  const careMode: 'caregiver' = 'caregiver';

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollX.value = event.contentOffset.x;
    },
  });

  const handleNext = () => {
    if (currentIndex < ONBOARDING_SCREENS.length - 1) {
      flatListRef.current?.scrollToIndex({
        index: currentIndex + 1,
        animated: true,
      });
    }
  };

  // Phase 16.3 — handleSelectCareMode retired with WhoIsThisForScreen.

  // Onboarding redesign C4 — three required onboarding writes +
  // patient-name persistence + default care plan + land on Now.
  // No wizard handoff, no sample-data path here (Settings can
  // surface a populated example later if needed).
  const completeOnboarding = async () => {
    try {
      // 1. ONBOARDING_COMPLETE — gate consumer for first-time UX
      //    surfaces (FirstTimeWelcomeCard, prompt systems).
      await safeSetItem(StorageKeys.ONBOARDING_COMPLETE, 'true');
      // 2. disclaimer_accepted — terms acceptance from C2.
      await safeSetItem('disclaimer_accepted', 'true');
      // 3. Patient name — canonical write via writePatientName
      //    (registry + AsyncStorage mirror + EVENT.PATIENT emit).
      //    The C3 NameScreen's Continue button guards against empty,
      //    but writePatientName itself no-ops on empty trim — extra
      //    belt and suspenders.
      try {
        await writePatientName(DEFAULT_PATIENT_ID, patientName);
        // onboarding-personalize — persist the optional relationship to the
        // patientRegistry (the canonical store the Journal snapshot, the
        // Switch-Patient label, and the care-report copy "caring for your
        // parent" all read), AND mirror to PATIENT_RELATIONSHIP so the
        // profile screen's field pre-fills. Skipped relationship → no write
        // (registry stays undefined; never defaults to 'self').
        if (relationship) {
          await updatePatient(DEFAULT_PATIENT_ID, { relationship });
          await safeSetItem(StorageKeys.PATIENT_RELATIONSHIP, relationship);
        }
      } catch (nameError) {
        logError('OnboardingFlow.writePatientName', nameError);
        // Non-blocking — the name can be re-entered later via the
        // post-onboarding profile nudge (Now tab) or Settings.
      }

      // onboarding-personalize — build the plan from the caregiver's actual
      // Q2 selections (or the sane default when skipped). The generator gates
      // every bucket on selection — nothing force-on. relationship is carried
      // for the answers shape only; the generator does not read it (the
      // persistence above is what surfaces it).
      try {
        const answers: OnboardingAnswers = {
          relationship: relationship ?? 'parent',
          careAreas,
          concerns: [],
          cadence: 'morning_evening',
        };
        const carePlanConfig = generateCarePlanFromOnboarding(answers);
        await saveCarePlanConfig(carePlanConfig);

        // Enrichment Piece 2 — write the meds entered in the onboarding
        // med-step via the canonical addMedicationToPlan path, so they
        // generate real daily instances identically to a Care Plan add. Runs
        // AFTER the config is saved (the writer appends to config.meds and
        // auto-enables the bucket). Skipping leaves `medications` empty → no
        // writes; the Now tab's add-medications affordance catches the
        // caregiver later.
        await writeOnboardingMedications(medications);
      } catch (cpError) {
        logError('OnboardingFlow.generateCarePlan', cpError);
        // Non-blocking — app works without initial care plan; user
        // can configure via the Now tab's Care Plan link.
      }

      // Land on the Now tab. The wizard at /care-plan/setup stays
      // reachable from there but is no longer a hard handoff.
      router.replace('/(tabs)/now');
    } catch (error) {
      logError('OnboardingFlow.completeOnboarding', error);
    }
  };

  const onViewableItemsChanged = useRef(({ viewableItems }: any) => {
    if (viewableItems.length > 0) {
      setCurrentIndex(viewableItems[0].index || 0);
    }
  }).current;

  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 50,
  }).current;

  const advanceToNext = () => {
    flatListRef.current?.scrollToIndex({
      index: currentIndex + 1,
      animated: true,
    });
  };

  // Onboarding redesign C4 — final 4-screen renderer.
  //   0 Welcome (C1) → 1 Privacy (C2) → 2 Name (C3) → 3 Landing (C4)
  // Onboarding redesign C4 fix — each renderItem return is wrapped in
  // a fixed-width slide container so the horizontal FlatList computes
  // page widths correctly. Without the wrapper, screen content
  // (especially ScrollView children) competed with FlatList sizing
  // and the paged scroller landed on a slide it couldn't recover from
  // (NameScreen-first-visible / Continue-tap-dead bug).
  const renderItem = ({ item, index }: any) => {
    let screen: React.ReactNode = null;
    if (index === 0) {
      // Onboarding redesign C1 — Welcome owns its own "Begin" CTA
      // wired to advanceToNext. The shared footer Next is hidden
      // on this index (showFooter condition below).
      screen = <WelcomeScreen onContinue={advanceToNext} />;
    } else if (index === 1) {
      // Onboarding redesign C2 — Privacy owns its own ember-gradient
      // Continue CTA wired to advanceToNext. The Terms helper surfaces
      // only after a Continue tap while the checkbox is unchecked.
      screen = (
        <PrivacyDisclaimerScreen
          onDisclaimerAccepted={setDisclaimerAccepted}
          onContinue={advanceToNext}
        />
      );
    } else if (index === 2) {
      // Onboarding redesign C3 — NameScreen replaces MeetSampleScreen
      // at index 2. Captures the patient name, stores it in
      // orchestrator state, then advances. C4's Landing interpolates
      // "Meet {name}." from this value; completeOnboarding (also in C4)
      // writes it through writePatientName.
      // isActive prop drives focus-on-arrival: NameScreen focuses its
      // TextInput inside a settle delay only when this slide is the
      // active one (replaces the launch-bug-causing autoFocus prop).
      screen = (
        <NameScreen
          initialValue={patientName}
          isActive={currentIndex === 2}
          onContinue={(name, rel) => {
            setPatientName(name);
            setRelationship(rel);
            advanceToNext();
          }}
        />
      );
    } else if (index === 3) {
      // onboarding-personalize Q2 — care-area multi-select drives the
      // generated plan. Continue stores selections; Skip leaves careAreas
      // empty (generator applies DEFAULT_CARE_AREAS). Both advance.
      screen = (
        <WatchingForScreen
          onContinue={(areas) => {
            setCareAreas(areas);
            advanceToNext();
          }}
          onSkip={() => {
            setCareAreas([]);
            advanceToNext();
          }}
        />
      );
    } else if (index === 4) {
      // Enrichment Piece 2 — collect a few real meds so the account arrives
      // with a real schedule. Both Continue (with entered meds) and Skip (none)
      // advance; the write happens in completeOnboarding.
      screen = (
        <MedicationsScreen
          patientName={patientName}
          onContinue={(meds) => {
            setMedications(meds);
            advanceToNext();
          }}
          onSkip={() => {
            setMedications([]);
            advanceToNext();
          }}
        />
      );
    } else if (index === 5) {
      screen = (
        <LandingScreen
          patientName={patientName}
          onComplete={completeOnboarding}
        />
      );
    }
    return (
      // Round 3 right-edge bleed fix — overflow:'hidden' clips any
      // aurora/background overhang at the slide boundary so an
      // adjacent slide's content can't peek through during paging.
      <View style={{ width: SCREEN_WIDTH, flex: 1, overflow: 'hidden' }}>
        {screen}
      </View>
    );
  };

  // Onboarding redesign C4 — every screen in the 4-screen flow owns
  // its own CTA. The shared footer (pagination + Next button) is
  // hidden on all indices; PaginationDots is kept imported for the
  // current scope's structure but no longer renders. A future
  // cleanup commit can retire the footer JSX + the import together.
  const showFooter = false;
  const isNextDisabled = false;

  return (
    <View style={styles.container}>
      <AnimatedFlatList
        ref={flatListRef}
        data={ONBOARDING_SCREENS}
        renderItem={renderItem}
        keyExtractor={(item: any) => item.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        bounces={false}
        // Onboarding redesign C4 fix — pin the first slide on mount.
        // Without this, the FlatList sometimes initialized on index 2
        // (NameScreen) when the first slide hadn't yet measured, and
        // the paged scroller couldn't recover (Continue tap dead).
        initialScrollIndex={0}
        // Onboarding redesign hardening — swipes disabled. The flow
        // navigates via per-screen CTAs (forward) + the back chevron
        // overlay below (backward). This permanently prevents any
        // focus/scroll fight (autoFocus inside an input would otherwise
        // steal the FlatList scroll position) and accidental mid-flow
        // swipes that could land on a partially-complete slide.
        // scrollToIndex via flatListRef still works programmatically.
        scrollEnabled={false}
        keyboardShouldPersistTaps="handled"
        // getItemLayout lets the FlatList compute slide offsets up-
        // front instead of waiting for content to measure — required
        // for initialScrollIndex to land deterministically and for
        // scrollToIndex (advanceToNext) to hit the right slide.
        getItemLayout={(_data: any, index: number) => ({
          length: SCREEN_WIDTH,
          offset: SCREEN_WIDTH * index,
          index,
        })}
      />

      {/* Onboarding redesign back affordance — subtle chevron top-
          left inside the safe area on indices 1-3. Tapping calls
          scrollToIndex(currentIndex - 1) on the FlatList ref (which
          works even with scrollEnabled={false}). Index 0 (Welcome)
          intentionally has no back button. pointerEvents="box-none"
          on the SafeAreaView lets the back button receive taps while
          letting everything else pass through to the slides below. */}
      {currentIndex >= 1 && currentIndex <= 4 && (
        <SafeAreaView
          style={styles.backOverlay}
          edges={['top']}
          pointerEvents="box-none"
        >
          <Pressable
            onPress={() =>
              flatListRef.current?.scrollToIndex({
                index: currentIndex - 1,
                animated: true,
              })
            }
            hitSlop={12}
            style={styles.backButton}
            accessibilityRole="button"
            accessibilityLabel="Back"
          >
            <Text style={styles.backChevron}>‹</Text>
          </Pressable>
        </SafeAreaView>
      )}

      {/* Navigation footer */}
      {showFooter && (
        <View style={styles.footer}>
          {/* Empty spacer for layout balance */}
          <View style={styles.spacer} />

          <PaginationDots
            count={ONBOARDING_SCREENS.length}
            scrollX={scrollX}
            width={SCREEN_WIDTH}
          />

          <Pressable
            onPress={handleNext}
            style={[styles.nextButton, isNextDisabled && styles.nextButtonDisabled]}
            disabled={isNextDisabled}
            accessibilityLabel="Next onboarding screen"
            accessibilityRole="button"
            accessibilityState={{ disabled: isNextDisabled }}
          >
            <Text style={styles.nextText}>Next</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

const createStyles = (c: typeof Colors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: c.background,
  },
  // Onboarding redesign back-affordance styles.
  backOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
  backButton: {
    width: 44, // allow: Apple HIG tap-target minimum
    height: 44, // allow: Apple HIG tap-target minimum
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8, // allow: subtle edge inset for the chevron glyph
  },
  backChevron: {
    fontSize: 28, // allow: subtle chevron glyph per spec
    color: c.textMuted,
    fontWeight: '300' as const,
    lineHeight: 32, // allow: vertically center the glyph in the 44pt button
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.lg,
    paddingTop: Spacing.md,
    backgroundColor: 'rgba(10, 10, 15, 0.6)',
  },
  spacer: {
    minWidth: 80,
  },
  nextButton: {
    backgroundColor: c.accent,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.lg,
    minWidth: 80,
    alignItems: 'center',
  },
  nextButtonDisabled: {
    opacity: 0.4,
  },
  nextText: {
    ...Typography.label,
    color: c.textPrimary,
  },
});
