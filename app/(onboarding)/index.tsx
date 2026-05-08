// ============================================================================
// ONBOARDING FLOW — 5-Screen Experience (v6.7)
// Welcome → Who Is This For → Privacy → Meet (sample) → Get Started
// ============================================================================

import React, { useRef, useState, useMemo } from 'react';
import { View, StyleSheet, FlatList, Dimensions, Pressable, Text } from 'react-native';
import Animated, { useSharedValue, useAnimatedScrollHandler } from 'react-native-reanimated';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { safeSetItem } from '../../utils/safeStorage';

import { WelcomeScreen } from './screens/WelcomeScreen';
import { WhoIsThisForScreen } from './screens/WhoIsThisForScreen';
import { PrivacyDisclaimerScreen } from './screens/PrivacyDisclaimerScreen';
import { MeetSampleScreen } from './screens/MeetSampleScreen';
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

// 6-screen flow: Welcome → Who Is This For → Privacy → Meet → As You Use → Get Started
//
// v6.7 limitation: the "What to watch for" screen
// (app/(onboarding)/screens/WatchForScreen.tsx) is reachable from
// Settings → "What to watch for" but NOT from this flow. The flow doesn't
// capture the patient's diagnoses yet, so there's nothing for the screen
// to render here. Inserting it cleanly requires a conditions-capture step
// (free-text + library-aware picker) that warrants its own UX pass; that
// design lands with v7. Until then, the WatchForScreen contract is ready
// to slot in once a Diagnosis[] is captured on this side of onboarding.
const ONBOARDING_SCREENS = [
  { id: '1', title: 'Welcome' },
  { id: '2', title: 'Who Is This For' },
  { id: '3', title: 'Privacy' },
  { id: '4', title: 'Meet' },
  { id: '5', title: 'As You Use' },
  { id: '6', title: 'Get Started' },
];

export default function OnboardingFlow() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const flatListRef = useRef<FlatList>(null);
  const scrollX = useSharedValue(0);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [disclaimerAccepted, setDisclaimerAccepted] = useState(false);
  const [careMode, setCareMode] = useState<'caregiver' | 'self'>('caregiver');

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

  const handleSelectCareMode = async (mode: 'caregiver' | 'self') => {
    setCareMode(mode);
    await safeSetItem(StorageKeys.CARE_MODE, mode);
    // Auto-advance to next screen
    flatListRef.current?.scrollToIndex({
      index: 2,
      animated: true,
    });
  };

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

  const renderItem = ({ item, index }: any) => {
    if (index === 0) {
      return <WelcomeScreen />;
    }
    if (index === 1) {
      return <WhoIsThisForScreen onSelectMode={handleSelectCareMode} />;
    }
    if (index === 2) {
      return <PrivacyDisclaimerScreen onDisclaimerAccepted={setDisclaimerAccepted} />;
    }
    if (index === 3) {
      return <MeetSampleScreen careMode={careMode} />;
    }
    if (index === 4) {
      return <AsYouUseScreen onContinue={advanceToNext} />;
    }
    if (index === 5) {
      return <GetStartedScreen onComplete={handleAcceptDisclaimer} careMode={careMode} />;
    }
    return null;
  };

  // Hide footer on screen 1 (WhoIsThisFor — card tap advances), screen 4
  // (AsYouUse — own Got it button), and screen 5 (GetStarted — its own
  // two-card layout owns the next action).
  const showFooter = currentIndex !== 1 && currentIndex !== 4 && currentIndex !== 5;
  const isNextDisabled = currentIndex === 2 && !disclaimerAccepted;

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
