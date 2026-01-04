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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, BorderRadius } from '../_theme/theme-tokens';
import { completeOnboarding, seedSampleData } from '../../utils/sampleData';

const { width } = Dimensions.get('window');

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
  const [currentIndex, setCurrentIndex] = useState(0);
  const scrollX = useRef(new Animated.Value(0)).current;
  const scrollViewRef = useRef<ScrollView>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleNext = () => {
    if (currentIndex < slides.length - 1) {
      const nextIndex = currentIndex + 1;
      scrollViewRef.current?.scrollTo({ x: nextIndex * width, animated: true });
      setCurrentIndex(nextIndex);
    }
  };

  const handleScroll = Animated.event(
    [{ nativeEvent: { contentOffset: { x: scrollX } } }],
    { useNativeDriver: false }
  );

  const handleMomentumScrollEnd = (event: any) => {
    const index = Math.round(event.nativeEvent.contentOffset.x / width);
    setCurrentIndex(index);
  };

  const handleStartWithSample = async () => {
    setIsLoading(true);
    try {
      await seedSampleData();
      await completeOnboarding();
      router.replace('/(tabs)/today');
    } catch (error) {
      console.error('Error seeding sample data:', error);
      setIsLoading(false);
    }
  };

  const handleStartEmpty = async () => {
    setIsLoading(true);
    try {
      await completeOnboarding();
      router.replace('/(tabs)/today');
    } catch (error) {
      console.error('Error completing onboarding:', error);
      setIsLoading(false);
    }
  };

  const isLastSlide = currentIndex === slides.length - 1;

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
              scrollViewRef.current?.scrollTo({ x: (slides.length - 1) * width, animated: true });
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
            <View key={index} style={styles.slide}>
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
              (index - 1) * width,
              index * width,
              (index + 1) * width,
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
    width,
    paddingHorizontal: Spacing.xl * 1.5,
    paddingTop: 80,
    alignItems: 'center',
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: Colors.accentLight,
    borderWidth: 1,
    borderColor: Colors.accentBorder,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xxxl,
  },
  icon: {
    fontSize: 56,
  },
  title: {
    fontSize: 28,
    fontWeight: '300',
    color: Colors.textPrimary,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  subtitle: {
    fontSize: 16,
    color: Colors.accent,
    textAlign: 'center',
    marginBottom: Spacing.xl,
    fontWeight: '500',
  },
  description: {
    fontSize: 16,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
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
