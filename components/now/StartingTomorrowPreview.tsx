// ============================================================================
// StartingTomorrowPreview — a calm, neutral confirmation for a MED or VITALS
// item the caregiver added AFTER its time today. It didn't miss anything (it
// didn't exist yet) and its first real occurrence is tomorrow — so instead of
// vanishing from today's Now, it shows here as an upcoming, saved-and-scheduled
// line:
//
//     💊  Lisinopril (Zestril) · first dose tomorrow, 8:00 AM
//     📊  Vitals check · first reading tomorrow, 8:00 AM
//
// Purely informational: NOT overdue, NOT missed, never the START HERE pointer,
// and it holds no instance so it can't keep the day falsely active. Renders
// nothing when there are no such items (the common case).
// ============================================================================

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import type { StartingTomorrowItem } from '../../utils/startingTomorrow';

interface StartingTomorrowPreviewProps {
  items: StartingTomorrowItem[];
}

export function StartingTomorrowPreview({ items }: StartingTomorrowPreviewProps) {
  const { colors } = useTheme();
  if (!items || items.length === 0) return null;
  const styles = createStyles(colors);

  return (
    <View style={styles.container} testID="starting-tomorrow-preview">
      {items.map((it) => (
        <View key={it.id} style={styles.row} testID={`starting-tomorrow-${it.id}`}>
          <Text style={styles.emoji}>{it.emoji}</Text>
          <Text style={styles.text}>
            <Text style={styles.name}>{it.name}</Text>
            {` · first ${it.noun} tomorrow${it.timeLabel ? `, ${it.timeLabel}` : ''}`}
          </Text>
        </View>
      ))}
    </View>
  );
}

const createStyles = (colors: any) =>
  StyleSheet.create({
    container: {
      marginTop: 10,
      paddingTop: 10,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.glassBorder,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 4,
    },
    emoji: {
      fontSize: 15,
      marginRight: 8,
      opacity: 0.7,
    },
    text: {
      flex: 1,
      fontSize: 13,
      color: colors.textSecondary,
      lineHeight: 18,
    },
    name: {
      color: colors.textPrimary,
      fontWeight: '600',
    },
  });
