// ============================================================================
// TIMELINE TYPES
// Type definitions for timeline items on TODAY screen
// ============================================================================

export type TimelineItemStatus = 'done' | 'next' | 'upcoming' | 'overdue';

export type TimelineItemType =
  | 'medication'
  | 'appointment'
  | 'wellness-morning'
  | 'wellness-evening'
  | 'vitals'
  | 'event';

export interface TimelineItem {
  id: string;
  type: TimelineItemType;
  scheduledTime: Date;          // When it's scheduled
  completedTime?: Date;         // When it was completed (if done)
  title: string;
  subtitle: string;             // Dynamic based on status
  status: TimelineItemStatus;

  // Type-specific data
  medicationIds?: string[];     // For medication type
  appointmentId?: string;       // For appointment type
  wellnessChecks?: string[];    // For wellness type: ['sleep', 'mood', 'energy']
  vitalTypes?: string[];        // For vitals type: ['bp', 'glucose']
}

// Wellness check data captured
export interface MorningWellnessData {
  sleepQuality: 1 | 2 | 3 | 4 | 5;      // 1=poor, 5=great
  mood: 'struggling' | 'difficult' | 'managing' | 'good' | 'great';
  energyLevel: 1 | 2 | 3 | 4 | 5;
  notes?: string;
  completedAt: Date;
}

export interface EveningWellnessData {
  mood: 'struggling' | 'difficult' | 'managing' | 'good' | 'great';
  mealsLogged: boolean;
  dayRating: 1 | 2 | 3 | 4 | 5;
  highlights?: string;
  concerns?: string;
  completedAt: Date;
}
