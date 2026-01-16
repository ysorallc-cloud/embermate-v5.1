// ============================================================================
// USE CALENDAR DATA HOOK
// Builds calendar days and day schedules for calendar view
// ============================================================================

import { useMemo, useEffect, useState } from 'react';
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  setHours,
  setMinutes,
  format,
} from 'date-fns';
import { useWellnessSettings } from './useWellnessSettings';
import { getTimelineWithStatuses } from '../utils/timelineStatus';
import { getSubtitle } from '../utils/timelineSubtitle';
import { CalendarDay } from '../types/calendar';
import { TimelineItem } from '../types/timeline';
import { getMedications, Medication } from '../utils/medicationStorage';
import { getUpcomingAppointments, Appointment } from '../utils/appointmentStorage';
import { getMorningWellness, getEveningWellness } from '../utils/wellnessCheckStorage';
import { getVitalsCompletionForDate } from '../utils/vitalsStorage';

export const useCalendarData = (currentMonth: Date, selectedDate: Date) => {
  const { wellnessChecks, vitalsCheck } = useWellnessSettings();
  const [medications, setMedications] = useState<Medication[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [morningWellnessComplete, setMorningWellnessComplete] = useState<Date | null>(null);
  const [eveningWellnessComplete, setEveningWellnessComplete] = useState<Date | null>(null);
  const [vitalsComplete, setVitalsComplete] = useState<Date | null>(null);

  // Load medications and appointments
  useEffect(() => {
    const loadData = async () => {
      try {
        const meds = await getMedications();
        setMedications(meds.filter(m => m.active));

        const appts = await getUpcomingAppointments();
        setAppointments(appts);
      } catch (error) {
        console.error('Error loading calendar data:', error);
      }
    };

    loadData();
  }, []);

  // Load wellness check and vitals completion status for selected date
  useEffect(() => {
    const loadCompletionStatus = async () => {
      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      const morning = await getMorningWellness(dateStr);
      const evening = await getEveningWellness(dateStr);
      const vitalsCompletion = await getVitalsCompletionForDate(dateStr);

      setMorningWellnessComplete(morning ? morning.completedAt : null);
      setEveningWellnessComplete(evening ? evening.completedAt : null);
      setVitalsComplete(vitalsCompletion);
    };

    loadCompletionStatus();
  }, [selectedDate]);

  // Generate calendar days for the month view (including overflow days)
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const calendarStart = startOfWeek(monthStart);
    const calendarEnd = endOfWeek(monthEnd);

    const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

    return days.map(date => {
      const dateStr = format(date, 'yyyy-MM-dd');
      const isCurrentMonth = isSameMonth(date, currentMonth);

      // Check for medications (every day has morning/evening if there are any active meds)
      const hasMeds = medications.length > 0;

      // Check for appointments on this day
      const hasAppt = appointments.some(appt => {
        const apptDate = new Date(appt.date);
        return isSameDay(apptDate, date);
      });

      // Every day has at least 2 items (morning + evening wellness)
      // Add 2 if there are meds (morning + evening)
      const baseCount = 2; // wellness checks
      const medCount = hasMeds ? 2 : 0; // morning + evening meds
      const apptCount = appointments.filter(appt => {
        const apptDate = new Date(appt.date);
        return isSameDay(apptDate, date);
      }).length;

      const itemCount = baseCount + medCount + apptCount;

      return {
        date,
        isToday: isSameDay(date, new Date()),
        isSelected: isSameDay(date, selectedDate),
        isCurrentMonth,
        hasItems: itemCount > 0,
        hasAppointment: hasAppt,
        itemCount,
      } as CalendarDay;
    });
  }, [currentMonth, selectedDate, medications, appointments]);

  // Get schedule for selected day
  const daySchedule = useMemo(() => {
    const items: TimelineItem[] = [];
    const dateStr = format(selectedDate, 'yyyy-MM-dd');

    // Morning wellness check (always present)
    const [morningHours, morningMinutes] = wellnessChecks.morning.time
      .split(':')
      .map(Number);
    const morningTime = setMinutes(setHours(selectedDate, morningHours), morningMinutes);

    items.push({
      id: `wellness-morning-${dateStr}`,
      type: 'wellness-morning',
      scheduledTime: morningTime,
      completedTime: morningWellnessComplete,
      title: 'Morning wellness check',
      subtitle: '',
      status: 'upcoming',
      wellnessChecks: wellnessChecks.morning.checks,
    });

    // Morning medications (if any active meds)
    const morningMeds = medications.filter(m => m.timeSlot === 'morning');
    if (morningMeds.length > 0) {
      const medTime = setMinutes(setHours(selectedDate, 8), 0);
      items.push({
        id: `med-morning-${dateStr}`,
        type: 'medication',
        scheduledTime: medTime,
        completedTime: undefined,
        title: 'Morning medications',
        subtitle: '',
        status: 'upcoming',
        medicationIds: morningMeds.map(m => m.id),
      });
    }

    // Vitals check (if enabled)
    if (vitalsCheck.enabled) {
      const [hours, minutes] = vitalsCheck.time.split(':').map(Number);
      const vitalsTime = setMinutes(setHours(selectedDate, hours), minutes);

      items.push({
        id: `vitals-${dateStr}`,
        type: 'vitals',
        scheduledTime: vitalsTime,
        completedTime: vitalsComplete,
        title: 'Vitals',
        subtitle: '',
        status: 'upcoming',
        vitalTypes: vitalsCheck.types,
      });
    }

    // Evening medications (if any active meds)
    const eveningMeds = medications.filter(m => m.timeSlot === 'evening');
    if (eveningMeds.length > 0) {
      const medTime = setMinutes(setHours(selectedDate, 18), 0);
      items.push({
        id: `med-evening-${dateStr}`,
        type: 'medication',
        scheduledTime: medTime,
        completedTime: undefined,
        title: 'Evening medications',
        subtitle: '',
        status: 'upcoming',
        medicationIds: eveningMeds.map(m => m.id),
      });
    }

    // Appointments on this day
    appointments
      .filter(appt => {
        const apptDate = new Date(appt.date);
        return isSameDay(apptDate, selectedDate);
      })
      .forEach(appt => {
        const [hours, minutes] = (appt.time || '12:00').split(':').map(Number);
        const scheduledTime = setMinutes(setHours(selectedDate, hours), minutes);

        items.push({
          id: `apt-${appt.id}`,
          type: 'appointment',
          scheduledTime,
          completedTime: undefined,
          title: `${appt.provider} — ${appt.specialty}`,
          subtitle: appt.location || '',
          status: 'upcoming',
          appointmentId: appt.id,
        });
      });

    // Evening wellness check (always present)
    const [eveningHours, eveningMinutes] = wellnessChecks.evening.time
      .split(':')
      .map(Number);
    const eveningTime = setMinutes(setHours(selectedDate, eveningHours), eveningMinutes);

    items.push({
      id: `wellness-evening-${dateStr}`,
      type: 'wellness-evening',
      scheduledTime: eveningTime,
      completedTime: eveningWellnessComplete,
      title: 'Evening wellness check',
      subtitle: '',
      status: 'upcoming',
      wellnessChecks: wellnessChecks.evening.checks,
    });

    // Sort by scheduled time and calculate statuses
    const withStatuses = getTimelineWithStatuses(items, new Date());

    // Calculate subtitles
    return withStatuses.map(item => ({
      ...item,
      subtitle: getSubtitle(item, new Date()),
    }));
  }, [selectedDate, medications, appointments, wellnessChecks, vitalsCheck, morningWellnessComplete, eveningWellnessComplete, vitalsComplete]);

  return { calendarDays, daySchedule };
};
