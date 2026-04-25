// ============================================================================
// JOURNAL SUMMARY — Stats strip, timeline rows, and empty states
// Extracted from journal.tsx for maintainability
// ============================================================================

import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { CareBrief } from '../../utils/careSummaryBuilder';
import { getTodayDateString } from '../../services/carePlanGenerator';

// ============================================================================
// TYPES
// ============================================================================

export interface JournalSummaryProps {
  brief: CareBrief | null;
  selectedDate: string;
  enabledBuckets: string[];
}

// ============================================================================
// HELPERS
// ============================================================================

function formatTimelineTime(iso: string): string {
  return new Date(iso)
    .toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
    .toLowerCase();
}

// ============================================================================
// COMPONENT
// ============================================================================

export function JournalSummary({ brief, selectedDate, enabledBuckets }: JournalSummaryProps) {
  const { colors } = useTheme();
  const s = useMemo(() => createStyles(colors), [colors]);

  // Computed values from brief
  const medsDone = brief?.medications.filter(m => m.status === 'completed' || m.status === 'skipped').length ?? 0;
  const medsTotal = brief?.medications.length ?? 0;
  const mealsDone = brief?.meals.meals.filter(m => m.status === 'completed' || m.status === 'skipped').length ?? 0;
  const mealsTotal = brief?.meals.total ?? 0;
  const hasVitals = brief?.vitals.recorded ?? false;
  const wellnessDone = brief?.wellnessChecks.done ?? 0;
  const wellnessTotal = brief?.wellnessChecks.total ?? 0;
  const hasMorning = brief?.mood.morningWellness != null;
  const hasEvening = brief?.mood.eveningWellness != null;
  const waterGlasses = brief?.hydration.glasses ?? 0;

  const isToday = selectedDate === getTodayDateString();
  const isEmpty = medsTotal === 0 && mealsTotal === 0 && waterGlasses === 0 && !hasMorning && !hasEvening && !hasVitals;

  // Timeline events
  const timelineEvents = useMemo(() => {
    if (!brief) return [];
    type TimelineEvent = { time: string; text: string; sortKey: number };
    const events: TimelineEvent[] = [];

    for (const med of brief.medications) {
      if (med.status === 'completed' && med.takenAt) {
        events.push({
          time: formatTimelineTime(med.takenAt),
          text: `Took ${med.name}${med.dosage ? ' ' + med.dosage : ''}`,
          sortKey: new Date(med.takenAt).getTime(),
        });
      }
    }
    if (brief.vitals.recorded && brief.vitals.recordedAt) {
      const r = brief.vitals.readings;
      const parts: string[] = [];
      if (r?.systolic && r?.diastolic) parts.push(`BP ${r.systolic}/${r.diastolic}`);
      if (r?.heartRate) parts.push(`HR ${r.heartRate}`);
      if (r?.glucose) parts.push(`glucose ${r.glucose}`);
      events.push({
        time: formatTimelineTime(brief.vitals.recordedAt),
        text: `Logged vitals${parts.length > 0 ? ' \u2014 ' + parts.join(', ') : ''}`,
        sortKey: new Date(brief.vitals.recordedAt).getTime(),
      });
    }
    if (brief.mood.morningWellness) {
      events.push({
        time: 'morning',
        text: `Morning check-in \u2014 feeling ${brief.mood.morningWellness.mood}`,
        sortKey: 0,
      });
    }
    if (brief.mood.eveningWellness) {
      events.push({
        time: 'evening',
        text: `Evening check-in \u2014 day rated ${brief.mood.eveningWellness.dayRating}/5`,
        sortKey: Number.MAX_SAFE_INTEGER - 1,
      });
    }
    for (const meal of brief.meals.meals) {
      if (meal.status === 'completed') {
        const t = meal.scheduledTime || '';
        events.push({
          time: t || '\u2014',
          text: `Ate ${meal.name.toLowerCase()}${meal.appetite ? ' (' + meal.appetite + ')' : ''}`,
          sortKey: t ? parseInt(t.replace(':', ''), 10) || 1 : 1,
        });
      }
    }

    events.sort((a, b) => a.sortKey - b.sortKey);
    return events.slice(0, 10);
  }, [brief]);

  // Stat color helper
  const statColor = (done: number, total: number, missed: number): string => {
    if (total === 0) return colors.textWarmMuted;
    if (done === total) return colors.accent;
    if (missed > 0 || done === 0) return done === 0 ? colors.textWarmMuted : colors.amberBright;
    return colors.amberBright;
  };

  const medsMissed = brief?.medications.filter(m => m.status === 'missed').length ?? 0;
  const mealsMissed = brief?.meals.meals.filter(m => m.status === 'missed').length ?? 0;

  return (
    <View>
      {/* Stats strip */}
      <View style={s.statsStrip}>
        <View style={s.statCol}>
          <Text style={[s.statValue, {
            color: medsTotal === 0
              ? colors.textWarmMuted
              : medsDone === medsTotal
                ? colors.accent
                : medsDone === 0
                  ? colors.red
                  : colors.amberBright,
          }]}>
            {medsTotal > 0 ? `${medsDone}/${medsTotal}` : '\u2014'}
          </Text>
          <Text style={s.statLabel}>Meds</Text>
        </View>
        <View style={s.statDivider} />
        <View style={s.statCol}>
          <Text style={[s.statValue, {
            color: hasVitals ? colors.accent : colors.textWarmMuted,
          }]}>
            {hasVitals
              ? (brief?.vitals?.readings?.systolic && brief?.vitals?.readings?.diastolic
                  ? `${brief.vitals.readings.systolic}/${brief.vitals.readings.diastolic}`
                  : '\u2713')
              : '\u2014'}
          </Text>
          <Text style={s.statLabel}>BP</Text>
        </View>
        <View style={s.statDivider} />
        <View style={s.statCol}>
          <Text style={[s.statValue, {
            color: mealsTotal === 0
              ? colors.textWarmMuted
              : mealsDone === mealsTotal
                ? colors.accent
                : mealsDone > 0
                  ? colors.amberBright
                  : colors.textWarmMuted,
          }]}>
            {mealsTotal > 0 ? `${mealsDone}/${mealsTotal}` : '\u2014'}
          </Text>
          <Text style={s.statLabel}>Meals</Text>
        </View>
        <View style={s.statDivider} />
        <View style={s.statCol}>
          <Text style={[s.statValue, {
            color: wellnessTotal === 0
              ? colors.textWarmMuted
              : wellnessDone === wellnessTotal
                ? colors.accent
                : wellnessDone > 0
                  ? colors.amberBright
                  : colors.textWarmMuted,
          }]}>
            {wellnessTotal > 0 ? `${wellnessDone}/${wellnessTotal}` : '\u2014'}
          </Text>
          <Text style={s.statLabel}>Check-ins</Text>
        </View>
      </View>

      {/* Timeline rows */}
      <View style={s.timelineSection}>
        {timelineEvents.length === 0 ? (
          <Text style={s.timelineEmpty}>Today's a fresh start — log when you're ready.</Text>
        ) : (
          timelineEvents.map((event, i) => (
            <View key={i} style={s.timelineRow}>
              <Text style={s.timelineTime}>{event.time}</Text>
              <Text style={s.timelineText}>{event.text}</Text>
            </View>
          ))
        )}
      </View>

      {/* First-use guidance (today only) */}
      {isToday && isEmpty && (
        <View style={s.firstUseCard}>
          <Text style={s.firstUseTitle}>Your journal builds as you log</Text>
          <Text style={s.firstUseText}>
            Track medications, meals, vitals, or mood from the Now tab and your daily summary will appear here.
          </Text>
        </View>
      )}

      {/* Past-date empty state */}
      {!isToday && isEmpty && (
        <View style={s.pastDateEmpty}>
          <Text style={s.pastDateEmptyText}>No data recorded for this date.</Text>
        </View>
      )}
    </View>
  );
}

// ============================================================================
// STYLES
// ============================================================================

const createStyles = (c: any) => StyleSheet.create({
  statsStrip: {
    flexDirection: 'row',
    borderTopWidth: 0.5,
    borderBottomWidth: 0.5,
    borderColor: c.warmSurfaceBorder,
    paddingVertical: 0,
  },
  statCol: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '500',
  },
  statLabel: {
    fontSize: 10,
    color: c.textWarmMuted,
    marginTop: 2,
  },
  statDivider: {
    width: 0.5,
    backgroundColor: c.warmSurfaceBorder,
  },
  timelineSection: {
    paddingVertical: 14,
    borderBottomWidth: 0.5,
    borderBottomColor: c.warmSurfaceBorder,
  },
  timelineRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
    alignItems: 'flex-start',
  },
  timelineTime: {
    fontSize: 11,
    color: c.textWarmDim,
    width: 44,
    flexShrink: 0,
    paddingTop: 1,
  },
  timelineText: {
    fontSize: 12,
    color: c.textWarmSecondary,
    flex: 1,
    lineHeight: 17,
  },
  timelineEmpty: {
    fontSize: 12,
    color: c.textWarmMuted,
    fontStyle: 'italic',
  },
  firstUseCard: {
    backgroundColor: 'rgba(255, 140, 148, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 140, 148, 0.2)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  firstUseTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: c.accent,
    marginBottom: 4,
  },
  firstUseText: {
    fontSize: 13,
    color: c.textSecondary,
    lineHeight: 19,
  },
  pastDateEmpty: {
    paddingVertical: 24,
    alignItems: 'center' as const,
  },
  pastDateEmptyText: {
    fontSize: 13,
    color: c.textWarmMuted,
    fontStyle: 'italic' as const,
  },
});
