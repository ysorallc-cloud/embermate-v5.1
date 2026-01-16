// ============================================================================
// COFFEE MOMENT MODAL - V3 Enhanced
// Self-care pause with AI-personalized encouragement
// ============================================================================

import React, { useState, useEffect, useRef } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  Animated,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Colors } from '../app/_theme/theme-tokens';
import { getPersonalizedEncouragement, getSampleCaregiverInsights, Encouragement } from '../utils/coffee-moment';

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

const HELPFUL_RESOURCES = [
  {
    icon: '📚',
    title: 'Understanding Caregiver Burnout',
    description: 'Recognizing the signs and taking action',
  },
  {
    icon: '💬',
    title: 'Finding Support Groups',
    description: 'Connect with others who understand',
  },
  {
    icon: '🧘',
    title: 'Quick Self-Care Practices',
    description: '5-minute exercises for busy caregivers',
  },
];

export const CoffeeMomentModal: React.FC<CoffeeMomentModalProps> = ({
  visible,
  onClose,
}) => {
  const router = useRouter();
  const [breathPhase, setBreathPhase] = useState<BreathPhase>('ready');
  const [isBreathing, setIsBreathing] = useState(false);
  const scaleAnim = useRef(new Animated.Value(1)).current;

  // V3: AI-personalized encouragement
  const [encouragement, setEncouragement] = useState<Encouragement | null>(null);

  useEffect(() => {
    if (visible && !encouragement) {
      // Get personalized message based on caregiver data
      const insights = getSampleCaregiverInsights(); // In production, fetch real data
      const message = getPersonalizedEncouragement(insights);
      setEncouragement(message);
    }
  }, [visible]);

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
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
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

            {/* V3: AI-Personalized Encouragement */}
            {encouragement && (
              <View style={styles.encouragementCard}>
                {encouragement.type !== 'default' && (
                  <View style={styles.encouragementBadge}>
                    <Text style={styles.encouragementBadgeText}>
                      {encouragement.type === 'celebration' && '🎉 Milestone'}
                      {encouragement.type === 'empathy' && '💜 We see you'}
                      {encouragement.type === 'preparation' && '📋 Coming up'}
                      {encouragement.type === 'progress' && '📈 Progress'}
                    </Text>
                  </View>
                )}
                <Text style={styles.encouragementMain}>{encouragement.main}</Text>
                <Text style={styles.encouragementSub}>{encouragement.sub}</Text>
              </View>
            )}

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

            {/* Helpful Resources */}
            <View style={styles.resourcesSection}>
              <Text style={styles.resourcesTitle}>Helpful Resources</Text>
              {HELPFUL_RESOURCES.map((resource, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.resourceCard}
                  activeOpacity={0.7}
                >
                  <Text style={styles.resourceIcon}>{resource.icon}</Text>
                  <View style={styles.resourceContent}>
                    <Text style={styles.resourceTitle}>{resource.title}</Text>
                    <Text style={styles.resourceDescription}>{resource.description}</Text>
                  </View>
                  <Text style={styles.resourceArrow}>→</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </ScrollView>
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
  },
  scrollContent: {
    padding: 24,
    minHeight: '100%',
    justifyContent: 'center',
  },
  modal: {
    backgroundColor: Colors.background,
    borderRadius: 24,
    padding: 32,
    width: '100%',
    maxWidth: 380,
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
    marginBottom: 28,
  },
  breathingContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  breathCircle: {
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: Colors.purpleLight,
    borderWidth: 4,
    borderColor: Colors.purple,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  breathText: {
    fontSize: 16,
    color: Colors.purple,
    fontWeight: '500',
  },
  breathInstructions: {
    fontSize: 13,
    color: Colors.purple,
  },
  affirmation: {
    fontSize: 13,
    color: Colors.textMuted,
    fontStyle: 'italic',
    textAlign: 'center',
    marginBottom: 24,
  },
  // V3: Encouragement Card
  encouragementCard: {
    backgroundColor: Colors.purpleLight,
    borderWidth: 1,
    borderColor: Colors.purpleBorder,
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    width: '100%',
  },
  encouragementBadge: {
    backgroundColor: Colors.purple,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginBottom: 12,
  },
  encouragementBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  encouragementMain: {
    fontSize: 18,
    fontWeight: '400',
    color: Colors.textPrimary,
    marginBottom: 8,
  },
  encouragementSub: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 21,
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
    marginBottom: 32,
  },
  secondaryButtonText: {
    color: Colors.textMuted,
    fontSize: 13,
  },
  resourcesSection: {
    width: '100%',
    borderTopWidth: 1,
    borderTopColor: Colors.purpleBorder,
    paddingTop: 24,
  },
  resourcesTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: 16,
  },
  resourceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.purpleLight,
    borderWidth: 1,
    borderColor: Colors.purpleBorder,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
  },
  resourceIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  resourceContent: {
    flex: 1,
  },
  resourceTitle: {
    fontSize: 13,
    fontWeight: '500',
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  resourceDescription: {
    fontSize: 11,
    color: Colors.textMuted,
  },
  resourceArrow: {
    fontSize: 18,
    color: Colors.purple,
    marginLeft: 8,
  },
});
