// ============================================================================
// WHO IS THIS FOR SCREEN - Care mode selection
// Screen 2 of 4: Caregiver vs self-care — card tap auto-advances
// ============================================================================

import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Dimensions, TouchableOpacity } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { AuroraBackground } from '../components/AuroraBackground';
import { Colors, Spacing, BorderRadius } from '../../../theme/theme-tokens';
import { useTheme } from '../../../contexts/ThemeContext';
import { useReduceMotion } from '../../../hooks/useReduceMotion';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface Props {
  onSelectMode: (mode: 'caregiver' | 'self') => void;
}

export const WhoIsThisForScreen: React.FC<Props> = ({ onSelectMode }) => {
  const { colors } = useTheme();
  const reduceMotion = useReduceMotion();
  const styles = useMemo(() => createStyles(colors), [colors]);
  // Phase 28 Batch B sidecar — reduce-motion guard, see WelcomeScreen. Fix
  // applied even though screen is currently orphaned from the active flow
  // (Phase 16.3 cut), so a v1.1+ re-introduction doesn't need re-instrumentation.
  const entering = (delay: number) =>
    reduceMotion ? undefined : FadeInDown.delay(delay).duration(300);
  return (
    <View style={styles.container}>
      <AuroraBackground variant="welcome" />
      <View style={styles.content}>
        <Animated.Text entering={entering(100)} style={styles.title}>
          Who are you caring for?
        </Animated.Text>
        <Animated.Text entering={entering(200)} style={styles.subtitle}>
          We'll set things up to fit your situation.
        </Animated.Text>

        <View style={styles.cardsContainer}>
          <Animated.View entering={entering(300)}>
            <TouchableOpacity
              style={styles.card}
              onPress={() => onSelectMode('caregiver')}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel="Someone I care for — a parent, partner, or loved one"
            >
              <Text style={styles.cardEmoji}>{'\u{1F468}\u200D\u{1F469}\u200D\u{1F467}'}</Text>
              <Text style={styles.cardTitle}>Someone I care for</Text>
              <Text style={styles.cardDesc}>A parent, partner, or loved one</Text>
            </TouchableOpacity>
          </Animated.View>

          <Animated.View entering={entering(400)}>
            <TouchableOpacity
              style={styles.card}
              onPress={() => onSelectMode('self')}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel="Myself — I'm tracking my own health"
            >
              <Text style={styles.cardEmoji}>{'\u{1F64B}'}</Text>
              <Text style={styles.cardTitle}>Myself</Text>
              <Text style={styles.cardDesc}>I'm tracking my own health</Text>
            </TouchableOpacity>
          </Animated.View>
        </View>

        <Animated.Text entering={entering(500)} style={styles.footer}>
          You can change this anytime in Settings.
        </Animated.Text>
      </View>
    </View>
  );
};

const createStyles = (c: typeof Colors) => StyleSheet.create({
  container: {
    flex: 1,
    width: SCREEN_WIDTH,
    backgroundColor: c.background,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingBottom: 100,
  },
  title: {
    fontSize: 26,
    fontWeight: '300',
    color: c.textPrimary,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  subtitle: {
    fontSize: 15,
    color: c.textSecondary,
    textAlign: 'center',
    marginBottom: Spacing.xl,
  },
  cardsContainer: {
    width: '100%',
    gap: 16,
  },
  card: {
    width: '100%',
    backgroundColor: c.glass,
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    alignItems: 'center',
  },
  cardEmoji: {
    fontSize: 36,
    marginBottom: Spacing.sm,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: c.textPrimary,
    marginBottom: 4,
  },
  cardDesc: {
    fontSize: 14,
    color: c.textSecondary,
  },
  footer: {
    fontSize: 13,
    color: c.textTertiary,
    textAlign: 'center',
    marginTop: Spacing.lg,
  },
});

export default WhoIsThisForScreen;
