// ============================================================================
// GET STARTED SCREEN - Patient name, bucket selection, start options
// Screen 3 of 3: Collects context then starts fresh or with sample data
// ============================================================================

import React, { useState } from 'react';
import { View, Text, StyleSheet, Dimensions, TouchableOpacity, TextInput, ScrollView } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { AuroraBackground } from '../components/AuroraBackground';
import { Colors, Spacing, BorderRadius } from '../../../theme/theme-tokens';
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
}

export const GetStartedScreen: React.FC<Props> = ({ onComplete }) => {
  const [patientName, setPatientName] = useState('');
  const [selectedBuckets, setSelectedBuckets] = useState<Set<BucketType>>(
    () => new Set(DEFAULT_SELECTED)
  );

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
    try {
      // Save patient name
      const name = patientName.trim() || 'Patient';
      await AsyncStorage.setItem(StorageKeys.PATIENT_NAME, name);
      await updatePatient('default', { name });

      // Create care plan config with selected buckets
      const config = await getOrCreateCarePlanConfig('default');
      const updatedConfig = { ...config };
      for (const bucket of SELECTABLE_BUCKETS) {
        if (updatedConfig.buckets?.[bucket]) {
          updatedConfig.buckets[bucket].enabled = selectedBuckets.has(bucket);
        }
      }
      await saveCarePlanConfig(updatedConfig);
    } catch {}

    onComplete(seedData);
  };

  return (
    <View style={styles.container}>
      <AuroraBackground variant="welcome" />
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Animated.Text entering={FadeInDown.delay(100).duration(300)} style={styles.title}>
          Who are you caring for?
        </Animated.Text>

        {/* Patient Name Input */}
        <Animated.View entering={FadeInDown.delay(150).duration(300)} style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="Their name (e.g. Mom, Dad)"
            placeholderTextColor={Colors.textSecondary}
            value={patientName}
            onChangeText={setPatientName}
            autoCapitalize="words"
            returnKeyType="done"
          />
        </Animated.View>

        {/* Bucket Selection */}
        <Animated.View entering={FadeInDown.delay(200).duration(300)}>
          <Text style={styles.sectionTitle}>What would you like to track?</Text>
          <Text style={styles.sectionHint}>Pick 2-3 to start. You can change anytime.</Text>
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
                  accessibilityLabel={`${meta.label} tracking`}
                >
                  <Text style={styles.bucketEmoji}>{meta.emoji}</Text>
                  <Text style={[styles.bucketLabel, selected && styles.bucketLabelSelected]}>
                    {meta.label}
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
            <Text style={styles.optionSubtitle}>Set up with your selections above</Text>
          </TouchableOpacity>
        </Animated.View>

        {/* Option B: Sample Data (secondary) */}
        <Animated.View entering={FadeInDown.delay(350).duration(300)}>
          <TouchableOpacity
            style={[styles.optionCard, styles.optionCardSecondary]}
            onPress={() => handleComplete(true)}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel="Try with sample data to explore the app"
          >
            <Text style={styles.optionTitle}>Try with Sample Data</Text>
            <Text style={styles.optionSubtitle}>Explore with 7 days of example data</Text>
          </TouchableOpacity>
        </Animated.View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: SCREEN_WIDTH,
    backgroundColor: Colors.background,
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
    fontWeight: '600',
    color: Colors.textPrimary,
    textAlign: 'center',
    marginBottom: Spacing.xl,
  },
  inputContainer: {
    marginBottom: Spacing.xl,
  },
  input: {
    backgroundColor: Colors.glass,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    fontSize: 16,
    color: Colors.textPrimary,
    textAlign: 'center',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textPrimary,
    textAlign: 'center',
    marginBottom: 4,
  },
  sectionHint: {
    fontSize: 13,
    color: Colors.textSecondary,
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
    backgroundColor: Colors.glass,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    alignItems: 'center',
  },
  bucketCardSelected: {
    borderColor: Colors.accent,
    backgroundColor: Colors.accentHint,
  },
  bucketEmoji: {
    fontSize: 24,
    marginBottom: 4,
  },
  bucketLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  bucketLabelSelected: {
    color: Colors.accent,
  },
  optionCard: {
    width: '100%',
    backgroundColor: Colors.accent,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    alignItems: 'center',
  },
  optionCardSecondary: {
    backgroundColor: Colors.glass,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  optionSubtitle: {
    fontSize: 13,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
});

export default GetStartedScreen;
