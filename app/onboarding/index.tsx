// ============================================================================
// ONBOARDING SCREEN (P1.1)
// 3-screen onboarding flow with sample data option
// ============================================================================

import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
  ScrollView,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors, Spacing, BorderRadius } from '../_theme/theme-tokens';
import { completeOnboarding, seedSampleData, clearDemoData } from '../../utils/sampleData';

interface OnboardingSlide {
  icon: string;
  title: string;
  subtitle: string;
  description: string;
}

const slides: OnboardingSlide[] = [
  {
    icon: '📋',
    title: 'Care in one place',
    subtitle: 'Medications, appointments, and briefs',
    description: 'Track medications, upcoming appointments, and generate care briefs for doctors — all organized and easy to share.',
  },
  {
    icon: '☕',
    title: 'Coffee Moment',
    subtitle: '30 seconds to reset',
    description: 'Caregiving is hard. Take a mindful pause whenever you need to breathe, reflect, and return refreshed.',
  },
  {
    icon: '🔒',
    title: 'Privacy first',
    subtitle: 'Your data stays yours',
    description: 'All information is stored locally on your device. EmberMate uses AI to help generate insights, but never shares your personal health data.',
  },
];

export default function OnboardingScreen() {
  const router = useRouter();
  const dimensions = useWindowDimensions();
  const [currentIndex, setCurrentIndex] = useState(0);
  const scrollX = useRef(new Animated.Value(0)).current;
  const scrollViewRef = useRef<ScrollView>(null);
  const [isLoading, setIsLoading] = useState(false);
  const isWeb = Platform.OS === 'web';

  const handleNext = () => {
    if (currentIndex < slides.length - 1) {
      const nextIndex = currentIndex + 1;
      if (!isWeb) {
        scrollViewRef.current?.scrollTo({ x: nextIndex * dimensions.width, animated: true });
      }
      setCurrentIndex(nextIndex);
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      const prevIndex = currentIndex - 1;
      setCurrentIndex(prevIndex);
    }
  };

  const handleScroll = Animated.event(
    [{ nativeEvent: { contentOffset: { x: scrollX } } }],
    { useNativeDriver: false }
  );

  const handleMomentumScrollEnd = (event: any) => {
    const index = Math.round(event.nativeEvent.contentOffset.x / dimensions.width);
    setCurrentIndex(index);
  };

  const handleStartWithSample = async () => {
    console.log('🎯 Start with sample data clicked');
    setIsLoading(true);
    try {
      console.log('📝 Seeding sample data...');
      await seedSampleData();
      console.log('✅ Sample data seeded');
      console.log('🔒 Completing onboarding...');
      await completeOnboarding();
      console.log('✅ Onboarding completed');
      console.log('🚀 Navigating to today page...');
      router.replace('/(tabs)/today');
      console.log('✅ Navigation called');
    } catch (error) {
      console.error('❌ Error seeding sample data:', error);
      setIsLoading(false);
    }
  };

  const handleStartEmpty = async () => {
    console.log('🎯 Start empty clicked');
    setIsLoading(true);
    try {
      console.log('🧹 Clearing any existing sample data...');
      await clearDemoData();
      console.log('✅ Sample data cleared');

      console.log('🚫 Setting decline flag for sample data...');
      await AsyncStorage.setItem('@embermate_user_declined_sample_data', 'true');
      console.log('✅ Decline flag set');

      console.log('🔒 Completing onboarding...');
      await completeOnboarding();
      console.log('✅ Onboarding completed');
      console.log('🚀 Navigating to today page...');
      router.replace('/(tabs)/today');
      console.log('✅ Navigation called');
    } catch (error) {
      console.error('❌ Error completing onboarding:', error);
      setIsLoading(false);
    }
  };

  const isLastSlide = currentIndex === slides.length - 1;

  // Web version: Vertical stepped layout
  if (isWeb) {
    const currentSlide = slides[currentIndex];
    const maxWidth = Math.min(dimensions.width - 48, 600);

    return (
      <View style={styles.container}>
        <LinearGradient
          colors={[Colors.backgroundGradientStart, Colors.backgroundGradientEnd]}
          style={styles.gradient}
        >
          <ScrollView
            contentContainerStyle={[styles.webScrollContent, { maxWidth, alignSelf: 'center' }]}
            showsVerticalScrollIndicator={false}
          >
            {/* Header */}
            <View style={styles.webHeader}>
              <Text style={styles.webAppName}>EmberMate</Text>
            </View>

            {/* Current slide content */}
            <View style={styles.webSlideContent}>
              <View style={styles.iconContainer}>
                <Text style={styles.icon}>{currentSlide.icon}</Text>
              </View>
              <Text style={styles.title}>{currentSlide.title}</Text>
              <Text style={styles.subtitle}>{currentSlide.subtitle}</Text>
              <Text style={styles.description}>{currentSlide.description}</Text>
            </View>

            {/* Pagination dots */}
            <View style={styles.pagination}>
              {slides.map((_, index) => (
                <View
                  key={index}
                  style={[
                    styles.dot,
                    {
                      opacity: index === currentIndex ? 1 : 0.3,
                      transform: [{ scale: index === currentIndex ? 1.3 : 1 }],
                    },
                  ]}
                />
              ))}
            </View>

            {/* Navigation buttons */}
            <View style={styles.webActions}>
              {isLastSlide ? (
                <>
                  <TouchableOpacity
                    style={[styles.primaryButton, isLoading && styles.buttonDisabled, { marginBottom: Spacing.md }]}
                    onPress={handleStartWithSample}
                    disabled={isLoading}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.primaryButtonText}>
                      {isLoading ? 'Setting up...' : 'Start with sample data'}
                    </Text>
                    <Text style={styles.recommendedBadge}>Recommended</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.secondaryButton, isLoading && styles.buttonDisabled]}
                    onPress={handleStartEmpty}
                    disabled={isLoading}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.secondaryButtonText}>Start empty</Text>
                  </TouchableOpacity>

                  {currentIndex > 0 && (
                    <TouchableOpacity
                      style={styles.webBackButton}
                      onPress={handlePrevious}
                    >
                      <Text style={styles.webBackText}>← Back</Text>
                    </TouchableOpacity>
                  )}
                </>
              ) : (
                <View style={styles.webNavButtons}>
                  {currentIndex > 0 && (
                    <TouchableOpacity
                      style={[styles.nextButton, styles.webBackButtonNav, { marginRight: Spacing.md }]}
                      onPress={handlePrevious}
                      activeOpacity={0.8}
                    >
                      <Ionicons name="chevron-back" size={20} color={Colors.textPrimary} />
                      <Text style={styles.nextButtonText}>Back</Text>
                    </TouchableOpacity>
                  )}

                  <TouchableOpacity
                    style={[styles.nextButton, { flex: currentIndex > 0 ? 1 : undefined }]}
                    onPress={handleNext}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.nextButtonText}>Next</Text>
                    <Ionicons name="chevron-forward" size={20} color={Colors.textPrimary} />
                  </TouchableOpacity>

                  {currentIndex === 0 && (
                    <TouchableOpacity
                      style={styles.webSkipButton}
                      onPress={() => setCurrentIndex(slides.length - 1)}
                    >
                      <Text style={styles.skipText}>Skip to finish</Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}
            </View>
          </ScrollView>
        </LinearGradient>
      </View>
    );
  }

  // Mobile version: Horizontal swipe carousel
  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <LinearGradient
        colors={[Colors.backgroundGradientStart, Colors.backgroundGradientEnd]}
        style={styles.gradient}
      >
        {/* Skip button */}
        {!isLastSlide && (
          <TouchableOpacity
            style={styles.skipButton}
            onPress={() => {
              scrollViewRef.current?.scrollTo({ x: (slides.length - 1) * dimensions.width, animated: true });
              setCurrentIndex(slides.length - 1);
            }}
          >
            <Text style={styles.skipText}>Skip</Text>
          </TouchableOpacity>
        )}

        {/* Slides */}
        <ScrollView
          ref={scrollViewRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onScroll={handleScroll}
          onMomentumScrollEnd={handleMomentumScrollEnd}
          scrollEventThrottle={16}
          style={styles.scrollView}
        >
          {slides.map((slide, index) => (
            <View key={index} style={[styles.slide, { width: dimensions.width }]}>
              <View style={styles.iconContainer}>
                <Text style={styles.icon}>{slide.icon}</Text>
              </View>
              <Text style={styles.title}>{slide.title}</Text>
              <Text style={styles.subtitle}>{slide.subtitle}</Text>
              <Text style={styles.description}>{slide.description}</Text>
            </View>
          ))}
        </ScrollView>

        {/* Pagination dots */}
        <View style={styles.pagination}>
          {slides.map((_, index) => {
            const inputRange = [
              (index - 1) * dimensions.width,
              index * dimensions.width,
              (index + 1) * dimensions.width,
            ];
            const dotOpacity = scrollX.interpolate({
              inputRange,
              outputRange: [0.3, 1, 0.3],
              extrapolate: 'clamp',
            });
            const dotScale = scrollX.interpolate({
              inputRange,
              outputRange: [1, 1.3, 1],
              extrapolate: 'clamp',
            });

            return (
              <Animated.View
                key={index}
                style={[
                  styles.dot,
                  {
                    opacity: dotOpacity,
                    transform: [{ scale: dotScale }],
                  },
                ]}
              />
            );
          })}
        </View>

        {/* Bottom actions */}
        <View style={styles.bottomActions}>
          {isLastSlide ? (
            <>
              <TouchableOpacity
                style={[styles.primaryButton, isLoading && styles.buttonDisabled]}
                onPress={handleStartWithSample}
                disabled={isLoading}
                activeOpacity={0.8}
              >
                <Text style={styles.primaryButtonText}>
                  {isLoading ? 'Setting up...' : 'Start with sample data'}
                </Text>
                <Text style={styles.recommendedBadge}>Recommended</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.secondaryButton, isLoading && styles.buttonDisabled]}
                onPress={handleStartEmpty}
                disabled={isLoading}
                activeOpacity={0.8}
              >
                <Text style={styles.secondaryButtonText}>Start empty</Text>
              </TouchableOpacity>
            </>
          ) : (
            <TouchableOpacity
              style={styles.nextButton}
              onPress={handleNext}
              activeOpacity={0.8}
            >
              <Text style={styles.nextButtonText}>Next</Text>
              <Ionicons name="chevron-forward" size={20} color={Colors.textPrimary} />
            </TouchableOpacity>
          )}
        </View>
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  gradient: {
    flex: 1,
  },
  skipButton: {
    position: 'absolute',
    top: Platform.OS === 'android' ? 20 : 10,
    right: Spacing.xl,
    zIndex: 10,
    padding: Spacing.sm,
  },
  skipText: {
    fontSize: 15,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  scrollView: {
    flex: 1,
  },
  slide: {
    paddingHorizontal: Spacing.xl * 1.5,
    paddingTop: Platform.OS === 'web' ? 120 : 80,
    alignItems: 'center',
  },
  // Web-specific styles
  webScrollContent: {
    flexGrow: 1,
    width: '100%',
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.xxl,
    justifyContent: 'center',
    minHeight: '100%',
  },
  webHeader: {
    alignItems: 'center',
    marginBottom: Spacing.xxxl,
  },
  webLogo: {
    fontSize: 64,
    marginBottom: Spacing.md,
  },
  webAppName: {
    fontSize: Platform.OS === 'web' ? 40 : 32,
    fontWeight: '700',
    color: Colors.textPrimary,
    letterSpacing: -0.5,
  },
  webSlideContent: {
    alignItems: 'center',
    marginBottom: Spacing.xxxl,
  },
  webActions: {
    width: '100%',
  },
  webNavButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  webBackButtonNav: {
    flex: 1,
  },
  webBackButton: {
    alignItems: 'center',
    paddingVertical: Spacing.md,
    marginTop: Spacing.sm,
  },
  webBackText: {
    fontSize: 15,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  webSkipButton: {
    alignSelf: 'center',
    paddingVertical: Spacing.md,
    marginTop: Spacing.md,
  },
  iconContainer: {
    width: Platform.OS === 'web' ? 160 : 120,
    height: Platform.OS === 'web' ? 160 : 120,
    borderRadius: Platform.OS === 'web' ? 80 : 60,
    backgroundColor: Colors.accentLight,
    borderWidth: 1,
    borderColor: Colors.accentBorder,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Platform.OS === 'web' ? Spacing.xxxl * 1.5 : Spacing.xxxl,
  },
  icon: {
    fontSize: Platform.OS === 'web' ? 80 : 56,
  },
  title: {
    fontSize: Platform.OS === 'web' ? 36 : 28,
    fontWeight: '300',
    color: Colors.textPrimary,
    textAlign: 'center',
    marginBottom: Platform.OS === 'web' ? Spacing.md : Spacing.sm,
  },
  subtitle: {
    fontSize: Platform.OS === 'web' ? 20 : 16,
    color: Colors.accent,
    textAlign: 'center',
    marginBottom: Platform.OS === 'web' ? Spacing.xxl : Spacing.xl,
    fontWeight: '500',
  },
  description: {
    fontSize: Platform.OS === 'web' ? 18 : 16,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: Platform.OS === 'web' ? 28 : 24,
    paddingHorizontal: Spacing.md,
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: Spacing.xl,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.accent,
    marginHorizontal: 6,
  },
  bottomActions: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.xxl,
  },
  nextButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surface,
    borderWidth: 1.5,
    borderColor: Colors.borderMedium,
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.lg,
    gap: Spacing.sm,
  },
  nextButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  primaryButton: {
    backgroundColor: Colors.accentLight,
    borderWidth: 1,
    borderColor: Colors.accentBorder,
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.lg,
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  recommendedBadge: {
    fontSize: 11,
    color: Colors.accent,
    marginTop: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  secondaryButton: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.lg,
    alignItems: 'center',
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.textSecondary,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
});
