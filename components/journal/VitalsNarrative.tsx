import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, Spacing, BorderRadius } from '../../theme/theme-tokens';
import type { VitalsDetail } from '../../utils/careSummaryBuilder';

interface Props {
  vitals: VitalsDetail;
}

function formatTime(iso: string): string {
  try {
    const date = new Date(iso);
    if (!isNaN(date.getTime())) {
      return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    }
  } catch { /* fall through */ }
  return iso;
}

function buildReadingsString(readings: VitalsDetail['readings']): string {
  if (!readings) return '';
  const parts: string[] = [];
  if (readings.systolic != null && readings.diastolic != null) {
    parts.push(`BP ${readings.systolic}/${readings.diastolic}`);
  }
  if (readings.heartRate != null) parts.push(`HR ${readings.heartRate}`);
  if (readings.glucose != null) parts.push(`Glucose ${readings.glucose}`);
  if (readings.temperature != null) parts.push(`Temp ${readings.temperature}\u00B0`);
  if (readings.oxygen != null) parts.push(`O\u2082 ${readings.oxygen}%`);
  if (readings.weight != null) parts.push(`Weight ${readings.weight} lbs`);
  return parts.join(' \u00B7 ');
}

export function VitalsNarrative({ vitals }: Props) {
  if (!vitals.scheduled && !vitals.recorded) return null;

  let text: React.ReactNode;

  if (vitals.recorded && vitals.readings) {
    const readingsStr = buildReadingsString(vitals.readings);
    const timeStr = vitals.recordedAt ? ` recorded at ${formatTime(vitals.recordedAt)}` : '';
    text = (
      <Text style={styles.narrative}>
        <Text style={styles.bold}>{readingsStr}</Text>{timeStr}.
      </Text>
    );
  } else if (vitals.scheduled && !vitals.recorded) {
    const timeStr = vitals.scheduledTime ? formatTime(vitals.scheduledTime) : 'today';
    text = (
      <Text style={styles.narrative}>
        Check vitals scheduled for {timeStr}{' \u2014 '}
        <Text style={styles.flagged}>not yet recorded.</Text>
      </Text>
    );
  } else if (vitals.recorded) {
    text = (
      <Text style={styles.narrative}>Vitals logged today.</Text>
    );
  }

  return (
    <View style={styles.card}>
      {text}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.glassHover,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
  },
  narrative: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  bold: {
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  flagged: {
    color: Colors.amber,
  },
});
