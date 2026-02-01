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
import { useRouter } from 'expo-router';
import { Colors } from '../theme/theme-tokens';
import { saveMoodLog } from '../utils/centralStorage';
import { hapticSuccess } from '../utils/hapticFeedback';

const MOODS = [
  { id: 'great', emoji: '😊', label: 'Great' },
  { id: 'good', emoji: '🙂', label: 'Good' },
  { id: 'okay', emoji: '😐', label: 'Okay' },
  { id: 'down', emoji: '😔', label: 'Down' },
  { id: 'difficult', emoji: '😢', label: 'Difficult' },
];

export default function LogMoodScreen() {
  const router = useRouter();
  const [selectedMood, setSelectedMood] = useState<string | null>(null);
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

    try {
      await saveMoodLog({
        timestamp: new Date().toISOString(),
        mood: moodValues[moodId] || 3,
        energy: null,
        pain: null,
      });

      await hapticSuccess();

      navigationTimeoutRef.current = setTimeout(() => {
        router.back();
      }, 300);
    } catch (error) {
      console.error('Error saving mood:', error);
      router.back();
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <LinearGradient
        colors={[Colors.backgroundGradientStart, Colors.backgroundGradientEnd]}
        style={styles.gradient}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Text style={styles.backButtonText}>←</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Log Mood</Text>
          <View style={styles.backButton} />
        </View>

        <ScrollView style={styles.content}>
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
              >
                <Text style={styles.moodEmoji}>{mood.emoji}</Text>
                <Text style={styles.moodLabel}>{mood.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backButtonText: {
    color: Colors.textPrimary,
    fontSize: 18,
  },
  title: {
    color: Colors.textPrimary,
    fontSize: 18,
    fontWeight: '500',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
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
});
