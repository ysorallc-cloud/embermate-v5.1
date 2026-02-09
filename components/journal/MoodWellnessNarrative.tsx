import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, Spacing, BorderRadius } from '../../theme/theme-tokens';
import type { MoodDetail } from '../../utils/careSummaryBuilder';

interface Props {
  mood: MoodDetail;
}

export function MoodWellnessNarrative({ mood }: Props) {
  const hasContent = mood.entries.length > 0 || mood.morningWellness || mood.eveningWellness;
  if (!hasContent) return null;

  const parts: React.ReactNode[] = [];

  // Morning wellness
  if (mood.morningWellness) {
    const mw = mood.morningWellness;
    let morningText = `Morning check-in: Sleep ${mw.sleepQuality}/5, Mood ${mw.mood}.`;
    if (mw.orientation && mw.orientation !== 'Alert & Oriented') {
      morningText = `Morning check-in: Sleep ${mw.sleepQuality}/5, Mood ${mw.mood}. Orientation: ${mw.orientation}.`;
    }
    parts.push(
      <Text key="morning" style={styles.narrative}>{morningText}</Text>
    );
  }

  // Mood entries (trajectory if multiple)
  const nonWellnessEntries = mood.entries.filter(e => e.source === 'mood-log');
  if (nonWellnessEntries.length === 1) {
    parts.push(
      <Text key="mood-single" style={styles.narrative}>
        Mood check-in: <Text style={styles.bold}>{nonWellnessEntries[0].label}</Text>.
      </Text>
    );
  } else if (nonWellnessEntries.length > 1) {
    const first = nonWellnessEntries[0].label;
    const last = nonWellnessEntries[nonWellnessEntries.length - 1].label;
    parts.push(
      <Text key="mood-multi" style={styles.narrative}>
        Mood check-ins: <Text style={styles.bold}>{first} {'\u2192'} {last}</Text>.
      </Text>
    );
  }

  // Evening wellness
  if (mood.eveningWellness) {
    const ew = mood.eveningWellness;
    let eveningText = `Evening check-in: Day rated ${ew.dayRating}/5.`;
    if (ew.painLevel && ew.painLevel !== 'None') {
      eveningText += ` Pain: ${ew.painLevel}.`;
    }
    parts.push(
      <Text key="evening" style={styles.narrative}>{eveningText}</Text>
    );
  } else if (new Date().getHours() >= 20) {
    parts.push(
      <Text key="no-evening" style={[styles.narrative, styles.muted]}>
        No evening check-in yet.
      </Text>
    );
  }

  return (
    <View style={styles.card}>
      {parts}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
  },
  narrative: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 20,
    marginBottom: 2,
  },
  bold: {
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  muted: {
    color: Colors.textMuted,
    fontStyle: 'italic',
  },
});
