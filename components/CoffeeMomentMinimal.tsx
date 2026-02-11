// ============================================================================
// COFFEE MOMENT - Minimal Implementation
// "This wasn't for the app. This was for you."
//
// Core principle: Friction-based, peripheral, zero-commitment
// - No tracking, no streaks, no "how did that feel?"
// - Silent return after completion
// - Tap anywhere to exit early
// ============================================================================

import React, { useState, useEffect, useRef } from 'react';
import {
  Modal,
  View,
  Text,
  Pressable,
  StyleSheet,
  Animated,
  Easing,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

interface CoffeeMomentMinimalProps {
  visible: boolean;
  onClose: () => void;
  microcopy?: string; // "Pause for a minute" | "Take a breath" | "No action needed"
  duration?: number; // Default: 60 seconds
}

export const CoffeeMomentMinimal: React.FC<CoffeeMomentMinimalProps> = ({
  visible,
  onClose,
  microcopy = 'Pause for a minute',
  duration = 60,
}) => {
  const [secondsLeft, setSecondsLeft] = useState(duration);
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const opacityAnim = useRef(new Animated.Value(0.9)).current;

  // Reset timer when modal opens
  useEffect(() => {
    if (visible) {
      setSecondsLeft(duration);
    }
  }, [visible, duration]);

  // Countdown timer
  useEffect(() => {
    if (!visible) return;

    const timer = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          // Silent exit - no celebration, no tracking
          onClose();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [visible, onClose]);

  // Gentle breathing animation on coffee icon
  useEffect(() => {
    if (!visible) {
      scaleAnim.setValue(1);
      opacityAnim.setValue(0.9);
      return;
    }

    const breatheAnimation = Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(scaleAnim, {
            toValue: 1.1,
            duration: 4000,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(opacityAnim, {
            toValue: 1,
            duration: 4000,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ]),
        Animated.parallel([
          Animated.timing(scaleAnim, {
            toValue: 1,
            duration: 4000,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(opacityAnim, {
            toValue: 0.9,
            duration: 4000,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ]),
      ])
    );

    breatheAnimation.start();

    return () => breatheAnimation.stop();
  }, [visible, scaleAnim, opacityAnim]);

  // Format time as M:SS
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Exit handler - silent, no tracking, no follow-up
  const handleExit = () => {
    // Just go back. No logging whatsoever.
    // That silence communicates: "This wasn't for the app. This was for you."
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleExit}
    >
      <Pressable
        style={styles.container}
        onPress={handleExit}
        accessibilityLabel="Dismiss coffee moment"
        accessibilityRole="button"
      >
        <LinearGradient
          colors={['#1a0f0a', '#0a0a0f']}
          style={styles.gradient}
        >
          {/* Coffee icon with breathing animation */}
          <Animated.View
            style={[
              styles.iconContainer,
              {
                transform: [{ scale: scaleAnim }],
                opacity: opacityAnim,
              },
            ]}
          >
            <Text style={styles.icon}>☕</Text>
          </Animated.View>

          {/* Microcopy - permission, not invitation */}
          <Text style={styles.microcopy}>{microcopy}</Text>

          {/* Subtle timer at bottom */}
          <Text style={styles.timer}>{formatTime(secondsLeft)}</Text>
        </LinearGradient>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  iconContainer: {
    marginBottom: 32,
  },
  icon: {
    fontSize: 64,
  },
  microcopy: {
    fontSize: 18,
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'center',
    lineHeight: 28,
  },
  timer: {
    position: 'absolute',
    bottom: 100,
    fontSize: 14,
    color: 'rgba(255,255,255,0.4)',
  },
});

export default CoffeeMomentMinimal;
