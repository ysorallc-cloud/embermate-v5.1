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
import { completeOnboarding, seedSampleData } from '../../utils/sampleData';

interface OnboardingSlide {
  icon: string;
  title: string;
  subtitle: string;
  description: string;
}

const slides: OnboardingSlide[] = [
  {
    icon: '🫂',
    title: 'Caregiving is a lot.',
    subtitle: 'Medications to track. Appointments to remember. Patterns to notice.',
    description: 'It\'s easy to feel overwhelmed. You\'re not alone in this.',
  },
  {
    icon: '🌱',
    title: 'Care made simple.\nTogether.',
    subtitle: 'Track what matters, spot patterns early, and keep your care circle in sync.',
    description: 'EmberMate brings calm to the chaos.',
  },
  {
    icon: '☕',
    title: 'Start each day\ngrounded.',
    subtitle: 'A quick check-in with your morning coffee.',
    description: 'Not another chore — a moment of calm before the day begins. Takes about 2 minutes.',
  },
];

export default function OnboardingScreen() {
  const router = useRouter();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const { width } = useWindowDimensions();
  const scrollX = useRef(new Animated.Value(0)).current;
  const slidesRef = useRef<ScrollView>(null);

  const isWeb = Platform.OS === 'web';
  const screenWidth = Dimensions.get('window').width;

  const handleNext = () => {
    if (currentIndex < slides.length - 1) {
      const nextIndex = currentIndex + 1;
      setCurrentIndex(nextIndex);
      slidesRef.current?.scrollTo({
        x: nextIndex * screenWidth,
        animated: true,
      });
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      const prevIndex = currentIndex - 1;
      setCurrentIndex(prevIndex);
      slidesRef.current?.scrollTo({
        x: prevIndex * screenWidth,
        animated: true,
      });
    }
  };

  const handleStartWithData = async () => {
    console.log('🎯 Start with sample data clicked');
    setIsLoading(true);
    try {
      console.log('📦 Seeding sample data...');
      await seedSampleData();
      console.log('✅ Sample data seeded');
      console.log('🔒 Completing onboarding...');
      await completeOnboarding();
      console.log('✅ Onboarding completed (with data)');
      console.log('🚀 Navigating to today page...');
      router.replace('/(tabs)/today');
      console.log('✅ Navigation called');
    } catch (error) {
      console.error('❌ Error in handleStartWithData:', error);
      setIsLoading(false);
    }
  };

  const handleStartEmpty = async () => {
    console.log('🎯 Start empty clicked');
    setIsLoading(true);
    try {
      console.log('🔒 Completing onboarding WITHOUT sample data...');
      // Mark that user explicitly chose NOT to use sample data
      await AsyncStorage.setItem('@embermate_user_declined_sample_data', 'true');
      await completeOnboarding();
      console.log('✅ Onboarding completed (empty)');
      console.log('🚀 Navigating to today page...');
      router.replace('/(tabs)/today');
      console.log('✅ Navigation called');
    } catch (error) {
      console.error('❌ Error completing onboarding:', error);
      setIsLoading(false);
    }
  };

  const handleTryCoffee = () => {
    console.log('☕ Try Coffee clicked');
    router.push('/coffee');
  };

  // Web version: One slide at a time with navigation
  if (isWeb) {
    const currentSlide = slides[currentIndex];
    const isLastSlide = currentIndex === slides.length - 1;

    return (
      <View style={styles.container}>
        <LinearGradient
          colors={[Colors.backgroundGradientStart, Colors.backgroundGradientEnd]}
          style={styles.gradient}
        >
          <View style={styles.webWrapper}>
            <View style={[styles.webContainer, { maxWidth: Math.min(width * 0.9, 480) }]}>
              {/* Logo/Title */}
              <View style={styles.webHeader}>
                <Text style={styles.webAppTitle}>EmberMate</Text>
                <Text style={styles.webAppSubtitle}>Your personal health companion</Text>
              </View>

              {/* Current slide */}
              <View style={styles.webSlide}>
                <Text style={styles.webIcon}>{currentSlide.icon}</Text>
                <Text style={styles.webTitle}>{currentSlide.title}</Text>
                <Text style={styles.webSubtitle}>{currentSlide.subtitle}</Text>
                <Text style={styles.webDescription}>{currentSlide.description}</Text>

                {/* Coffee Moment Try Button */}
                {currentSlide.icon === '☕' && (
                  <TouchableOpacity
                    style={styles.webTryCoffeeButton}
                    onPress={handleTryCoffee}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.webTryCoffeeText}>Try Coffee Moment now →</Text>
                  </TouchableOpacity>
                )}
              </View>

              {/* Pagination dots */}
              <View style={styles.webPagination}>
                {slides.map((_, index) => (
                  <View
                    key={index}
                    style={[
                      styles.webDot,
                      currentIndex === index && styles.webDotActive,
                    ]}
                  />
                ))}
              </View>

              {/* Navigation or final actions */}
              {!isLastSlide ? (
                <View style={styles.webNavigation}>
                  {currentIndex > 0 && (
                    <TouchableOpacity
                      style={styles.webNavButton}
                      onPress={handlePrevious}
                    >
                      <Text style={styles.webNavButtonText}>← Previous</Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity
                    style={[styles.webNavButton, styles.webNavButtonPrimary]}
                    onPress={handleNext}
                  >
                    <Text style={styles.webNavButtonTextPrimary}>Next →</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.webFinalActions}>
                  <Text style={styles.webFinalTitle}>Ready to begin?</Text>

                  <TouchableOpacity
                    style={[styles.webActionButton, styles.webActionButtonPrimary]}
                    onPress={handleStartWithData}
                    disabled={isLoading}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.webActionButtonTextPrimary}>
                      {isLoading ? 'Loading...' : 'Start with sample data'}
                    </Text>
                    <Text style={styles.webActionButtonSubtext}>
                      Explore features with example medications and appointments
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.webActionButton, styles.webActionButtonSecondary]}
                    onPress={handleStartEmpty}
                    disabled={isLoading}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.webActionButtonTextSecondary}>
                      {isLoading ? 'Loading...' : 'Start with my own data'}
                    </Text>
                    <Text style={styles.webActionButtonSubtext}>
                      Begin with a clean slate
                    </Text>
                  </TouchableOpacity>

                  {currentIndex > 0 && (
                    <TouchableOpacity
                      style={styles.webBackButton}
                      onPress={handlePrevious}
                    >
                      <Text style={styles.webBackButtonText}>← Back</Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}
            </View>
          </View>
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
        <View style={styles.skipContainer}>
          {currentIndex < slides.length - 1 && (
            <TouchableOpacity
              style={styles.skipButton}
              onPress={() => setCurrentIndex(slides.length - 1)}
            >
              <Text style={styles.skipText}>Skip</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Slides */}
        <ScrollView
          ref={slidesRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onScroll={Animated.event(
            [{ nativeEvent: { contentOffset: { x: scrollX } } }],
            { useNativeDriver: false }
          )}
          scrollEventThrottle={32}
          onMomentumScrollEnd={(e) => {
            const contentOffsetX = e.nativeEvent.contentOffset.x;
            const index = Math.round(contentOffsetX / screenWidth);
            setCurrentIndex(index);
          }}
          style={styles.scrollView}
        >
          {slides.map((slide, index) => (
            <View key={index} style={[styles.slide, { width: screenWidth }]}>
              <View style={styles.slideContent}>
                <Text style={styles.icon}>{slide.icon}</Text>
                <Text style={styles.title}>{slide.title}</Text>
                <Text style={styles.subtitle}>{slide.subtitle}</Text>
                <Text style={styles.description}>{slide.description}</Text>
                
                {/* Coffee Moment Try Button - Mobile */}
                {slide.icon === '☕' && (
                  <TouchableOpacity
                    style={styles.tryCoffeeButton}
                    onPress={handleTryCoffee}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.tryCoffeeText}>Try Coffee Moment now</Text>
                    <Ionicons name="arrow-forward" size={18} color={Colors.accent} />
                  </TouchableOpacity>
                )}
              </View>

              {/* Show action buttons on last slide */}
              {index === slides.length - 1 && (
                <View style={styles.actionsContainer}>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.actionButtonPrimary]}
                    onPress={handleStartWithData}
                    disabled={isLoading}
                  >
                    <Text style={styles.actionButtonText}>
                      {isLoading ? 'Loading...' : 'Start with sample data'}
                    </Text>
                    <Text style={styles.actionSubtext}>
                      Explore features with examples
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.actionButton, styles.actionButtonSecondary]}
                    onPress={handleStartEmpty}
                    disabled={isLoading}
                  >
                    <Text style={[styles.actionButtonText, styles.actionButtonTextSecondary]}>
                      {isLoading ? 'Loading...' : 'Start with my own data'}
                    </Text>
                    <Text style={[styles.actionSubtext, styles.actionSubtextSecondary]}>
                      Begin with a clean slate
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          ))}
        </ScrollView>

        {/* Pagination dots */}
        <View style={styles.pagination}>
          {slides.map((_, index) => (
            <View
              key={index}
              style={[
                styles.dot,
                index === currentIndex && styles.activeDot,
              ]}
            />
          ))}
        </View>

        {/* Navigation buttons (only on first slides, hidden on last) */}
        {currentIndex < slides.length - 1 && (
          <View style={styles.navigation}>
            {currentIndex > 0 && (
              <TouchableOpacity
                style={[styles.navButton, styles.backButton]}
                onPress={handlePrevious}
              >
                <Ionicons name="chevron-back" size={24} color={Colors.textPrimary} />
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[styles.navButton, styles.nextButton]}
              onPress={handleNext}
            >
              <Ionicons name="chevron-forward" size={24} color={Colors.textPrimary} />
            </TouchableOpacity>
          </View>
        )}
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
  
  // Mobile styles
  skipContainer: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.md,
    alignItems: 'flex-end',
    height: 50,
  },
  skipButton: {
    padding: Spacing.sm,
  },
  skipText: {
    color: Colors.textTertiary,
    fontSize: 14,
    fontWeight: '500',
  },
  scrollView: {
    flex: 1,
  },
  slide: {
    flex: 1,
    justifyContent: 'space-between',
    paddingBottom: 100,
  },
  slideContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl * 2,
  },
  icon: {
    fontSize: 80,
    marginBottom: Spacing.xl,
  },
  title: {
    fontSize: 28,
    fontWeight: '600',
    color: Colors.textPrimary,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  subtitle: {
    fontSize: 16,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: Spacing.lg,
    fontWeight: '500',
  },
  description: {
    fontSize: 15,
    lineHeight: 24,
    color: Colors.textTertiary,
    textAlign: 'center',
    paddingHorizontal: Spacing.md,
  },
  tryCoffeeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginTop: Spacing.xl,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    backgroundColor: 'rgba(232, 155, 95, 0.15)',
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: 'rgba(232, 155, 95, 0.3)',
  },
  tryCoffeeText: {
    fontSize: 15,
    color: Colors.accent,
    fontWeight: '600',
  },
  actionsContainer: {
    paddingHorizontal: Spacing.xl * 2,
    gap: Spacing.md,
  },
  actionButton: {
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.xl,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
  },
  actionButtonPrimary: {
    backgroundColor: Colors.accent,
  },
  actionButtonSecondary: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.background,
    marginBottom: 4,
  },
  actionButtonTextSecondary: {
    color: Colors.textPrimary,
  },
  actionSubtext: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.7)',
  },
  actionSubtextSecondary: {
    color: Colors.textTertiary,
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: Spacing.lg,
    gap: Spacing.sm,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.border,
  },
  activeDot: {
    width: 24,
    backgroundColor: Colors.accent,
  },
  navigation: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.xl,
  },
  navButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  backButton: {},
  nextButton: {
    marginLeft: 'auto',
  },

  // Web styles
  webScrollView: {
    flex: 1,
  },
  webScrollContent: {
    flexGrow: 1,
    alignItems: 'center',
    paddingVertical: Spacing.xl * 2,
  },
  webContainer: {
    width: '100%',
    paddingHorizontal: Spacing.xl * 2,
  },
  webHeader: {
    alignItems: 'center',
    marginBottom: Spacing.xl * 2,
  },
  webAppTitle: {
    fontSize: 36,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
  },
  webAppSubtitle: {
    fontSize: 16,
    color: Colors.textSecondary,
  },
  webSlide: {
    alignItems: 'center',
    marginBottom: Spacing.xl,
    paddingVertical: Spacing.xl * 2,
  },
  webIcon: {
    fontSize: 100,
    marginBottom: Spacing.xl,
  },
  webTitle: {
    fontSize: 32,
    fontWeight: '600',
    color: Colors.textPrimary,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  webSubtitle: {
    fontSize: 18,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: Spacing.lg,
    fontWeight: '500',
  },
  webDescription: {
    fontSize: 16,
    lineHeight: 26,
    color: Colors.textTertiary,
    textAlign: 'center',
    maxWidth: 500,
  },
  webTryCoffeeButton: {
    marginTop: Spacing.xl,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    backgroundColor: 'rgba(232, 155, 95, 0.15)',
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: 'rgba(232, 155, 95, 0.3)',
  },
  webTryCoffeeText: {
    fontSize: 16,
    color: Colors.accent,
    fontWeight: '600',
  },
  webFinalActions: {
    alignItems: 'center',
    gap: Spacing.lg,
    marginTop: Spacing.xl,
  },
  webFinalTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: Spacing.md,
  },
  webActionButton: {
    width: '100%',
    maxWidth: 400,
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.xl,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
  },
  webActionButtonPrimary: {
    backgroundColor: Colors.accent,
  },
  webActionButtonSecondary: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  webActionButtonTextPrimary: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.background,
    marginBottom: 4,
  },
  webActionButtonTextSecondary: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  webActionButtonSubtext: {
    fontSize: 14,
    color: Colors.textTertiary,
  },
  webWrapper: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.xl * 2,
  },
  webPagination: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    marginVertical: Spacing.xl,
  },
  webDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.borderMedium,
  },
  webDotActive: {
    width: 24,
    backgroundColor: Colors.accent,
  },
  webNavigation: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.md,
    width: '100%',
    maxWidth: 400,
    marginTop: Spacing.xl,
  },
  webNavButton: {
    flex: 1,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  webNavButtonPrimary: {
    backgroundColor: Colors.accent,
    borderColor: Colors.accent,
  },
  webNavButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  webNavButtonTextPrimary: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.background,
  },
  webBackButton: {
    marginTop: Spacing.lg,
    paddingVertical: Spacing.sm,
  },
  webBackButtonText: {
    fontSize: 14,
    color: Colors.textTertiary,
    fontWeight: '500',
  },
});
