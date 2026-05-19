// ============================================================================
// GET STARTED SCREEN — v6.7 two-card choice (Phase 16.3 reframe).
// One job: pick the path. The primary card expands inline to capture a
// patient name + Done; the secondary card seeds sample data.
//
// Phase 16.3 — careMode prop retired (WhoIsThisForScreen was cut from
// the welcome flow). The screen now renders the caregiver-mode copy
// unconditionally, the primary EmberMate use case. Secondary card
// reframed from a demo/fallback ("Keep exploring with Dad's example. Try
// the app populated. Switch to your own anytime in Settings.") to a
// legitimate first-choice path ("Start with the populated example.
// Switch to your own anytime."). The intent: secondary reads as a
// deliberate user choice, not an escape hatch.
// ============================================================================

import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { AuroraBackground } from '../components/AuroraBackground';
import { Colors, Spacing, BorderRadius } from '../../../theme/theme-tokens';
import { useTheme } from '../../../contexts/ThemeContext';
import { useReduceMotion } from '../../../hooks/useReduceMotion';
import { writePatientName } from '../../../utils/patientNameWriter';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface Props {
  onComplete: (seedData: boolean) => void;
}

export const GetStartedScreen: React.FC<Props> = ({ onComplete }) => {
  const { colors } = useTheme();
  const reduceMotion = useReduceMotion();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [patientName, setPatientName] = useState('');
  const [expanded, setExpanded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  // Phase 28 Batch B sidecar — reduce-motion guard, see WelcomeScreen.
  const entering = (delay: number) =>
    reduceMotion ? undefined : FadeInDown.delay(delay).duration(300);

  // Phase 16.3 — careMode hardcoded; copy is unconditional caregiver-mode.
  const primaryTitle = 'Set up my loved one';
  const primarySubtitle = 'Just a name. Add meds whenever.';
  const secondaryTitle = 'Start with the populated example';
  const secondarySubtitle = 'Switch to your own anytime.';
  const inputPlaceholder = 'e.g. Mom, Dad, Linda';

  const handleSetUp = async () => {
    setLoadingMessage('Setting things up...');
    setIsLoading(true);
    try {
      // Skip fallback uses the friendly placeholder so downstream consumers
      // (now.tsx, journal.tsx, understand.tsx) read the same display string
      // they fall back to anyway. The legacy 'Patient' literal is left in
      // place only as a backwards-compat filter for installs from earlier
      // versions of the onboarding flow.
      const name = patientName.trim() || 'your loved one';
      await writePatientName('default', name);
    } catch {}
    onComplete(false);
  };

  const handleSeedSample = () => {
    setLoadingMessage('Creating sample data...');
    setIsLoading(true);
    onComplete(true);
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <AuroraBackground variant="welcome" />
        <View style={styles.loadingOverlay}>
          <Image
            source={require('../../../assets/images/embermate-icon.png')}
            style={styles.loadingIcon}
            accessibilityLabel="EmberMate"
          />
          <ActivityIndicator size="large" color={colors.accent} style={styles.loadingSpinner} />
          <Text style={styles.loadingText}>{loadingMessage}</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <AuroraBackground variant="welcome" />
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Animated.Text entering={entering(100)} style={styles.title}>
          Your turn.
        </Animated.Text>

        {/* Primary — set up the user's own profile */}
        <Animated.View entering={entering(200)}>
          <TouchableOpacity
            style={styles.primaryCard}
            activeOpacity={0.85}
            onPress={() => setExpanded((v) => !v)}
            accessibilityRole="button"
            accessibilityLabel={`${primaryTitle}. ${primarySubtitle}`}
            accessibilityState={{ expanded }}
          >
            <Text style={styles.primaryCardTitle}>{primaryTitle}</Text>
            <Text style={styles.primaryCardSubtitle}>{primarySubtitle}</Text>
          </TouchableOpacity>

          {expanded && (
            <View style={styles.expandedPanel}>
              <TextInput
                style={styles.input}
                placeholder={inputPlaceholder}
                placeholderTextColor={colors.textTertiary}
                value={patientName}
                onChangeText={setPatientName}
                autoCapitalize="words"
                autoFocus
                returnKeyType="done"
                onSubmitEditing={handleSetUp}
                accessibilityLabel="Patient name"
              />
              <TouchableOpacity
                style={styles.doneButton}
                onPress={handleSetUp}
                activeOpacity={0.85}
                accessibilityRole="button"
                accessibilityLabel="Done — set up profile"
              >
                <Text style={styles.doneButtonText}>Done</Text>
              </TouchableOpacity>
            </View>
          )}
        </Animated.View>

        {/* Secondary — explore with sample data */}
        <Animated.View entering={entering(280)}>
          <TouchableOpacity
            style={styles.secondaryCard}
            activeOpacity={0.85}
            onPress={handleSeedSample}
            accessibilityRole="button"
            accessibilityLabel={`${secondaryTitle}. ${secondarySubtitle}`}
          >
            <Text style={styles.secondaryCardTitle}>{secondaryTitle}</Text>
            <Text style={styles.secondaryCardSubtitle}>{secondarySubtitle}</Text>
          </TouchableOpacity>
        </Animated.View>

        {/* Backup tip */}
        <Animated.View entering={entering(360)}>
          <Text style={styles.backupTip}>
            Your data stays on this device. Use Settings {'›'} Backup & Restore to create encrypted backups before switching phones.
          </Text>
        </Animated.View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
};

const createStyles = (c: typeof Colors) => StyleSheet.create({
  container: {
    flex: 1,
    width: SCREEN_WIDTH,
    backgroundColor: c.background,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: Spacing.lg,
    paddingTop: 60,
    paddingBottom: 40,
  },
  title: {
    fontSize: 26,
    fontWeight: '300',
    color: c.textPrimary,
    textAlign: 'center',
    marginBottom: Spacing.lg,
  },
  // ── Primary card (mint accent) ────────────────────────────────────────────
  primaryCard: {
    width: '100%',
    backgroundColor: c.accent,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  primaryCardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: c.textPrimary,
    marginBottom: 4,
  },
  primaryCardSubtitle: {
    fontSize: 13,
    color: c.textPrimary,
    opacity: 0.85,
    textAlign: 'center',
  },
  expandedPanel: {
    width: '100%',
    marginBottom: Spacing.sm,
    gap: Spacing.xs,
  },
  input: {
    backgroundColor: c.glass,
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    fontSize: 16,
    color: c.textPrimary,
    textAlign: 'center',
  },
  doneButton: {
    backgroundColor: c.accent,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.sm,
    alignItems: 'center',
  },
  doneButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: c.textPrimary,
  },
  // ── Secondary card (glass) ────────────────────────────────────────────────
  secondaryCard: {
    width: '100%',
    backgroundColor: c.glass,
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  secondaryCardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: c.textPrimary,
    marginBottom: 4,
  },
  secondaryCardSubtitle: {
    fontSize: 13,
    color: c.textSecondary,
    textAlign: 'center',
  },
  // ── Loading + tip ─────────────────────────────────────────────────────────
  loadingOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 60,
  },
  loadingIcon: {
    width: 72,
    height: 72,
    borderRadius: 16,
    marginBottom: Spacing.lg,
  },
  loadingSpinner: {
    marginBottom: Spacing.md,
  },
  loadingText: {
    fontSize: 16,
    color: c.textSecondary,
    fontWeight: '500',
  },
  backupTip: {
    fontSize: 12,
    color: c.textSecondary,
    textAlign: 'center',
    lineHeight: 17,
    marginTop: Spacing.sm,
    fontStyle: 'italic',
  },
});

export default GetStartedScreen;
