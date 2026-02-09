import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, Spacing, BorderRadius } from '../../theme/theme-tokens';
import type { MealsDetail } from '../../utils/careSummaryBuilder';

interface Props {
  meals: MealsDetail;
}

function formatTime(isoOrHHmm: string): string {
  try {
    const date = new Date(isoOrHHmm);
    if (!isNaN(date.getTime())) {
      return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    }
  } catch { /* fall through */ }
  return isoOrHHmm;
}

export function MealsNarrative({ meals }: Props) {
  if (meals.total === 0) return null;

  const completed = meals.meals.filter(m => m.status === 'completed');
  const pending = meals.meals.filter(m => m.status === 'pending');
  const allCompleted = completed.length === meals.total;
  const noneCompleted = completed.length === 0;

  const parts: React.ReactNode[] = [];

  if (allCompleted) {
    const details = completed.map(m => {
      let desc = m.name;
      if (m.appetite) desc += ` (${m.appetite})`;
      return desc;
    }).join(', ');
    parts.push(
      <Text key="all" style={styles.narrative}>
        <Text style={styles.bold}>All meals logged today.</Text> {details}.
      </Text>
    );
  } else if (noneCompleted) {
    const names = pending.map(m => m.name).join(', ');
    parts.push(
      <Text key="none" style={styles.narrative}>
        No meals logged yet. {names} scheduled.
      </Text>
    );
  } else {
    for (const m of completed) {
      let text = `${m.name} logged`;
      if (m.appetite) text += ` (${m.appetite})`;
      text += '.';
      parts.push(
        <Text key={`c-${m.name}`} style={styles.narrative}>
          <Text style={styles.bold}>{m.name}</Text> logged{m.appetite ? ` (${m.appetite})` : ''}.
        </Text>
      );
    }
    for (const m of pending) {
      const timeStr = m.scheduledTime ? formatTime(m.scheduledTime) : 'today';
      parts.push(
        <Text key={`p-${m.name}`} style={styles.narrative}>
          <Text style={styles.bold}>{m.name}</Text> scheduled for {timeStr}{' \u2014 '}
          <Text style={styles.flagged}>not yet logged.</Text>
        </Text>
      );
    }
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
  flagged: {
    color: Colors.amber,
  },
});
