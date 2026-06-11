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
import { View, StyleSheet, FlatList, Dimensions, Pressable, Text } from 'react-native';
import Animated, { useSharedValue, useAnimatedScrollHandler } from 'react-native-reanimated';
import { router } from 'expo-router';
import { safeSetItem } from '../../utils/safeStorage';

import { WelcomeScreen } from './screens/WelcomeScreen';
import { PrivacyDisclaimerScreen } from './screens/PrivacyDisclaimerScreen';
import { NameScreen } from './screens/NameScreen';
import { LandingScreen } from './screens/LandingScreen';

import { PaginationDots } from './components/PaginationDots';
import { logError } from '../../utils/devLog';
import { Colors, Typography, Spacing, BorderRadius } from '../../theme/theme-tokens';
import { useTheme } from '../../contexts/ThemeContext';
import { StorageKeys } from '../../utils/storageKeys';
import { generateCarePlanFromOnboarding, OnboardingAnswers } from '../../utils/onboardingToPlan';
import { saveCarePlanConfig } from '../../storage/carePlanConfigRepo';
import { writePatientName } from '../../utils/patientNameWriter';
import { DEFAULT_PATIENT_ID } from '../../storage/carePlanRepo';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

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
  { id: '3', title: 'Name' },
  { id: '4', title: 'Landing' },
];

export default function OnboardingFlow() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const flatListRef = useRef<FlatList>(null);
  const scrollX = useSharedValue(0);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [disclaimerAccepted, setDisclaimerAccepted] = useState(false);
  // Onboarding redesign C3 — patient name captured by NameScreen,
  // threaded to C4's Landing screen for "Meet {name}." interpolation
  // and to writePatientName at completion. Default empty until C3.
  const [patientName, setPatientName] = useState('');
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
      } catch (nameError) {
        logError('OnboardingFlow.writePatientName', nameError);
        // Non-blocking — the name can be re-entered later via the
        // post-onboarding profile nudge (Now tab) or Settings.
      }

      // Default care plan — meds + wellness enabled per C4 spec.
      // wellness.timesOfDay defaults to ['morning','evening'] via the
      // 'morning_evening' cadence (CADENCE_TO_TIMES map).
      try {
        const answers: OnboardingAnswers = {
          relationship: 'parent',
          careAreas: ['medications', 'wellness'],
          concerns: [],
          cadence: 'morning_evening',
        };
        const carePlanConfig = generateCarePlanFromOnboarding(answers);
        await saveCarePlanConfig(carePlanConfig);
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
  const renderItem = ({ item, index }: any) => {
    if (index === 0) {
      // Onboarding redesign C1 — Welcome owns its own "Begin" CTA
      // wired to advanceToNext. The shared footer Next is hidden
      // on this index (showFooter condition below).
      return <WelcomeScreen onContinue={advanceToNext} />;
    }
    if (index === 1) {
      // Onboarding redesign C2 — Privacy owns its own ember-gradient
      // Continue CTA wired to advanceToNext. The Terms helper surfaces
      // only after a Continue tap while the checkbox is unchecked.
      return (
        <PrivacyDisclaimerScreen
          onDisclaimerAccepted={setDisclaimerAccepted}
          onContinue={advanceToNext}
        />
      );
    }
    if (index === 2) {
      // Onboarding redesign C3 — NameScreen replaces MeetSampleScreen
      // at index 2. Captures the patient name, stores it in
      // orchestrator state, then advances. C4's Landing interpolates
      // "Meet {name}." from this value; completeOnboarding (also in C4)
      // writes it through writePatientName.
      return (
        <NameScreen
          initialValue={patientName}
          onContinue={(name) => {
            setPatientName(name);
            advanceToNext();
          }}
        />
      );
    }
    if (index === 3) {
      return (
        <LandingScreen
          patientName={patientName}
          onComplete={completeOnboarding}
        />
      );
    }
    return null;
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
      />

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
