// ============================================================================
// MOOD SLIDER — Caregiver self-check mood input
// 5 positions: Rough day → Struggling → Getting by → Okay → Good day
// ============================================================================

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { emitMoodEvent } from '../../utils/eventEmitter';
import { saveDailyCheck } from '../../utils/caregiverWellnessStorage';
import { updateStreak } from '../../utils/streakStorage';
import { SAVE_DESTINATIONS } from '../../utils/saveDestinations';
import { logError } from '../../utils/devLog';

// ============================================================================
// MOOD POSITIONS
// ============================================================================

export const MOOD_POSITIONS = [
  { score: 1, label: 'Rough day', emoji: '😢' },
  { score: 2, label: 'Struggling', emoji: '😟' },
  { score: 3, label: 'Getting by', emoji: '😐' },
  { score: 4, label: 'Okay', emoji: '🙂' },
  { score: 5, label: 'Good day', emoji: '😊' },
] as const;

export const AFFIRMATIONS: Record<number, string> = {
  1: "It's okay to have hard days. You're still showing up, and that matters.",
  2: "Caregiving is tough. Acknowledging the struggle is a sign of strength.",
  3: "Getting by is enough. You don't have to be perfect to make a difference.",
  4: "Glad today is going okay. You deserve these steadier days.",
  5: "What a great day. These moments fuel everything you do.",
};

// ============================================================================
// COMPONENT
// ============================================================================

export function MoodSlider() {
  const { colors } = useTheme();
  const [selectedIndex, setSelectedIndex] = useState(2); // Default: Getting by
  const [logged, setLogged] = useState(false);
  const [saving, setSaving] = useState(false);

  const selected = MOOD_POSITIONS[selectedIndex];

  const handleLog = useCallback(async () => {
    if (saving || logged) return;
    setSaving(true);
    try {
      // Emit to unified event store
      await emitMoodEvent(selected.score, selected.label, { source: 'dedicated_screen' });

      // Save to caregiver wellness storage
      const today = new Date().toISOString().split('T')[0];
      await saveDailyCheck({
        date: today,
        sleep: selected.score,
        stress: 6 - selected.score, // Inverse: higher mood = lower stress
        meals: selected.score,
      });

      // Increment streak
      await updateStreak('wellnessCheck');

      setLogged(true);
    } catch (err) {
      logError('MoodSlider.handleLog', err);
    } finally {
      setSaving(false);
    }
  }, [selected, saving, logged]);

  const styles = createStyles(colors);

  return (
    <View style={styles.container}>
      {/* Emoji + Label */}
      <Text style={styles.emoji}>{selected.emoji}</Text>
      <Text style={styles.label}>{selected.label}</Text>

      {/* Slider track with single thumb */}
      <View style={styles.sliderTrack}>
        <View style={[styles.sliderFill, { width: `${(selectedIndex / 4) * 100}%` }]} />
        <View style={[styles.sliderThumb, { left: `${(selectedIndex / 4) * 100}%` }]} />
        {MOOD_POSITIONS.map((pos, i) => (
          <TouchableOpacity
            key={pos.score}
            style={styles.sliderDot}
            onPress={() => { if (!logged) setSelectedIndex(i); }}
            accessibilityLabel={pos.label}
            accessibilityRole="button"
          />
        ))}
      </View>

      {/* Scale labels */}
      <View style={styles.scaleLabels}>
        <Text style={styles.scaleLabel}>Rough</Text>
        <Text style={styles.scaleLabel}>Good</Text>
      </View>

      {/* Log button or affirmation */}
      {!logged ? (
        <TouchableOpacity
          style={styles.logButton}
          onPress={handleLog}
          disabled={saving}
          accessibilityLabel="Log this"
          accessibilityRole="button"
        >
          <Text style={styles.logButtonText}>{saving ? 'Saving...' : 'Log this'}</Text>
        </TouchableOpacity>
      ) : (
        <View>
          {/* Affirmation */}
          <View style={[styles.affirmation, { borderLeftColor: colors.accent }]}>
            <Text style={styles.affirmationText}>{AFFIRMATIONS[selected.score]}</Text>
          </View>

          {/* Save destinations */}
          <View style={styles.destinations}>
            {SAVE_DESTINATIONS.mood.map((dest, i) => (
              <View key={i} style={styles.destRow}>
                <Text style={styles.destIcon}>{dest.icon}</Text>
                <Text style={styles.destText}>{dest.text}</Text>
              </View>
            ))}
          </View>
        </View>
      )}
    </View>
  );
}

// ============================================================================
// STYLES
// ============================================================================

function createStyles(c: any) {
  return StyleSheet.create({
    container: {
      // No background/border — parent warmCard provides the surface
      alignItems: 'center',
    },
    emoji: {
      fontSize: 40,
      textAlign: 'center',
      marginBottom: 4,
    },
    label: {
      fontSize: 15,
      fontWeight: '500' as const,
      color: '#c0c8c4',
      textAlign: 'center' as const,
      marginBottom: 20,
    },
    sliderTrack: {
      height: 4,
      backgroundColor: '#1a2a22',
      borderRadius: 2,
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      justifyContent: 'space-between' as const,
      marginHorizontal: 12,
      position: 'relative' as const,
    },
    sliderFill: {
      position: 'absolute' as const,
      left: 0,
      top: 0,
      height: 4,
      borderRadius: 2,
      backgroundColor: '#34D399',
    },
    sliderThumb: {
      position: 'absolute' as const,
      width: 14,
      height: 14,
      borderRadius: 7,
      backgroundColor: '#34D399',
      borderWidth: 2.5,
      borderColor: '#131a16',
      zIndex: 2,
      top: -5,
      marginLeft: -7,
    },
    sliderDot: {
      width: 14,
      height: 28,
      backgroundColor: 'transparent',
      zIndex: 1,
    },
    scaleLabels: {
      flexDirection: 'row' as const,
      justifyContent: 'space-between' as const,
      marginTop: 6,
      marginHorizontal: 12,
      marginBottom: 20,
    },
    scaleLabel: {
      fontSize: 11,
      color: '#4a5a52',
    },
    logButton: {
      paddingVertical: 9,
      paddingHorizontal: 32,
      borderRadius: 20,
      alignSelf: 'center' as const,
      backgroundColor: 'rgba(52, 211, 153, 0.12)',
    },
    logButtonText: {
      fontSize: 13,
      fontWeight: '500' as const,
      color: '#34D399',
    },
    affirmation: {
      borderLeftWidth: 3,
      paddingLeft: 12,
      paddingVertical: 8,
      marginBottom: 16,
    },
    affirmationText: {
      fontSize: 14,
      color: c.textSecondary,
      fontStyle: 'italic',
      lineHeight: 20,
    },
    destinations: {
      gap: 6,
    },
    destRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    destIcon: {
      fontSize: 14,
    },
    destText: {
      fontSize: 12,
      color: c.textMuted,
    },
  });
}
