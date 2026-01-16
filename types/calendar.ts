// ============================================================================
// CALENDAR TYPES
// Type definitions for appointments and calendar events
// ============================================================================

export type AppointmentType =
  | 'doctor'
  | 'lab'
  | 'pharmacy'
  | 'hospital'
  | 'therapy'
  | 'other';

export interface ReminderTime {
  type: 'days_before' | 'hours_before' | 'minutes_before';
  value: number;
  notificationTime?: string; // Specific time for day-before reminders (HH:mm format)
}

export interface Appointment {
  id: string;
  odId?: string; // Care recipient ID
  type: AppointmentType;
  providerName: string;
  title?: string; // Optional custom title
  date: string; // ISO date string (yyyy-MM-dd)
  time: string; // HH:mm format
  location?: string;
  notes?: string;
  reminderEnabled: boolean;
  reminderTimes: ReminderTime[];
  status: 'upcoming' | 'completed' | 'cancelled';
  createdAt: string;
  updatedAt: string;
  createdBy?: string; // Caregiver ID
}

export interface CalendarEvent {
  id: string;
  odId?: string; // Care recipient ID
  title: string;
  date: string; // ISO date string (yyyy-MM-dd)
  time?: string; // Optional, all-day if not set (HH:mm format)
  endTime?: string; // Optional end time (HH:mm format)
  location?: string;
  notes?: string;
  reminderEnabled: boolean;
  reminderTimes: ReminderTime[];
  status: 'upcoming' | 'completed' | 'cancelled';
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
}

export type CalendarItem =
  | { type: 'appointment'; data: Appointment }
  | { type: 'event'; data: CalendarEvent };

// Calendar View Types
import { TimelineItem } from './timeline';

export interface CalendarDay {
  date: Date;
  isToday: boolean;
  isSelected: boolean;
  isCurrentMonth: boolean;
  hasItems: boolean;
  hasAppointment: boolean;
  itemCount: number;
}

export interface CalendarMonth {
  year: number;
  month: number;              // 0-indexed
  days: CalendarDay[];
}

export interface DaySchedule {
  date: Date;
  items: TimelineItem[];      // Same as Today timeline
}
