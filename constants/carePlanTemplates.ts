// ============================================================================
// CARE PLAN TEMPLATES
// Pre-built care plan configurations for common caregiving scenarios
// ============================================================================

import { BucketType, BucketPriority } from '../types/carePlanConfig';

// ============================================================================
// TYPES
// ============================================================================

export interface BucketSuggestion {
  priority?: BucketPriority;
  timesOfDay?: ('morning' | 'midday' | 'evening' | 'night')[];
  // Vitals-specific
  vitalTypes?: string[];
  frequency?: string;
  // Meals-specific
  trackingStyle?: 'quick' | 'detailed';
  // Water-specific
  dailyGoalGlasses?: number;
}

export interface CarePlanTemplate {
  id: string;
  name: string;
  description: string;
  emoji: string;
  enabledBuckets: BucketType[];
  suggestedSettings: Partial<Record<BucketType, BucketSuggestion>>;
}

// ============================================================================
// TEMPLATES
// ============================================================================

export const CARE_PLAN_TEMPLATES: CarePlanTemplate[] = [
  {
    id: 'elderly',
    name: 'Aging in Place',
    description: 'Medication adherence, vitals monitoring, nutrition, and appointment tracking for elderly care.',
    emoji: '\u{1F3E0}',
    enabledBuckets: ['meds', 'vitals', 'meals', 'wellness', 'appointments'],
    suggestedSettings: {
      meds: {
        priority: 'required',
        timesOfDay: ['morning', 'evening'],
      },
      vitals: {
        priority: 'required',
        timesOfDay: ['morning'],
        vitalTypes: ['bp', 'hr', 'weight'],
        frequency: 'daily',
      },
      meals: {
        priority: 'recommended',
        timesOfDay: ['morning', 'midday', 'evening'],
        trackingStyle: 'quick',
      },
      wellness: {
        priority: 'recommended',
        timesOfDay: ['morning', 'evening'],
      },
      appointments: {
        priority: 'recommended',
      },
    },
  },
  {
    id: 'post-surgical',
    name: 'Post-Surgical Recovery',
    description: 'Pain tracking, medication timing, activity progression, and vitals for post-op recovery.',
    emoji: '\u{1FA79}',
    enabledBuckets: ['meds', 'vitals', 'wellness', 'activity', 'meals'],
    suggestedSettings: {
      meds: {
        priority: 'required',
        timesOfDay: ['morning', 'midday', 'evening', 'night'],
      },
      vitals: {
        priority: 'required',
        timesOfDay: ['morning', 'evening'],
        vitalTypes: ['bp', 'hr', 'temp'],
        frequency: 'daily',
      },
      wellness: {
        priority: 'required',
        timesOfDay: ['morning', 'evening'],
      },
      activity: {
        priority: 'recommended',
        timesOfDay: ['morning', 'evening'],
      },
      meals: {
        priority: 'recommended',
        timesOfDay: ['morning', 'midday', 'evening'],
        trackingStyle: 'quick',
      },
    },
  },
  {
    id: 'chronic-illness',
    name: 'Chronic Illness',
    description: 'Medication management, vitals, wellness tracking, and care team coordination for chronic conditions.',
    emoji: '\u{1F4CB}',
    enabledBuckets: ['meds', 'vitals', 'wellness', 'appointments'],
    suggestedSettings: {
      meds: {
        priority: 'required',
        timesOfDay: ['morning', 'evening'],
      },
      vitals: {
        priority: 'recommended',
        timesOfDay: ['morning'],
        vitalTypes: ['bp', 'hr'],
        frequency: 'daily',
      },
      wellness: {
        priority: 'recommended',
        timesOfDay: ['morning', 'evening'],
      },
      appointments: {
        priority: 'required',
      },
    },
  },
  {
    id: 'general-wellness',
    name: 'General Wellness',
    description: 'Balanced daily tracking for nutrition, hydration, wellness, sleep, and activity.',
    emoji: '\u{2728}',
    enabledBuckets: ['meals', 'water', 'wellness', 'sleep', 'activity'],
    suggestedSettings: {
      meals: {
        priority: 'recommended',
        timesOfDay: ['morning', 'midday', 'evening'],
        trackingStyle: 'quick',
      },
      water: {
        priority: 'recommended',
        dailyGoalGlasses: 8,
      },
      wellness: {
        priority: 'recommended',
        timesOfDay: ['morning', 'evening'],
      },
      sleep: {
        priority: 'recommended',
        timesOfDay: ['morning'],
      },
      activity: {
        priority: 'optional',
        timesOfDay: ['evening'],
      },
    },
  },
];
