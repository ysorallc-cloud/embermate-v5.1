// ============================================================================
// CHECK-IN CELEBRATION SCREEN
// Celebration overlay after completing a check-in
// Shows streak count if >= 3 days and links to Hub for patterns
// ============================================================================

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Colors, Spacing, BorderRadius } from '../app/_theme/theme-tokens';
import { GlassCard } from './aurora/GlassCard';
import { getStreaks } from '../utils/streakStorage';
import { hapticSuccess } from '../utils/hapticFeedback';

interface Props {
  type: 'quick' | 'daily';
  onDismiss: () => void;
}

export const CheckinCelebration: React.FC<Props> = ({ type, onDismiss }) => {
  const router = useRouter();
  const [streakCount, setStreakCount] = useState(0);
  const [fadeAnim] = useState(new Animated.Value(0));
  const [scaleAnim] = useState(new Animated.Value(0.8));

  useEffect(() => {
    loadStreak();
    hapticSuccess();

    // Animate in
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const loadStreak = async () => {
    try {
      const streaks = await getStreaks();
      // Use wellness streak for both check-in types
      const count = streaks.wellnessCheck?.current || 0;
      setStreakCount(count);
    } catch (error) {
      console.error('Error loading streak:', error);
    }
  };

  const handleViewPatterns = () => {
    onDismiss();
    // Navigate to Hub tab (brief.tsx)
    router.replace('/(tabs)/brief');
  };

  const handleDone = () => {
    onDismiss();
  };

  const getMessage = () => {
    if (type === 'quick') {
      return 'Morning check-in complete';
    }
    return 'Daily check-in complete';
  };

  const getEncouragement = () => {
    if (streakCount >= 30) return "Incredible dedication! You're a caregiving champion.";
    if (streakCount >= 14) return "Two weeks strong! Your consistency is inspiring.";
    if (streakCount >= 7) return "A full week! You're building great habits.";
    if (streakCount >= 3) return "You're on a roll! Keep it up.";
    return "Great job! Every check-in helps.";
  };

  return (
    <View style={styles.overlay}>
      <Animated.View
        style={[
          styles.container,
          {
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        <GlassCard style={styles.card}>
          {/* Celebration Icon */}
          <View style={styles.iconContainer}>
            <Text style={styles.icon}>✨</Text>
          </View>

          {/* Title */}
          <Text style={styles.title}>Great!</Text>

          {/* Message */}
          <Text style={styles.message}>{getMessage()}</Text>

          {/* Streak Badge (if >= 3 days) */}
          {streakCount >= 3 && (
            <View style={styles.streakContainer}>
              <View style={styles.streakBadge}>
                <Text style={styles.streakEmoji}>
                  {streakCount >= 30 ? '🏆' : streakCount >= 14 ? '🔥' : streakCount >= 7 ? '⭐' : '✨'}
                </Text>
                <Text style={styles.streakCount}>{streakCount}</Text>
                <Text style={styles.streakLabel}>day streak</Text>
              </View>
              <Text style={styles.encouragement}>{getEncouragement()}</Text>
            </View>
          )}

          {/* Actions */}
          <View style={styles.actions}>
            {streakCount >= 3 && (
              <TouchableOpacity
                style={styles.patternsButton}
                onPress={handleViewPatterns}
                activeOpacity={0.7}
              >
                <Text style={styles.patternsButtonText}>View patterns in Hub →</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={styles.doneButton}
              onPress={handleDone}
              activeOpacity={0.7}
            >
              <Text style={styles.doneButtonText}>Done</Text>
            </TouchableOpacity>
          </View>
        </GlassCard>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
    zIndex: 1000,
  },
  container: {
    width: '100%',
    maxWidth: 340,
  },
  card: {
    alignItems: 'center',
    padding: Spacing.xxl,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.lg,
  },
  icon: {
    fontSize: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
  },
  message: {
    fontSize: 16,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: Spacing.lg,
  },
  streakContainer: {
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  streakBadge: {
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderWidth: 2,
    borderColor: Colors.success,
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    marginBottom: Spacing.sm,
  },
  streakEmoji: {
    fontSize: 24,
    marginBottom: 4,
  },
  streakCount: {
    fontSize: 32,
    fontWeight: '700',
    color: Colors.success,
  },
  streakLabel: {
    fontSize: 11,
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    fontWeight: '600',
  },
  encouragement: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  actions: {
    width: '100%',
    gap: Spacing.sm,
  },
  patternsButton: {
    paddingVertical: Spacing.md,
    alignItems: 'center',
  },
  patternsButtonText: {
    fontSize: 15,
    color: Colors.accent,
    fontWeight: '500',
  },
  doneButton: {
    backgroundColor: Colors.success,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
  },
  doneButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});

export default CheckinCelebration;
