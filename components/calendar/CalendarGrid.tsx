// ============================================================================
// CALENDAR GRID - Month view with day selection
// ============================================================================

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { CalendarDay } from '@/types/calendar';
import { Colors } from '@/theme/theme-tokens';
import { isSameDay } from 'date-fns';

const DAYS_OF_WEEK = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

interface Props {
  days: CalendarDay[];
  selectedDate: Date;
  onDayPress: (date: Date) => void;
}

export const CalendarGrid: React.FC<Props> = ({ days, selectedDate, onDayPress }) => {
  const today = new Date();

  return (
    <View style={styles.container}>
      {/* Day headers */}
      <View style={styles.row}>
        {DAYS_OF_WEEK.map((day, i) => (
          <View key={i} style={styles.cell}>
            <Text style={styles.dayHeader}>{day}</Text>
          </View>
        ))}
      </View>

      {/* Calendar days */}
      <View style={styles.grid}>
        {days.map((day, i) => {
          const isSelected = isSameDay(day.date, selectedDate);
          const isToday = isSameDay(day.date, today);

          return (
            <TouchableOpacity
              key={i}
              style={[
                styles.cell,
                styles.dayCell,
                isSelected && styles.selectedCell,
                isToday && !isSelected && styles.todayCell,
              ]}
              onPress={() => onDayPress(day.date)}
              activeOpacity={0.7}
              accessibilityLabel={`${day.date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}${day.hasItems ? ', has events' : ''}${isToday ? ', today' : ''}`}
              accessibilityRole="button"
              accessibilityState={{ selected: isSelected }}
            >
              <Text style={[
                styles.dayNumber,
                !day.isCurrentMonth && styles.otherMonth,
                isSelected && styles.selectedText,
                isToday && !isSelected && styles.todayText,
              ]}>
                {day.date.getDate()}
              </Text>

              {/* Indicator dots */}
              {day.isCurrentMonth && day.hasItems && (
                <View style={styles.dots}>
                  {day.hasAppointment && (
                    <View style={[
                      styles.dot,
                      { backgroundColor: isSelected ? '#fff' : Colors.gold }
                    ]} />
                  )}
                  <View style={[
                    styles.dot,
                    { backgroundColor: isSelected ? '#fff' : Colors.accent }
                  ]} />
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 12,
  },
  row: {
    flexDirection: 'row',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  cell: {
    width: '14.28%',  // 100% / 7 days
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  dayHeader: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.textMuted,
  },
  dayCell: {
    aspectRatio: 1,
    borderRadius: 8,
  },
  selectedCell: {
    backgroundColor: Colors.accent,
  },
  todayCell: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.accent,
  },
  dayNumber: {
    fontSize: 14,
    color: Colors.textPrimary,
  },
  otherMonth: {
    opacity: 0.3,
  },
  selectedText: {
    color: '#fff',
    fontWeight: '600',
  },
  todayText: {
    color: Colors.accent,
    fontWeight: '600',
  },
  dots: {
    flexDirection: 'row',
    gap: 2,
    marginTop: 2,
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
  },
});
