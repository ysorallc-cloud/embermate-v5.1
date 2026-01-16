// ============================================================================
// CALENDAR SCREEN - Month-at-a-glance with daily timeline view
// ============================================================================

import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Colors } from './_theme/theme-tokens';
import { CalendarGrid } from '../components/calendar/CalendarGrid';
import { DayTimeline } from '../components/calendar/DayTimeline';
import { useCalendarData } from '../hooks/useCalendarData';
import { format, addMonths, subMonths } from 'date-fns';

export default function CalendarScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();

  // Initialize with selected date from params (from Tomorrow row) or today
  const initialDate = params.selectedDate
    ? new Date(params.selectedDate as string)
    : new Date();

  const [currentMonth, setCurrentMonth] = useState(initialDate);
  const [selectedDate, setSelectedDate] = useState(initialDate);

  const { calendarDays, daySchedule } = useCalendarData(currentMonth, selectedDate);

  const handlePrevMonth = () => setCurrentMonth(prev => subMonths(prev, 1));
  const handleNextMonth = () => setCurrentMonth(prev => addMonths(prev, 1));

  const handleDayPress = (date: Date) => {
    setSelectedDate(date);
    // If selecting a day in different month, also change month view
    if (date.getMonth() !== currentMonth.getMonth()) {
      setCurrentMonth(date);
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
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backButtonText}>←</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Calendar</Text>
          <View style={styles.backButton} />
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Month Header */}
          <View style={styles.monthHeader}>
            <TouchableOpacity onPress={handlePrevMonth}>
              <Text style={styles.navArrow}>←</Text>
            </TouchableOpacity>

            <Text style={styles.monthTitle}>
              {format(currentMonth, 'MMMM yyyy')}
            </Text>

            <TouchableOpacity onPress={handleNextMonth}>
              <Text style={styles.navArrow}>→</Text>
            </TouchableOpacity>
          </View>

          {/* Calendar Grid */}
          <CalendarGrid
            days={calendarDays}
            selectedDate={selectedDate}
            onDayPress={handleDayPress}
          />

          {/* Legend */}
          <View style={styles.legend}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: Colors.accent }]} />
              <Text style={styles.legendText}>Tasks</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: Colors.gold }]} />
              <Text style={styles.legendText}>Appointment</Text>
            </View>
          </View>

          {/* Selected Day Timeline */}
          <DayTimeline
            date={selectedDate}
            items={daySchedule}
          />

          <View style={{ height: 40 }} />
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
  },
  monthHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  navArrow: {
    fontSize: 18,
    color: Colors.textMuted,
    padding: 8,
  },
  monthTitle: {
    fontSize: 20,
    fontWeight: '500',
    color: Colors.textPrimary,
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    marginHorizontal: 20,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: 11,
    color: Colors.textMuted,
  },
});
