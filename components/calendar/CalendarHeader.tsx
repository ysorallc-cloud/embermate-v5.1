// ============================================================================
// CALENDAR HEADER - Month navigation
// ============================================================================

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { format } from 'date-fns';
import { Colors } from '../../theme/theme-tokens';

interface CalendarHeaderProps {
  currentMonth: Date;
  onPrevious: () => void;
  onNext: () => void;
}

export function CalendarHeader({ currentMonth, onPrevious, onNext }: CalendarHeaderProps) {
  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.navButton}
        onPress={onPrevious}
        accessibilityLabel="Previous month"
        accessibilityRole="button"
      >
        <Text style={styles.navButtonText}>‹</Text>
      </TouchableOpacity>

      <Text style={styles.monthYear}>{format(currentMonth, 'MMMM yyyy')}</Text>

      <TouchableOpacity
        style={styles.navButton}
        onPress={onNext}
        accessibilityLabel="Next month"
        accessibilityRole="button"
      >
        <Text style={styles.navButtonText}>›</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
  },
  navButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navButtonText: {
    fontSize: 28,
    color: Colors.textPrimary,
    fontWeight: '300',
  },
  monthYear: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.textPrimary,
  },
});
