import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Dimensions, Image } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  Easing,
  cancelAnimation,
} from 'react-native-reanimated';
import { AuroraBackground } from '../components/AuroraBackground';
import { Colors, Typography, Spacing } from '../../../theme/theme-tokens';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export const WelcomeScreen: React.FC = () => {
  // Animated logo scale and glow
  const scale = useSharedValue(1);
  const glowOpacity = useSharedValue(0.3);

  useEffect(() => {
    // Subtle breathing animation
    scale.value = withRepeat(
      withSequence(
        withTiming(1.05, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 2000, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      false
    );

    // Pulsing glow
    glowOpacity.value = withRepeat(
      withSequence(
        withTiming(0.6, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.3, { duration: 2000, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      false
    );

    return () => {
      cancelAnimation(scale);
      cancelAnimation(glowOpacity);
    };
  }, []);

  const logoAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const glowAnimatedStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
  }));

  return (
    <View style={styles.container}>
      <AuroraBackground variant="welcome" />

      <View style={styles.content}>
        {/* Animated logo with glow */}
        <View style={styles.logoContainer}>
          <Animated.View style={[styles.glow, glowAnimatedStyle]} />
          <Animated.View style={[styles.logo, logoAnimatedStyle]}>
            {/* Replace this with your icon - ensure embermate-icon.png is in /assets/images/ */}
            <Image
              source={require('../../../assets/images/embermate-icon.png')}
              style={styles.logoImage}
              resizeMode="contain"
            />
          </Animated.View>
        </View>

        {/* Title and subtitle */}
        <View style={styles.textContainer}>
          <Text style={styles.title}>Welcome to EmberMate</Text>
          <Text style={styles.tagline}>
            EmberMate isn't about doing more, it's about helping you stay steady while you care for someone else
          </Text>
          <Text style={styles.subtitle}>
             Caring for those who matter most
          </Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: SCREEN_WIDTH,
    backgroundColor: Colors.background,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.xxl,
  },
  logoContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xxxl * 2,
  },
  glow: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(20, 120, 100, 0.4)',
    shadowColor: 'rgba(20, 120, 100, 1)',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 40,
  },
  logo: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: Colors.glassActive,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.glassStrong,
    overflow: 'hidden',
  },
  logoImage: {
    width: 100,
    height: 100,
  },
  textContainer: {
    alignItems: 'center',
  },
  title: {
    ...Typography.h1,
    color: Colors.textPrimary,
    textAlign: 'center',
    marginBottom: Spacing.md,
  },
  tagline: {
    ...Typography.bodySmall,
    color: Colors.textTertiary,
    textAlign: 'center',
    lineHeight: 20,
    fontStyle: 'italic',
    opacity: 0.8,
    marginBottom: Spacing.xl,
    paddingHorizontal: Spacing.md,
  },
  subtitle: {
    ...Typography.body,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
  },
});

export default WelcomeScreen;
