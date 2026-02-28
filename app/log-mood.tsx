// ============================================================================
// LOG MOOD SCREEN - Simple mood logging
// ============================================================================

import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Colors } from '../theme/theme-tokens';
import { SubScreenHeader } from '../components/SubScreenHeader';
import { saveMoodLog } from '../utils/centralStorage';
import { logMood } from '../utils/logEvents';
import { hapticSuccess } from '../utils/hapticFeedback';
import { parseCarePlanContext, getCarePlanBannerText } from '../utils/carePlanRouting';
import { trackCarePlanProgress } from '../utils/carePlanStorage';
import { logError } from '../utils/devLog';
import { emitDataUpdate } from '../lib/events';
import { EVENT } from '../lib/eventNames';

const MOODS = [
  { id: 'great', emoji: '😊', label: 'Great' },
  { id: 'good', emoji: '🙂', label: 'Good' },
  { id: 'okay', emoji: '😐', label: 'Okay' },
  { id: 'down', emoji: '😔', label: 'Down' },
  { id: 'difficult', emoji: '😢', label: 'Difficult' },
];

export default function LogMoodScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();

  // Parse CarePlan context from navigation params
  const carePlanContext = parseCarePlanContext(params as Record<string, string>);
  const isFromCarePlan = carePlanContext !== null;

  const [selectedMood, setSelectedMood] = useState<string | null>(null);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const navigationTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Cleanup timeout on unmount to prevent memory leaks
  useEffect(() => {
    return () => {
      if (navigationTimeoutRef.current) {
        clearTimeout(navigationTimeoutRef.current);
      }
    };
  }, []);

  const handleMoodSelect = async (moodId: string) => {
    setSelectedMood(moodId);

    // Convert mood ID to numeric value for storage
    const moodValues: Record<string, number> = {
      'great': 5,
      'good': 4,
      'okay': 3,
      'down': 2,
      'difficult': 1,
    };

    const moodValue = moodValues[moodId] || 3;

    try {
      // Save to legacy storage for backward compatibility
      await saveMoodLog({
        timestamp: new Date().toISOString(),
        mood: moodValue,
        energy: null,
        pain: null,
      });

      // Emit log event for CarePlan/Now page tracking
      await logMood(moodValue, {
        carePlanTaskId: carePlanContext?.carePlanItemId,
        routineId: carePlanContext?.routineId,
        audit: {
          source: isFromCarePlan ? 'careplan' : 'record',
          action: 'direct_tap',
        },
      });

      // Track CarePlan progress if navigated from CarePlan
      if (carePlanContext) {
        await trackCarePlanProgress(
          carePlanContext.routineId,
          carePlanContext.carePlanItemId,
          { logType: 'mood' }
        );
      }

      await hapticSuccess();
      emitDataUpdate(EVENT.MOOD);

      // Show confirmation before navigating back
      setShowConfirmation(true);

      navigationTimeoutRef.current = setTimeout(() => {
        router.back();
      }, 800);
    } catch (error) {
      logError('LogMoodScreen.handleMoodSelect', error);
      router.back();
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <LinearGradient
        colors={[Colors.backgroundGradientStart, Colors.backgroundGradientEnd]}
        style={styles.gradient}
      >
        <SubScreenHeader title="Log Mood" emoji="😊" />

        <ScrollView style={styles.content}>
          {/* CarePlan context banner */}
          {isFromCarePlan && carePlanContext && (
            <View style={styles.carePlanBanner}>
              <Text style={styles.carePlanBannerLabel}>FROM CARE PLAN</Text>
              <Text style={styles.carePlanBannerText}>
                {getCarePlanBannerText(carePlanContext)}
              </Text>
            </View>
          )}

          <Text style={styles.question}>How are they feeling?</Text>

          <View style={styles.moodsContainer}>
            {MOODS.map((mood) => (
              <TouchableOpacity
                key={mood.id}
                style={[
                  styles.moodButton,
                  selectedMood === mood.id && styles.moodButtonSelected,
                ]}
                onPress={() => handleMoodSelect(mood.id)}
                activeOpacity={0.7}
                disabled={showConfirmation}
                accessibilityLabel={`${mood.label} mood`}
                accessibilityHint="Logs this mood for the current check-in"
                accessibilityRole="radio"
                accessibilityState={{ selected: selectedMood === mood.id, disabled: showConfirmation }}
              >
                <Text style={styles.moodEmoji}>{mood.emoji}</Text>
                <Text style={styles.moodLabel}>{mood.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Confirmation message */}
          {showConfirmation && selectedMood && (
            <View style={styles.confirmationContainer}>
              <Text style={styles.confirmationEmoji}>
                {MOODS.find(m => m.id === selectedMood)?.emoji}
              </Text>
              <Text style={styles.confirmationText}>
                Mood logged: {MOODS.find(m => m.id === selectedMood)?.label}
              </Text>
            </View>
          )}
        </ScrollView>
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
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  carePlanBanner: {
    backgroundColor: Colors.purpleFaint,
    borderWidth: 1,
    borderColor: Colors.purpleWash,
    borderRadius: 10,
    padding: 10,
    marginTop: 16,
  },
  carePlanBannerLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.violetBright,
    letterSpacing: 1,
    textAlign: 'center',
    marginBottom: 4,
  },
  carePlanBannerText: {
    fontSize: 13,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  question: {
    fontSize: 20,
    fontWeight: '500',
    color: Colors.textPrimary,
    marginTop: 32,
    marginBottom: 24,
    textAlign: 'center',
  },
  moodsContainer: {
    gap: 12,
  },
  moodButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 14,
    padding: 20,
    gap: 16,
  },
  moodButtonSelected: {
    borderColor: Colors.accent,
    borderWidth: 2,
    backgroundColor: Colors.accentLight,
  },
  moodEmoji: {
    fontSize: 32,
  },
  moodLabel: {
    fontSize: 18,
    fontWeight: '500',
    color: Colors.textPrimary,
  },
  confirmationContainer: {
    alignItems: 'center',
    marginTop: 32,
    paddingVertical: 24,
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(34, 197, 94, 0.3)',
  },
  confirmationEmoji: {
    fontSize: 48,
    marginBottom: 8,
  },
  confirmationText: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.greenBright,
  },
});
