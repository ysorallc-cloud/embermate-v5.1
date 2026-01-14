// ============================================================================
// CALENDAR MODAL
// Month view calendar with appointment dots
// ============================================================================

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Spacing, BorderRadius } from './_theme/theme-tokens';
import { getAppointments, Appointment } from '../utils/appointmentStorage';

const DAYS_OF_WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export default function CalendarModal() {
  const router = useRouter();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);

  useEffect(() => {
    loadAppointments();
  }, []);

  const loadAppointments = async () => {
    try {
      const appts = await getAppointments();
      setAppointments(appts);
    } catch (error) {
      console.error('Error loading appointments:', error);
    }
  };

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    return new Date(year, month, 1).getDay();
  };

  const hasAppointmentOnDate = (date: Date) => {
    return appointments.some(appt => {
      if (!appt.dateTime) return false;
      const apptDate = new Date(appt.dateTime);
      return (
        apptDate.getDate() === date.getDate() &&
        apptDate.getMonth() === date.getMonth() &&
        apptDate.getFullYear() === date.getFullYear()
      );
    });
  };

  const getAppointmentsForDate = (date: Date) => {
    return appointments.filter(appt => {
      if (!appt.dateTime) return false;
      const apptDate = new Date(appt.dateTime);
      return (
        apptDate.getDate() === date.getDate() &&
        apptDate.getMonth() === date.getMonth() &&
        apptDate.getFullYear() === date.getFullYear()
      );
    });
  };

  const renderCalendarDays = () => {
    const daysInMonth = getDaysInMonth(currentDate);
    const firstDay = getFirstDayOfMonth(currentDate);
    const days = [];
    const today = new Date();

    // Empty cells for days before month starts
    for (let i = 0; i < firstDay; i++) {
      days.push(<View key={`empty-${i}`} style={styles.dayCell} />);
    }

    // Days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
      const isToday =
        date.getDate() === today.getDate() &&
        date.getMonth() === today.getMonth() &&
        date.getFullYear() === today.getFullYear();
      const isSelected = selectedDate &&
        date.getDate() === selectedDate.getDate() &&
        date.getMonth() === selectedDate.getMonth() &&
        date.getFullYear() === selectedDate.getFullYear();
      const hasAppt = hasAppointmentOnDate(date);

      days.push(
        <TouchableOpacity
          key={`day-${day}`}
          style={[
            styles.dayCell,
            isToday && styles.todayCell,
            isSelected && styles.selectedCell,
          ]}
          onPress={() => setSelectedDate(date)}
          activeOpacity={0.7}
        >
          <Text
            style={[
              styles.dayText,
              isToday && styles.todayText,
              isSelected && styles.selectedText,
            ]}
          >
            {day}
          </Text>
          {hasAppt && (
            <View style={styles.appointmentDot} />
          )}
        </TouchableOpacity>
      );
    }

    return days;
  };

  const goToPreviousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const goToNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const goToToday = () => {
    const today = new Date();
    setCurrentDate(today);
    setSelectedDate(today);
  };

  const selectedAppts = selectedDate ? getAppointmentsForDate(selectedDate) : [];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <LinearGradient
        colors={[Colors.backgroundGradientStart, Colors.backgroundGradientEnd]}
        style={styles.gradient}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Calendar</Text>
          <TouchableOpacity onPress={() => router.back()} style={styles.closeButton}>
            <Ionicons name="close" size={28} color={Colors.textPrimary} />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
          {/* Month Navigation */}
          <View style={styles.monthNav}>
            <TouchableOpacity onPress={goToPreviousMonth} style={styles.navButton}>
              <Ionicons name="chevron-back" size={24} color={Colors.textPrimary} />
            </TouchableOpacity>

            <TouchableOpacity onPress={goToToday} style={styles.monthButton}>
              <Text style={styles.monthText}>
                {MONTHS[currentDate.getMonth()]} {currentDate.getFullYear()}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={goToNextMonth} style={styles.navButton}>
              <Ionicons name="chevron-forward" size={24} color={Colors.textPrimary} />
            </TouchableOpacity>
          </View>

          {/* Calendar Grid */}
          <View style={styles.calendarContainer}>
            {/* Day headers */}
            <View style={styles.weekRow}>
              {DAYS_OF_WEEK.map(day => (
                <View key={day} style={styles.dayHeader}>
                  <Text style={styles.dayHeaderText}>{day}</Text>
                </View>
              ))}
            </View>

            {/* Calendar days */}
            <View style={styles.daysGrid}>
              {renderCalendarDays()}
            </View>
          </View>

          {/* Selected Date Info */}
          {selectedDate && (
            <View style={styles.selectedDateSection}>
              <Text style={styles.selectedDateTitle}>
                {selectedDate.toLocaleDateString('en-US', {
                  weekday: 'long',
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric'
                })}
              </Text>

              {selectedAppts.length > 0 ? (
                <View style={styles.appointmentsList}>
                  {selectedAppts.map(appt => (
                    <View key={appt.id} style={styles.appointmentCard}>
                      <Text style={styles.apptTime}>{appt.time}</Text>
                      <Text style={styles.apptProvider}>{appt.provider}</Text>
                      {appt.specialty && (
                        <Text style={styles.apptSpecialty}>{appt.specialty}</Text>
                      )}
                      {appt.location && (
                        <Text style={styles.apptLocation}>📍 {appt.location}</Text>
                      )}
                    </View>
                  ))}
                </View>
              ) : (
                <View style={styles.noAppointments}>
                  <Text style={styles.noAppointmentsText}>No appointments</Text>
                </View>
              )}
            </View>
          )}

          {/* Quick Stats */}
          <View style={styles.statsSection}>
            <Text style={styles.statsTitle}>Appointments This Month</Text>
            <Text style={styles.statsValue}>
              {appointments.filter(appt => {
                if (!appt.dateTime) return false;
                const apptDate = new Date(appt.dateTime);
                return apptDate.getMonth() === currentDate.getMonth() &&
                       apptDate.getFullYear() === currentDate.getFullYear();
              }).length}
            </Text>
          </View>

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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.lg,
  },
  title: {
    fontSize: 28,
    fontWeight: '300',
    color: Colors.textPrimary,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scroll: {
    flex: 1,
    paddingHorizontal: Spacing.xl,
  },

  // Month Navigation
  monthNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.xl,
  },
  navButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthButton: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
  },
  monthText: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.textPrimary,
  },

  // Calendar Grid
  calendarContainer: {
    backgroundColor: Colors.surfaceElevated,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.xl,
  },
  weekRow: {
    flexDirection: 'row',
    marginBottom: Spacing.sm,
  },
  dayHeader: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing.xs,
  },
  dayHeaderText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textTertiary,
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCell: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 4,
  },
  todayCell: {
    backgroundColor: 'rgba(255, 140, 148, 0.15)',
    borderRadius: BorderRadius.sm,
  },
  selectedCell: {
    backgroundColor: Colors.accent,
    borderRadius: BorderRadius.sm,
  },
  dayText: {
    fontSize: 14,
    color: Colors.textPrimary,
  },
  todayText: {
    color: Colors.accent,
    fontWeight: '600',
  },
  selectedText: {
    color: Colors.background,
    fontWeight: '600',
  },
  appointmentDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.accent,
    marginTop: 2,
  },

  // Selected Date Info
  selectedDateSection: {
    backgroundColor: Colors.surfaceElevated,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.xl,
  },
  selectedDateTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: Spacing.md,
  },
  appointmentsList: {
    gap: Spacing.sm,
  },
  appointmentCard: {
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    borderLeftWidth: 3,
    borderLeftColor: Colors.accent,
  },
  apptTime: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.accent,
    marginBottom: 4,
  },
  apptProvider: {
    fontSize: 15,
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  apptSpecialty: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginBottom: 2,
  },
  apptLocation: {
    fontSize: 13,
    color: Colors.textTertiary,
  },
  noAppointments: {
    paddingVertical: Spacing.lg,
    alignItems: 'center',
  },
  noAppointmentsText: {
    fontSize: 14,
    color: Colors.textTertiary,
    fontStyle: 'italic',
  },

  // Stats Section
  statsSection: {
    backgroundColor: Colors.surfaceElevated,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    alignItems: 'center',
  },
  statsTitle: {
    fontSize: 13,
    color: Colors.textTertiary,
    textTransform: 'uppercase',
    marginBottom: Spacing.xs,
  },
  statsValue: {
    fontSize: 32,
    fontWeight: '600',
    color: Colors.accent,
  },
});
