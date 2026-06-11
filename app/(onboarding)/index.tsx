// ============================================================================
// ONBOARDING FLOW — 5-Screen Experience (v1.0; Phase 16.3)
// Welcome → Privacy → Meet (sample) → As You Use → Get Started
//
// Phase 16.3 — "Who are you caring for?" (WhoIsThisForScreen) cut from
// the welcome flow. The careMode selection drove only in-onboarding
// copy variations and no persistent app state: the CARE_MODE storage
// key had zero production readers, and the relationship value never
// flowed into Patient.relationship (the default Patient row hardcodes
// relationship='self' in patientRegistry regardless). Per the spec's
// stated trade-off ("if the 'myself' path is meaningfully different
// and someone needs it, they can configure in Settings later"), the
// screen was retired and careMode is now hardcoded 'caregiver' (the
// primary EmberMate use case).
//
// The WhoIsThisForScreen.tsx file is left in place as orphan source
// (matches 15.10 / 15.6 patterns) for a separate cleanup scope or
// v1.1+ re-introduction as a Settings-page selector.
// ============================================================================

import React, { useRef, useState, useMemo } from 'react';
import { View, StyleSheet, FlatList, Dimensions, Pressable, Text } from 'react-native';
import Animated, { useSharedValue, useAnimatedScrollHandler } from 'react-native-reanimated';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { safeSetItem } from '../../utils/safeStorage';

import { WelcomeScreen } from './screens/WelcomeScreen';
import { PrivacyDisclaimerScreen } from './screens/PrivacyDisclaimerScreen';
import { NameScreen } from './screens/NameScreen';
import { GetStartedScreen } from './screens/GetStartedScreen';
import { AsYouUseScreen } from './screens/AsYouUseScreen';

import { PaginationDots } from './components/PaginationDots';
import { seedSampleData } from '../../utils/sampleData';
import { resetSampleBannerMode } from '../../utils/sampleDataManager';
import { initializeSampleData } from '../../utils/sampleDataGenerator';
import { logError } from '../../utils/devLog';
import { Colors, Typography, Spacing, BorderRadius } from '../../theme/theme-tokens';
import { useTheme } from '../../contexts/ThemeContext';
import { StorageKeys } from '../../utils/storageKeys';
import { generateCarePlanFromOnboarding, OnboardingAnswers } from '../../utils/onboardingToPlan';
import { saveCarePlanConfig } from '../../storage/carePlanConfigRepo';

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
// Onboarding redesign C3 — MeetSampleScreen retired from the main
// flow at index 2 in favor of the new NameScreen. The full
// 4-screen restructure (cutting AsYouUseScreen + GetStartedScreen
// and adding the Landing "Meet {name}" screen) lands in C4.
const ONBOARDING_SCREENS = [
  { id: '1', title: 'Welcome' },
  { id: '2', title: 'Privacy' },
  { id: '3', title: 'Name' },
  { id: '4', title: 'As You Use' },
  { id: '5', title: 'Get Started' },
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
  // use case). The state hook + WhoIsThisForScreen selector were
  // retired; see the file's header comment for the audit findings.
  const careMode: 'caregiver' | 'self' = 'caregiver';

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

  const handleAcceptDisclaimer = async (seedData: boolean) => {
    await completeOnboarding(seedData);
  };

  const completeOnboarding = async (seedData: boolean = false) => {
    try {
      await safeSetItem(StorageKeys.ONBOARDING_COMPLETE, 'true');
      await safeSetItem('disclaimer_accepted', 'true');
      await safeSetItem(StorageKeys.CARE_MODE, careMode);

      // Generate initial care plan from onboarding answers
      try {
        const answers: OnboardingAnswers = {
          relationship: careMode === 'self' ? 'self' : 'parent',
          careAreas: ['medications', 'wellness'],
          concerns: [],
          cadence: 'morning_evening',
        };
        const carePlanConfig = generateCarePlanFromOnboarding(answers);
        await saveCarePlanConfig(carePlanConfig);
      } catch (cpError) {
        logError('OnboardingFlow.generateCarePlan', cpError);
        // Non-blocking — app works without initial care plan
      }

      // Seed sample data if requested
      if (seedData) {
        // Clear the initialized flag so initializeSampleData() runs fresh
        // (may still be set from a previous onboarding cycle)
        await AsyncStorage.removeItem(StorageKeys.SAMPLE_DATA_INITIALIZED);
        await seedSampleData({ daysOfData: 14 });
        await initializeSampleData();
        // Phase 5.13.1.e — fresh sample seed shows banner in 'full' mode
        // on first Now-tab landing.
        await resetSampleBannerMode();
        // Sample-mode users land on Now and pick up the wizard later via
        // the banner — preserve the legacy route here.
        router.replace('/(tabs)/now');
        return;
      }

      // Phase 5.13.f — real-mode path now hands off to the wizard so
      // the user picks a template and confirms buckets before landing
      // on Now. Cancel from the wizard returns to the onboarding stack.
      router.replace({
        pathname: '/care-plan/setup/who',
        params: { from: 'onboarding' },
      } as any);
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

  // Phase 16.3 — renderer reindexed after WhoIsThisFor cut. Screen
  // ordering is now Welcome(0) → Privacy(1) → Meet(2) → AsYouUse(3)
  // → GetStarted(4).
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
      return <AsYouUseScreen onContinue={advanceToNext} />;
    }
    if (index === 4) {
      return <GetStartedScreen onComplete={handleAcceptDisclaimer} careMode={careMode} />;
    }
    return null;
  };

  // Phase 16.3 — footer-hide indices reshifted after WhoIsThisFor cut.
  // Hide footer on screen 3 (AsYouUse — own Got it button) and screen
  // 4 (GetStarted — its own two-card layout owns the next action).
  // Onboarding redesign C1 — hide on screen 0 (Welcome — own Begin CTA).
  // Onboarding redesign C2 — hide on screen 1 (Privacy — own Continue CTA).
  // Onboarding redesign C3 — hide on screen 2 (Name — own Continue CTA).
  const showFooter =
    currentIndex !== 0 &&
    currentIndex !== 1 &&
    currentIndex !== 2 &&
    currentIndex !== 3 &&
    currentIndex !== 4;
  // Privacy is now index 1; the Next button stays disabled until the
  // disclaimer toggle is accepted.
  const isNextDisabled = currentIndex === 1 && !disclaimerAccepted;

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
