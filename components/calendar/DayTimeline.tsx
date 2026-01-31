// ============================================================================
// DAY TIMELINE COMPONENT
// Shows selected day's timeline below calendar grid
// ============================================================================

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { TimelineItem } from '@/components/today/TimelineItem';
import { TimelineItem as TimelineItemType } from '@/types/timeline';
import { Colors } from '@/theme/theme-tokens';
import { format, isToday } from 'date-fns';

interface Props {
  date: Date;
  items: TimelineItemType[];
}

export const DayTimeline: React.FC<Props> = ({ date, items }) => {
  const dayLabel = isToday(date)
    ? `${format(date, 'MMMM d')} — TODAY`
    : format(date, 'MMMM d — EEEE').toUpperCase();

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{dayLabel}</Text>

      {items.length === 0 ? (
        <Text style={styles.empty}>No items scheduled</Text>
      ) : (
        <View>
          {items.map((item, i) => (
            <TimelineItem
              key={item.id}
              item={item}
              isLast={i === items.length - 1}
            />
          ))}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.5,
    color: Colors.textMuted,
    marginBottom: 12,
  },
  empty: {
    color: Colors.textMuted,
    fontSize: 14,
    fontStyle: 'italic',
  },
});
