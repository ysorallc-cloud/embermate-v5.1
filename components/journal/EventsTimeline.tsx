// ============================================================================
// EVENTS TIMELINE — Phase 5.12.e.
//
// Flat time-anchored row presentation of the day's care events. No card
// chrome, no taps, no row interactions — Journal is read-only and the
// timeline is its visual record.
//
// Each row: time column (48pt fixed) + text column (flex 1). When a row's
// event matches a flag-severity entry in dayLevelChanges (per category
// mapping), the row text colours coral. The mapping mirrors what the
// 5.12.4a detectors consume:
//
//   change.category === 'vitals'   → vitals_recorded events on the day
//   change.category === 'meals'    → meal_logged events with refused === true
//   change.category === 'mood'     → mood_logged events on the day
//   change.category === 'symptoms' → symptom_reported events on the day (date-only;
//                                    symptom names are free-text in metadata)
//   change.category === 'sleep'    → sleep_logged events on the day; sleep flags
//                                    emit 'note' severity, so the row stays neutral
//
// Overflow past the first 5 rows collapses to a single muted summary line.
// ============================================================================

import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { Spacing } from '../../theme/theme-tokens';
import type { CareEvent, EventType } from '../../types/event';
import type {
  DayLevelChange,
  DayChangeCategory,
} from '../../services/dayLevelChanges';

interface EventsTimelineProps {
  events: CareEvent[];
  dayLevelChanges: DayLevelChange[];
}

const VISIBLE_ROW_CAP = 5;

// ============================================================================
// HELPERS
// ============================================================================

function formatTime(timestamp: string): string {
  const d = new Date(timestamp);
  let h = d.getHours();
  const m = d.getMinutes();
  const am = h < 12;
  if (h === 0) h = 12;
  else if (h > 12) h -= 12;
  return `${h}:${String(m).padStart(2, '0')}${am ? 'a' : 'p'}`;
}

function eventLabel(e: CareEvent): string {
  const meta = (e.metadata || {}) as Record<string, any>;
  switch (e.type) {
    case 'medication_taken':
      return meta.medicationName
        ? `${meta.medicationName}${meta.dosage ? ` ${meta.dosage}` : ''}`
        : 'Medication taken';
    case 'medication_skipped':
      return meta.medicationName ? `${meta.medicationName} skipped` : 'Medication skipped';
    case 'vitals_recorded':
      if (meta.systolic && meta.diastolic) {
        return meta.heartRate
          ? `BP ${meta.systolic}/${meta.diastolic} · HR ${meta.heartRate}`
          : `BP ${meta.systolic}/${meta.diastolic}`;
      }
      return 'Vitals recorded';
    case 'meal_logged': {
      const type = meta.mealType ? String(meta.mealType) : 'Meal';
      const cap = type.charAt(0).toUpperCase() + type.slice(1);
      const refused = meta.refused === true || (typeof meta.quality === 'string' && meta.quality.toLowerCase() === 'refused');
      if (refused) return `${cap} — refused`;
      if (meta.quality) return `${cap} — ${meta.quality}`;
      return cap;
    }
    case 'mood_logged':
      return meta.label ? `Mood: ${meta.label}` : meta.score ? `Mood ${meta.score}/5` : 'Mood logged';
    case 'symptom_reported':
      return meta.symptomName ? `Symptom: ${meta.symptomName}` : 'Symptom reported';
    case 'sleep_logged':
      return meta.hours ? `Slept ${meta.hours}h` : 'Sleep logged';
    case 'wellness_check':
      return 'Wellness check';
    case 'note_added':
      return 'Note added';
    case 'hydration_logged':
      return meta.glasses ? `${meta.glasses} glasses water` : 'Hydration';
    case 'bathroom_event':
      return 'Bathroom event';
    case 'activity_logged':
      return 'Activity';
    case 'appointment_logged':
      return 'Appointment';
    default:
      return 'Event';
  }
}

// Map event → DayChangeCategory if it could be flagged by a same-category
// change. `null` means the event has no cross-section linkage.
function eventCategory(e: CareEvent): DayChangeCategory | null {
  switch (e.type) {
    case 'vitals_recorded':  return 'vitals';
    case 'meal_logged':      return 'meals';
    case 'mood_logged':      return 'mood';
    case 'symptom_reported': return 'symptoms';
    case 'sleep_logged':     return 'sleep';
    default:                 return null;
  }
}

// Cross-section linkage: a row colours coral when its event maps to a
// 'flag'-severity change in the same category. Two refinements:
//   • Meals: only refused meal_logged events promote (matching what the
//     4a detector treats as the trigger).
//   • Sleep: even if a sleep change exists, it emits 'note' severity per
//     spec, so the row never promotes — the only-flag-promotes rule
//     handles this naturally.
function isFlaggedRow(
  e: CareEvent,
  flagCategories: Set<DayChangeCategory>,
): boolean {
  const cat = eventCategory(e);
  if (!cat) return false;
  if (!flagCategories.has(cat)) return false;
  if (cat === 'meals') {
    const meta = (e.metadata || {}) as Record<string, any>;
    const refused = meta.refused === true || (typeof meta.quality === 'string' && meta.quality.toLowerCase() === 'refused');
    if (!refused) return false;
  }
  return true;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function EventsTimeline({ events, dayLevelChanges }: EventsTimelineProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  if (!events || events.length === 0) return null;

  // Pre-compute the set of flagged categories — coral promotion only
  // happens when severity === 'flag'. Notes are ambient context.
  const flagCategories = useMemo(() => {
    const set = new Set<DayChangeCategory>();
    for (const c of dayLevelChanges) {
      if (c.severity === 'flag') set.add(c.category);
    }
    return set;
  }, [dayLevelChanges]);

  const sorted = [...events].sort((a, b) =>
    a.timestamp.localeCompare(b.timestamp),
  );
  const visible = sorted.slice(0, VISIBLE_ROW_CAP);
  const overflow = sorted.length - visible.length;
  const overflowSummary = overflow > 0
    ? `+ ${overflow} ${overflow === 1 ? 'wellness item' : 'wellness items'}`
    : null;

  return (
    <View style={styles.section}>
      {visible.map((e, i) => {
        const flagged = isFlaggedRow(e, flagCategories);
        return (
          <View key={`${e.id}-${i}`} testID={`timeline-row-${i}`} style={styles.row}>
            <Text testID="timeline-row-time" style={styles.time}>
              {formatTime(e.timestamp)}
            </Text>
            <Text
              testID="timeline-row-text"
              style={[
                styles.text,
                { color: flagged ? colors.criticalAlert : colors.textPrimary },
              ]}
            >
              {eventLabel(e)}
            </Text>
          </View>
        );
      })}
      {overflowSummary && (
        <Text testID="timeline-overflow" style={styles.overflow}>
          {overflowSummary}
        </Text>
      )}
    </View>
  );
}

const createStyles = (c: any) =>
  StyleSheet.create({
    section: {
      marginVertical: Spacing.sm,
      paddingHorizontal: 2,
    },
    row: {
      flexDirection: 'row' as const,
      alignItems: 'flex-start' as const,
      paddingVertical: 5,
    },
    time: {
      width: 48,
      fontSize: 11.5,
      lineHeight: 18,
      fontWeight: '500' as const,
      color: c.textSecondary,
    },
    text: {
      flex: 1,
      fontSize: 11.5,
      lineHeight: 18,
      fontWeight: '400' as const,
    },
    overflow: {
      paddingTop: 4,
      paddingLeft: 48,
      fontSize: 10.5,
      color: c.textTertiary,
    },
  });

export default EventsTimeline;
