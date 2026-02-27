// ============================================================================
// LOG SLEEP SCREEN
// Individual sleep logging with hours and quality rating
// ============================================================================

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Colors, BorderRadius, Spacing } from '../theme/theme-tokens';
import { saveDailyTracking, getDailyTracking } from '../utils/dailyTrackingStorage';
import { saveSleepLog } from '../utils/centralStorage';
import { hapticSuccess } from '../utils/hapticFeedback';
import { logError } from '../utils/devLog';
import { getTodayDateString } from '../services/carePlanGenerator';
import { logInstanceCompletion, DEFAULT_PATIENT_ID } from '../storage/carePlanRepo';
import { emitDataUpdate } from '../lib/events';

const QUALITY_LABELS = ['Very Poor', 'Poor', 'Fair', 'Good', 'Excellent'];

export default function LogSleep() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const [hours, setHours] = useState('');
  const [quality, setQuality] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  const today = getTodayDateString();

  // Load existing sleep data for today
  useEffect(() => {
    loadExistingData();
  }, []);

  const loadExistingData = async () => {
    try {
      const existing = await getDailyTracking(today);
      if (existing) {
        if (existing.sleep !== null && existing.sleep !== undefined) {
          setHours(existing.sleep.toString());
        }
        if (existing.sleepQuality !== null && existing.sleepQuality !== undefined) {
          setQuality(existing.sleepQuality);
        }
      }
    } catch (error) {
      logError('LogSleep.loadExistingData', error);
    }
  };

  const handleSave = async () => {
    // Validate hours if entered
    if (hours.trim()) {
      const hoursNum = parseFloat(hours);
      if (isNaN(hoursNum) || hoursNum < 0 || hoursNum > 24) {
        Alert.alert('Invalid Hours', 'Please enter a valid number of hours (0-24)');
        return;
      }
    }

    setLoading(true);
    try {
      const hoursNum = hours.trim() ? parseFloat(hours) : 0;

      // Save to dailyTrackingStorage (legacy)
      await saveDailyTracking(today, {
        sleep: hours.trim() ? hoursNum : null,
        sleepQuality: quality,
      });

      // Also save to centralStorage for Now page sync
      if (hoursNum > 0 || quality) {
        await saveSleepLog({
          timestamp: new Date().toISOString(),
          hours: hoursNum,
          quality: quality || 3,
        });
      }

      // Mark the daily care instance as completed (updates progress card)
      const instanceId = params.instanceId as string | undefined;
      if (instanceId) {
        try {
          await logInstanceCompletion(
            DEFAULT_PATIENT_ID,
            today,
            instanceId,
            'completed',
            { type: 'sleep', hours: hoursNum, quality: quality || 3 },
            { source: 'record' }
          );
          emitDataUpdate('dailyInstances');
        } catch (err) {
          logError('LogSleep.completeInstance', err);
        }
      }

      await hapticSuccess();
      router.back();
    } catch (error) {
      logError('LogSleep.handleSave', error);
      Alert.alert('Error', 'Failed to save sleep data');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <LinearGradient
        colors={[Colors.backgroundGradientStart, Colors.backgroundGradientEnd]}
        style={styles.gradient}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
        >
          <ScrollView
            style={styles.scrollView}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Header */}
            <View style={styles.header}>
              <TouchableOpacity
                style={styles.backButton}
                onPress={() => router.back()}
                accessibilityLabel="Go back"
                accessibilityRole="button"
              >
                <Text style={styles.backIcon}>←</Text>
              </TouchableOpacity>
              <Text style={styles.title}>Log Sleep</Text>
              <View style={{ width: 44 }} />
            </View>

            {/* Hours Input */}
            <View style={styles.section}>
              <Text style={styles.label}>Hours Slept</Text>
              <View style={styles.hoursInputContainer}>
                <TextInput
                  style={styles.hoursInput}
                  placeholder="7.5"
                  placeholderTextColor={Colors.textMuted}
                  keyboardType="decimal-pad"
                  value={hours}
                  onChangeText={setHours}
                  maxLength={4}
                  accessibilityLabel="Hours slept"
                />
                <Text style={styles.hoursUnit}>hours</Text>
              </View>
              <Text style={styles.hint}>Enter a number between 0 and 24</Text>
            </View>

            {/* Quality Rating */}
            <View style={styles.section}>
              <Text style={styles.label}>Sleep Quality</Text>
              <View style={styles.qualityContainer}>
                {[1, 2, 3, 4, 5].map((value) => (
                  <TouchableOpacity
                    key={value}
                    style={[
                      styles.qualityButton,
                      quality === value && styles.qualityButtonSelected,
                    ]}
                    onPress={() => setQuality(value)}
                    accessibilityLabel={`Sleep quality ${QUALITY_LABELS[value - 1]}, ${value} out of 5`}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: quality === value }}
                  >
                    <Text
                      style={[
                        styles.qualityNumber,
                        quality === value && styles.qualityNumberSelected,
                      ]}
                    >
                      {value}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              <View style={styles.qualityLabels}>
                <Text style={styles.qualityLabelText}>Very Poor</Text>
                <Text style={styles.qualityLabelText}>Excellent</Text>
              </View>
              {quality && (
                <View style={styles.selectedQuality}>
                  <Text style={styles.selectedQualityText}>
                    {QUALITY_LABELS[quality - 1]}
                  </Text>
                </View>
              )}
            </View>

            <View style={{ height: 100 }} />
          </ScrollView>

          {/* Footer Button */}
          <View style={styles.footer}>
            <TouchableOpacity
              style={[styles.saveButton, loading && styles.saveButtonDisabled]}
              onPress={handleSave}
              disabled={loading}
              accessibilityLabel={loading ? 'Saving sleep data' : 'Log sleep'}
              accessibilityHint="Saves sleep hours and quality rating"
              accessibilityRole="button"
              accessibilityState={{ disabled: loading }}
            >
              <Text style={styles.saveButtonText}>
                {loading ? 'Saving...' : 'Log Sleep'}
              </Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
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
  scrollView: {
    flex: 1,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.xl,
    paddingTop: Spacing.lg,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.surfaceHighlight,
    borderWidth: 1,
    borderColor: Colors.accentLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backIcon: {
    fontSize: 20,
    color: Colors.textPrimary,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: Colors.textPrimary,
  },

  // Section
  section: {
    padding: Spacing.xl,
    marginBottom: Spacing.md,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.accent,
    marginBottom: Spacing.lg,
  },

  // Hours Input
  hoursInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  hoursInput: {
    flex: 1,
    backgroundColor: Colors.surfaceHighlight,
    borderWidth: 1,
    borderColor: Colors.accentHint,
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    color: Colors.textPrimary,
    fontSize: 24,
    fontWeight: '600',
    textAlign: 'center',
  },
  hoursUnit: {
    fontSize: 16,
    color: Colors.textSecondary,
    minWidth: 50,
  },
  hint: {
    fontSize: 13,
    color: Colors.textMuted,
    marginTop: Spacing.sm,
  },

  // Quality Buttons
  qualityContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: Spacing.sm,
  },
  qualityButton: {
    flex: 1,
    aspectRatio: 1,
    maxWidth: 60,
    maxHeight: 60,
    borderRadius: 30,
    backgroundColor: Colors.surfaceHighlight,
    borderWidth: 1,
    borderColor: Colors.accentHint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qualityButtonSelected: {
    backgroundColor: Colors.accent,
    borderColor: Colors.accent,
  },
  qualityNumber: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  qualityNumberSelected: {
    color: Colors.background,
  },
  qualityLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: Spacing.sm,
    paddingHorizontal: Spacing.xs,
  },
  qualityLabelText: {
    fontSize: 12,
    color: Colors.textMuted,
  },
  selectedQuality: {
    marginTop: Spacing.lg,
    alignItems: 'center',
  },
  selectedQualityText: {
    fontSize: 15,
    fontWeight: '500',
    color: Colors.accent,
  },

  // Footer
  footer: {
    padding: Spacing.xl,
    paddingBottom: Spacing.xxl,
    borderTopWidth: 1,
    borderTopColor: Colors.accentHint,
    backgroundColor: Colors.background,
  },
  saveButton: {
    backgroundColor: Colors.purple,
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: Colors.textPrimary,
    fontSize: 16,
    fontWeight: '600',
  },
});
