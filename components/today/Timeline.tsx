// ============================================================================
// TIMELINE - Container for timeline items on TODAY screen
// ============================================================================

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { TimelineItem as TimelineItemComponent } from './TimelineItem';
import { TomorrowRow } from './TomorrowRow';
import { TimelineItem } from '../../types/timeline';
import { Colors } from '../../app/_theme/theme-tokens';

interface TimelineProps {
  items: TimelineItem[];
  tomorrowCount?: number;
}

export const Timeline: React.FC<TimelineProps> = ({ items, tomorrowCount = 0 }) => {
  if (items.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      <Text style={styles.label}>TODAY</Text>

      <View style={styles.list}>
        {items.map((item, index) => (
          <TimelineItemComponent
            key={item.id}
            item={item}
            isLast={false}
          />
        ))}

        {/* Tomorrow row always shown */}
        {tomorrowCount > 0 && <TomorrowRow itemCount={tomorrowCount} />}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 24,
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.5,
    color: Colors.textMuted,
    marginBottom: 12,
  },
  list: {},
});
