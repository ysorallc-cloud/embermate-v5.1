// ============================================================================
// COFFEE MOMENT MODAL
// Self-care pause for stressed caregivers with breathing exercise
// ============================================================================

import React, { useState, useEffect, useRef } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  Animated,
  StyleSheet,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Colors } from '../app/_theme/theme-tokens';

interface CoffeeMomentModalProps {
  visible: boolean;
  onClose: () => void;
}

type BreathPhase = 'inhale' | 'hold' | 'exhale' | 'ready';

const BREATH_CYCLE = {
  inhale: 4000,
  hold: 4000,
  exhale: 4000,
};

const AFFIRMATIONS = [
  "You can't pour from an empty cup.",
  "Rest is not a reward. It's a necessity.",
  "You're doing more than you realize.",
  "One moment at a time. That's all it takes.",
  "Your presence is a gift to those you care for.",
  "It's okay to not be okay sometimes.",
  "You matter too.",
  "Small pauses make big differences.",
];

export const CoffeeMomentModal: React.FC<CoffeeMomentModalProps> = ({
  visible,
  onClose,
}) => {
  const router = useRouter();
  const [breathPhase, setBreathPhase] = useState<BreathPhase>('ready');
  const [isBreathing, setIsBreathing] = useState(false);
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const [affirmation] = useState(
    AFFIRMATIONS[Math.floor(Math.random() * AFFIRMATIONS.length)]
  );

  // Breathing animation
  useEffect(() => {
    if (!isBreathing) return;

    const runBreathCycle = () => {
      // Inhale - expand
      setBreathPhase('inhale');
      Animated.timing(scaleAnim, {
        toValue: 1.3,
        duration: BREATH_CYCLE.inhale,
        useNativeDriver: true,
      }).start(() => {
        // Hold
        setBreathPhase('hold');
        setTimeout(() => {
          // Exhale - contract
          setBreathPhase('exhale');
          Animated.timing(scaleAnim, {
            toValue: 1,
            duration: BREATH_CYCLE.exhale,
            useNativeDriver: true,
          }).start(() => {
            if (isBreathing) runBreathCycle();
          });
        }, BREATH_CYCLE.hold);
      });
    };

    runBreathCycle();

    return () => {
      scaleAnim.setValue(1);
    };
  }, [isBreathing, scaleAnim]);

  const handleStart = () => {
    setIsBreathing(true);
  };

  const handleClose = () => {
    setIsBreathing(false);
    setBreathPhase('ready');
    scaleAnim.setValue(1);
    onClose();
  };

  const handleSetReminder = () => {
    handleClose();
    router.push('/break-reminder-settings');
  };

  const getPhaseText = () => {
    switch (breathPhase) {
      case 'inhale':
        return 'Breathe in...';
      case 'hold':
        return 'Hold...';
      case 'exhale':
        return 'Breathe out...';
      default:
        return 'Tap to begin';
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modal}>
          {/* Header */}
          <Text style={styles.icon}>☕</Text>
          <Text style={styles.title}>Take a moment</Text>
          <Text style={styles.subtitle}>
            You're doing important work.{'\n'}
            Caring for others starts with caring for yourself.
          </Text>

          {/* Breathing Exercise */}
          <View style={styles.breathingContainer}>
            <TouchableOpacity
              onPress={handleStart}
              disabled={isBreathing}
              activeOpacity={0.8}
            >
              <Animated.View
                style={[
                  styles.breathCircle,
                  { transform: [{ scale: scaleAnim }] },
                ]}
              >
                <Text style={styles.breathText}>{getPhaseText()}</Text>
              </Animated.View>
            </TouchableOpacity>

            <Text style={styles.breathInstructions}>
              Inhale 4s · Hold 4s · Exhale 4s
            </Text>
          </View>

          {/* Affirmation */}
          <Text style={styles.affirmation}>✨ "{affirmation}"</Text>

          {/* Actions */}
          <TouchableOpacity style={styles.primaryButton} onPress={handleClose}>
            <Text style={styles.primaryButtonText}>I'm ready to continue</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={handleSetReminder}
          >
            <Text style={styles.secondaryButtonText}>Set a break reminder</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modal: {
    backgroundColor: Colors.background,
    borderRadius: 24,
    padding: 32,
    width: '100%',
    maxWidth: 340,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.purpleBorder,
  },
  icon: {
    fontSize: 48,
    marginBottom: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: '300',
    color: Colors.textPrimary,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  breathingContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  breathCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: Colors.purpleLight,
    borderWidth: 3,
    borderColor: Colors.purple,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  breathText: {
    fontSize: 14,
    color: Colors.purple,
    fontWeight: '500',
  },
  breathInstructions: {
    fontSize: 12,
    color: Colors.purple,
  },
  affirmation: {
    fontSize: 13,
    color: Colors.textMuted,
    fontStyle: 'italic',
    textAlign: 'center',
    marginBottom: 24,
  },
  primaryButton: {
    backgroundColor: Colors.purple,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 24,
    width: '100%',
    alignItems: 'center',
    marginBottom: 12,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  secondaryButton: {
    paddingVertical: 8,
  },
  secondaryButtonText: {
    color: Colors.textMuted,
    fontSize: 13,
  },
});
