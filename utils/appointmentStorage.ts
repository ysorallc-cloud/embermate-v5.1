// ============================================================================
// APPOINTMENT STORAGE UTILITIES
// AsyncStorage CRUD operations for appointments
// ============================================================================

import AsyncStorage from '@react-native-async-storage/async-storage';
import { scheduleOneTimeNotification } from './notificationService';
import { safeGetItem, safeSetItem } from './safeStorage';
import { generateUniqueId } from './idGenerator';
import { devLog, logError } from './devLog';

export interface Appointment {
  id: string;
  title?: string;
  provider: string;
  specialty: string;
  date: string; // ISO date string
  time: string; // HH:MM format
  location: string;
  notes?: string;
  hasBrief: boolean;
  completed: boolean;
  cancelled: boolean;
  createdAt: string;
  reminderEnabled?: boolean;
}

const APPOINTMENTS_KEY = '@embermate_appointments';

// ============================================================================
// CRUD OPERATIONS
// ============================================================================

/**
 * Get all appointments
 */
export async function getAppointments(): Promise<Appointment[]> {
  try {
    const appointments = await safeGetItem<Appointment[]>(APPOINTMENTS_KEY, []);

    // If empty, return default appointments for first-time users
    if (appointments.length === 0) {
      const hasSeenOnboarding = await AsyncStorage.getItem('@embermate_onboarding_complete');
      if (!hasSeenOnboarding) {
        return getDefaultAppointments();
      }
    }

    return appointments;
  } catch (error) {
    logError('appointmentStorage.getAppointments', error);
    return [];
  }
}

/**
 * Get a single appointment by ID
 */
export async function getAppointment(id: string): Promise<Appointment | null> {
  try {
    const appointments = await getAppointments();
    return appointments.find(a => a.id === id) || null;
  } catch (error) {
    logError('appointmentStorage.getAppointment', error);
    return null;
  }
}

/**
 * Get upcoming appointments (not completed or cancelled)
 */
export async function getUpcomingAppointments(): Promise<Appointment[]> {
  try {
    const appointments = await getAppointments();
    const now = new Date();
    
    return appointments
      .filter(a => !a.completed && !a.cancelled)
      .filter(a => new Date(a.date) >= now)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  } catch (error) {
    logError('appointmentStorage.getUpcomingAppointments', error);
    return [];
  }
}

/**
 * Get appointments for a specific date
 */
export async function getAppointmentsByDate(date: Date): Promise<Appointment[]> {
  try {
    const appointments = await getAppointments();
    const targetDate = date.toISOString().split('T')[0];
    
    return appointments.filter(a => {
      const appointmentDate = new Date(a.date).toISOString().split('T')[0];
      return appointmentDate === targetDate && !a.cancelled;
    });
  } catch (error) {
    logError('appointmentStorage.getAppointmentsByDate', error);
    return [];
  }
}

/**
 * Create a new appointment
 */
export async function createAppointment(
  appointment: Omit<Appointment, 'id' | 'createdAt'>
): Promise<Appointment> {
  try {
    const appointments = await getAppointments();
    const newAppointment: Appointment = {
      ...appointment,
      id: generateUniqueId(),
      createdAt: new Date().toISOString(),
    };
    appointments.push(newAppointment);

    const success = await safeSetItem(APPOINTMENTS_KEY, appointments);

    if (!success) {
      throw new Error('Failed to save appointment to storage');
    }

    // Schedule notifications for the appointment
    await scheduleAppointmentNotifications(newAppointment);

    return newAppointment;
  } catch (error) {
    logError('appointmentStorage.createAppointment', error);
    throw error;
  }
}

/**
 * Update an appointment
 */
export async function updateAppointment(
  id: string,
  updates: Partial<Appointment>
): Promise<Appointment | null> {
  try {
    const appointments = await getAppointments();
    const index = appointments.findIndex(a => a.id === id);
    
    if (index === -1) {
      return null;
    }
    
    appointments[index] = { ...appointments[index], ...updates };
    await AsyncStorage.setItem(APPOINTMENTS_KEY, JSON.stringify(appointments));
    return appointments[index];
  } catch (error) {
    logError('appointmentStorage.updateAppointment', error);
    return null;
  }
}

/**
 * Cancel an appointment
 */
export async function cancelAppointment(id: string): Promise<boolean> {
  try {
    return (await updateAppointment(id, { cancelled: true })) !== null;
  } catch (error) {
    logError('appointmentStorage.cancelAppointment', error);
    return false;
  }
}

/**
 * Mark appointment as completed
 */
export async function completeAppointment(id: string): Promise<boolean> {
  try {
    return (await updateAppointment(id, { completed: true })) !== null;
  } catch (error) {
    logError('appointmentStorage.completeAppointment', error);
    return false;
  }
}

/**
 * Delete an appointment (hard delete)
 */
export async function deleteAppointment(id: string): Promise<boolean> {
  try {
    const appointments = await getAppointments();
    const filtered = appointments.filter(a => a.id !== id);
    
    if (filtered.length === appointments.length) {
      return false; // Nothing was deleted
    }
    
    await AsyncStorage.setItem(APPOINTMENTS_KEY, JSON.stringify(filtered));
    return true;
  } catch (error) {
    logError('appointmentStorage.deleteAppointment', error);
    return false;
  }
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Calculate days until an appointment
 */
export function getDaysUntil(appointment: Appointment): number {
  const now = new Date();
  const appointmentDate = new Date(appointment.date);
  const diff = appointmentDate.getTime() - now.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

/**
 * Get next appointment
 */
export async function getNextAppointment(): Promise<Appointment | null> {
  try {
    const upcoming = await getUpcomingAppointments();
    return upcoming.length > 0 ? upcoming[0] : null;
  } catch (error) {
    logError('appointmentStorage.getNextAppointment', error);
    return null;
  }
}

/**
 * Count upcoming appointments
 */
export async function countUpcomingAppointments(): Promise<number> {
  try {
    const upcoming = await getUpcomingAppointments();
    return upcoming.length;
  } catch (error) {
    logError('appointmentStorage.countUpcomingAppointments', error);
    return 0;
  }
}

// ============================================================================
// RESET & DEFAULTS
// ============================================================================

/**
 * Reset appointments to default (for demo/testing)
 */
export async function resetAppointments(): Promise<void> {
  try {
    const defaults = getDefaultAppointments();
    await AsyncStorage.setItem(APPOINTMENTS_KEY, JSON.stringify(defaults));
  } catch (error) {
    logError('appointmentStorage.resetAppointments', error);
  }
}

/**
 * Default appointments for initial setup
 */
function getDefaultAppointments(): Appointment[] {
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 3);
  
  const nextWeek = new Date(now);
  nextWeek.setDate(now.getDate() + 17);
  
  const threeWeeks = new Date(now);
  threeWeeks.setDate(now.getDate() + 20);
  
  return [
    {
      id: '1',
      provider: 'Dr. Chen',
      specialty: 'Cardiology',
      date: tomorrow.toISOString(),
      time: '14:00',
      location: 'Valley Medical Center',
      hasBrief: true,
      completed: false,
      cancelled: false,
      createdAt: now.toISOString(),
      notes: 'Follow-up for blood pressure management',
    },
    {
      id: '2',
      provider: 'Dr. Martinez',
      specialty: 'Primary Care',
      date: nextWeek.toISOString(),
      time: '10:30',
      location: 'Family Health Clinic',
      hasBrief: false,
      completed: false,
      cancelled: false,
      createdAt: now.toISOString(),
      notes: 'Annual wellness check',
    },
    {
      id: '3',
      provider: 'Valley Home Health',
      specialty: 'Physical Therapy',
      date: threeWeeks.toISOString(),
      time: '15:00',
      location: 'Home Visit',
      hasBrief: false,
      completed: false,
      cancelled: false,
      createdAt: now.toISOString(),
      notes: 'Mobility assessment and exercises',
    },
  ];
}

/**
 * Format appointment date for display
 */
export function formatAppointmentDate(appointment: Appointment): string {
  const date = new Date(appointment.date);
  return date.toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric' 
  });
}

/**
 * Format appointment time for display
 */
export function formatAppointmentTime(time: string): string {
  const [hours, minutes] = time.split(':');
  const hour = parseInt(hours, 10);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour % 12 || 12;
  return `${displayHour}:${minutes} ${ampm}`;
}

// ============================================================================
// APPOINTMENT NOTIFICATIONS
// ============================================================================

/**
 * Schedule notifications for an appointment
 * Creates two notifications: 1 day before and 1 hour before
 */
async function scheduleAppointmentNotifications(appointment: Appointment): Promise<void> {
  try {
    const appointmentDate = new Date(appointment.date);
    const [hours, minutes] = appointment.time.split(':').map(Number);
    appointmentDate.setHours(hours, minutes, 0, 0);
    
    // Only schedule if appointment is in the future
    if (appointmentDate <= new Date()) {
      return;
    }
    
    // Notification 1: 1 day before at 9 AM
    const oneDayBefore = new Date(appointmentDate);
    oneDayBefore.setDate(oneDayBefore.getDate() - 1);
    oneDayBefore.setHours(9, 0, 0, 0);
    
    if (oneDayBefore > new Date()) {
      await scheduleOneTimeNotification(
        '📅 Appointment Tomorrow',
        `${appointment.specialty} with Dr. ${appointment.provider} at ${formatAppointmentTime(appointment.time)}`,
        oneDayBefore,
        {
          type: 'appointment_reminder',
          appointmentId: appointment.id,
          timing: '1_day_before',
        },
        'appointment' // Enable quick actions
      );
    }
    
    // Notification 2: 1 hour before
    const oneHourBefore = new Date(appointmentDate);
    oneHourBefore.setHours(oneHourBefore.getHours() - 1);
    
    if (oneHourBefore > new Date()) {
      await scheduleOneTimeNotification(
        '📅 Appointment in 1 Hour',
        `${appointment.specialty} with Dr. ${appointment.provider}${appointment.location ? ' at ' + appointment.location : ''}`,
        oneHourBefore,
        {
          type: 'appointment_reminder',
          appointmentId: appointment.id,
          timing: '1_hour_before',
        },
        'appointment' // Enable quick actions
      );
    }
    
    devLog(`Scheduled notifications for appointment: ${appointment.specialty}`);
  } catch (error) {
    logError('appointmentStorage.scheduleAppointmentNotifications', error);
  }
}

/**
 * Schedule notifications for all upcoming appointments
 */
export async function scheduleAllAppointmentNotifications(): Promise<void> {
  try {
    const appointments = await getUpcomingAppointments();
    
    for (const appointment of appointments) {
      await scheduleAppointmentNotifications(appointment);
    }
    
    devLog(`Scheduled notifications for ${appointments.length} appointments`);
  } catch (error) {
    logError('appointmentStorage.scheduleAllAppointmentNotifications', error);
  }
}

