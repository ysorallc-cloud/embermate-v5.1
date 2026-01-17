import React, { useRef, useState } from 'react';
import { View, StyleSheet, FlatList, Dimensions, Pressable, Text } from 'react-native';
import Animated, { useSharedValue, useAnimatedScrollHandler } from 'react-native-reanimated';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { WelcomeScreen } from './screens/WelcomeScreen';
import { TrackHealthScreen } from './screens/TrackHealthScreen';
import { UnderstandPatternsScreen } from './screens/UnderstandPatternsScreen';
import { CareCircleScreen } from './screens/CareCircleScreen';
import { CoffeeMomentScreen } from './screens/CoffeeMomentScreen';
import { PaginationDots } from './components/PaginationDots';
import { seedSampleData } from '../../utils/sampleData';
import { Colors, Typography, Spacing, BorderRadius } from '../_theme/theme-tokens';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const AnimatedFlatList = Animated.createAnimatedComponent(FlatList);

const ONBOARDING_SCREENS = [
  { id: '1', component: WelcomeScreen },
  { id: '2', component: TrackHealthScreen },
  { id: '3', component: UnderstandPatternsScreen },
  { id: '4', component: CareCircleScreen },
  { id: '5', component: CoffeeMomentScreen },
];

export default function OnboardingFlow() {
  const flatListRef = useRef<FlatList>(null);
  const scrollX = useSharedValue(0);
  const [currentIndex, setCurrentIndex] = useState(0);

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

  const handleSkip = async () => {
    await completeOnboarding();
  };

  const handleAcceptDisclaimer = async (seedData: boolean) => {
    await completeOnboarding(seedData);
  };

  const completeOnboarding = async (seedData: boolean = false) => {
    try {
      await AsyncStorage.setItem('onboarding_completed', 'true');
      await AsyncStorage.setItem('disclaimer_accepted', 'true');

      // Seed sample data if requested
      if (seedData) {
        await seedSampleData({ daysOfData: 7 });
      }

      // Navigate to main app
      router.replace('/(tabs)/today');
    } catch (error) {
      console.error('Error saving onboarding state:', error);
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

  const renderItem = ({ item, index }: any) => {
    const ScreenComponent = item.component;

    if (index === ONBOARDING_SCREENS.length - 1) {
      // Last screen with disclaimer
      return <CoffeeMomentScreen onAccept={handleAcceptDisclaimer} />;
    }

    return <ScreenComponent />;
  };

  const isLastScreen = currentIndex === ONBOARDING_SCREENS.length - 1;

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
      {!isLastScreen && (
        <View style={styles.footer}>
          <Pressable onPress={handleSkip} style={styles.skipButton}>
            <Text style={styles.skipText}>Skip</Text>
          </Pressable>

          <PaginationDots
            count={ONBOARDING_SCREENS.length}
            scrollX={scrollX}
            width={SCREEN_WIDTH}
          />

          <Pressable onPress={handleNext} style={styles.nextButton}>
            <Text style={styles.nextText}>Next</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.xxl,
    paddingBottom: Spacing.xxl,
    paddingTop: Spacing.lg,
    backgroundColor: 'rgba(10, 10, 15, 0.6)',
  },
  skipButton: {
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    minWidth: 80,
  },
  skipText: {
    ...Typography.body,
    color: Colors.textSecondary,
  },
  nextButton: {
    backgroundColor: Colors.accent,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    borderRadius: BorderRadius.lg,
    minWidth: 80,
    alignItems: 'center',
  },
  nextText: {
    ...Typography.label,
    color: Colors.textPrimary,
  },
});
