// ============================================================================
// GET STARTED SCREEN - Patient name, bucket selection, start options
// Screen 4 of 4: Collects context then starts fresh or with sample data
// ============================================================================

import React, { useState, useMemo } from 'react';
import { View, Text, Image, StyleSheet, Dimensions, TouchableOpacity, TextInput, ScrollView, ActivityIndicator } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { AuroraBackground } from '../components/AuroraBackground';
import { Colors, Spacing, BorderRadius } from '../../../theme/theme-tokens';
import { useTheme } from '../../../contexts/ThemeContext';
import { BucketType, BUCKET_META } from '../../../types/carePlanConfig';
import { updatePatient } from '../../../storage/patientRegistry';
import { getOrCreateCarePlanConfig, saveCarePlanConfig } from '../../../storage/carePlanConfigRepo';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { StorageKeys } from '../../../utils/storageKeys';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const SELECTABLE_BUCKETS: BucketType[] = ['meds', 'vitals', 'meals', 'water', 'sleep', 'activity'];
const DEFAULT_SELECTED: BucketType[] = ['meds', 'vitals', 'meals'];

interface Props {
  onComplete: (seedData: boolean) => void;
  careMode?: 'caregiver' | 'self';
}

export const GetStartedScreen: React.FC<Props> = ({ onComplete, careMode = 'caregiver' }) => {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [patientName, setPatientName] = useState('');
  const [selectedBuckets, setSelectedBuckets] = useState<Set<BucketType>>(
    () => new Set(DEFAULT_SELECTED)
  );
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');

  const isSelf = careMode === 'self';

  const toggleBucket = (bucket: BucketType) => {
    setSelectedBuckets(prev => {
      const next = new Set(prev);
      if (next.has(bucket)) {
        next.delete(bucket);
      } else {
        next.add(bucket);
      }
      return next;
    });
  };

  const handleComplete = async (seedData: boolean) => {
    setLoadingMessage(seedData ? 'Creating sample data...' : 'Setting things up...');
    setIsLoading(true);

    if (!seedData) {
      // Only save user-entered name and bucket config for "Start Fresh"
      // When seeding sample data, initializeSampleData() handles all of this
      try {
        // Skip fallback uses the friendly placeholder so downstream consumers
        // (now.tsx, journal.tsx, understand.tsx) read the same display string
        // they fall back to anyway. The legacy 'Patient' literal is left in
        // place only as a backwards-compat filter for installs from earlier
        // versions of the onboarding flow.
        const name = patientName.trim() || 'your loved one';
        await AsyncStorage.setItem(StorageKeys.PATIENT_NAME, name);
        await updatePatient('default', { name });

        const config = await getOrCreateCarePlanConfig('default');
        const updatedConfig = { ...config };
        for (const bucket of SELECTABLE_BUCKETS) {
          if ((updatedConfig as any)[bucket]) {
            (updatedConfig as any)[bucket].enabled = selectedBuckets.has(bucket);
          }
        }
        await saveCarePlanConfig(updatedConfig);
      } catch {}
    }

    onComplete(seedData);
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
        <Animated.Text entering={FadeInDown.delay(100).duration(300)} style={styles.title}>
          Almost there.
        </Animated.Text>

        {/* Patient Name Input */}
        <Animated.View entering={FadeInDown.delay(150).duration(300)} style={styles.inputContainer}>
          <Text style={styles.inputLabel}>{isSelf ? 'Your name' : 'Their name'}</Text>
          <TextInput
            style={styles.input}
            placeholder={isSelf ? 'Your name' : 'e.g. Mom, Dad'}
            placeholderTextColor={colors.textSecondary}
            value={patientName}
            onChangeText={setPatientName}
            autoCapitalize="words"
            returnKeyType="done"
          />
        </Animated.View>

        {/* Bucket Selection */}
        <Animated.View entering={FadeInDown.delay(200).duration(300)}>
          <Text style={styles.sectionTitle}>What would you like to track?</Text>
          <Text style={styles.sectionHint}>Start small — you can add more anytime.</Text>
          <View style={styles.bucketGrid}>
            {SELECTABLE_BUCKETS.map(bucket => {
              const meta = BUCKET_META[bucket];
              const selected = selectedBuckets.has(bucket);
              return (
                <TouchableOpacity
                  key={bucket}
                  style={[styles.bucketCard, selected && styles.bucketCardSelected]}
                  onPress={() => toggleBucket(bucket)}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: selected }}
                  accessibilityLabel={`${meta.name} tracking`}
                >
                  <Text style={styles.bucketEmoji}>{meta.emoji}</Text>
                  <Text style={[styles.bucketLabel, selected && styles.bucketLabelSelected]}>
                    {meta.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </Animated.View>

        {/* Option A: Start Fresh (default) */}
        <Animated.View entering={FadeInDown.delay(300).duration(300)}>
          <TouchableOpacity
            style={styles.optionCard}
            onPress={() => handleComplete(false)}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel="Start fresh with your selections"
          >
            <Text style={styles.optionTitle}>Start Fresh</Text>
            <Text style={styles.optionSubtitle}>Begin tracking right away</Text>
          </TouchableOpacity>
        </Animated.View>

        {/* Option B: Sample Data (secondary) */}
        <Animated.View entering={FadeInDown.delay(350).duration(300)}>
          <TouchableOpacity
            style={[styles.optionCard, styles.optionCardSecondary]}
            onPress={() => handleComplete(true)}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel="Explore with sample data to see the app in action"
          >
            <Text style={styles.optionTitle}>Explore with Sample Data</Text>
            <Text style={styles.optionSubtitle}>See 14 days of realistic data {'\u2014'} medications, vitals, appointments, and insights</Text>
          </TouchableOpacity>
        </Animated.View>

        {/* Backup Tip */}
        <Animated.View entering={FadeInDown.delay(400).duration(300)}>
          <Text style={styles.backupTip}>
            Your data stays on this device. Use Settings {'\u203A'} Backup & Restore to create encrypted backups before switching phones.
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
    paddingHorizontal: Spacing.xxl,
    paddingTop: 60,
    paddingBottom: 40,
  },
  title: {
    fontSize: 26,
    fontWeight: '300',
    color: c.textPrimary,
    textAlign: 'center',
    marginBottom: Spacing.xl,
  },
  inputContainer: {
    marginBottom: Spacing.xl,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: c.textSecondary,
    marginBottom: 6,
    textAlign: 'center',
  },
  input: {
    backgroundColor: c.glass,
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    fontSize: 16,
    color: c.textPrimary,
    textAlign: 'center',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: c.textPrimary,
    textAlign: 'center',
    marginBottom: 4,
  },
  sectionHint: {
    fontSize: 13,
    color: c.textSecondary,
    textAlign: 'center',
    marginBottom: Spacing.lg,
  },
  bucketGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 10,
    marginBottom: Spacing.xxl,
  },
  bucketCard: {
    width: '30%',
    backgroundColor: c.glass,
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    alignItems: 'center',
  },
  bucketCardSelected: {
    borderColor: c.accent,
    backgroundColor: c.accentHint,
  },
  bucketEmoji: {
    fontSize: 24,
    marginBottom: 4,
  },
  bucketLabel: {
    fontSize: 12,
    color: c.textSecondary,
    fontWeight: '500',
  },
  bucketLabelSelected: {
    color: c.accent,
  },
  optionCard: {
    width: '100%',
    backgroundColor: c.accent,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    alignItems: 'center',
  },
  optionCardSecondary: {
    backgroundColor: c.glass,
    borderWidth: 1,
    borderColor: c.border,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: c.textPrimary,
    marginBottom: 2,
  },
  optionSubtitle: {
    fontSize: 13,
    color: c.textSecondary,
    textAlign: 'center',
  },
  // Loading overlay
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
    marginBottom: Spacing.xl,
  },
  loadingSpinner: {
    marginBottom: Spacing.lg,
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
    marginTop: Spacing.md,
    fontStyle: 'italic',
  },
});

export default GetStartedScreen;
