// ============================================================================
// HEALTH ZONE — Now tab "Today's Health" review zone.
//
// 4 fabric rows: Vitals · Mood · Meals · Symptoms. Each row reads the
// current day's logged value (or "Not yet · log" when empty). The zone
// is review-shaped: tap-to-log on empty rows opens the appropriate log
// surface, never the QuickLogSheet picker (the picker is for write
// intent; this zone is for read intent).
//
// Data sources (all pre-existing, no new service calls):
//   • Vitals  — getTodayVitalsLog + checkTodayVitalsExceedances for the
//               flagged-reading ember treatment
//   • Mood    — getDailyReflection().mood (ReflectionScore 1-5)
//   • Meals   — listDailyInstances filtered to nutrition + status
//               completed (count vs total)
//   • Symptoms — getSymptomsByDate
//
// Refreshes via useDataListener on EVENT.VITALS / WELLNESS / MEALS /
// DAILY_INSTANCES so any save elsewhere reflects here.
// ============================================================================

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { Colors } from '../../theme/theme-tokens';
import { ROW_V, TypeScale } from '../../theme/spacing';
import { navigate } from '../../lib/navigate';
import { useDataListener } from '../../lib/events';
import { EVENT } from '../../lib/eventNames';
import { getTodayVitalsLog } from '../../utils/centralStorage';
import { checkTodayVitalsExceedances } from '../../utils/vitalsGuidance';
import { getDailyReflection } from '../../storage/dailyReflectionRepo';
import {
  listDailyInstances,
  DEFAULT_PATIENT_ID,
} from '../../storage/carePlanRepo';
import { getSymptomsByDate } from '../../utils/symptomStorage';
import { getTodayDateString } from '../../services/carePlanGenerator';
import { logError } from '../../utils/devLog';
import { Zone } from './Zone';

type ReflectionScore = 1 | 2 | 3 | 4 | 5;

const MOOD_EMOJI: Record<ReflectionScore, string> = {
  1: '😔',
  2: '😕',
  3: '😐',
  4: '🙂',
  5: '😊',
};

interface ZoneData {
  vitalsSummary: string | null;
  vitalsFlagged: boolean;
  mood: ReflectionScore | null;
  mealsLogged: number;
  mealsTotal: number;
  symptomsCount: number;
  loading: boolean;
}

const INITIAL: ZoneData = {
  vitalsSummary: null,
  vitalsFlagged: false,
  mood: null,
  mealsLogged: 0,
  mealsTotal: 0,
  symptomsCount: 0,
  loading: true,
};

function formatVitalsSummary(log: Awaited<ReturnType<typeof getTodayVitalsLog>>): string | null {
  if (!log) return null;
  const parts: string[] = [];
  if (log.systolic != null && log.diastolic != null) {
    parts.push(`BP ${log.systolic}/${log.diastolic}`);
  }
  if (log.heartRate != null) {
    parts.push(`HR ${log.heartRate}`);
  }
  if (parts.length === 0) return null;
  return parts.join(' · ');
}

export function HealthZoneNow() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [data, setData] = useState<ZoneData>(INITIAL);

  const load = useCallback(async () => {
    const today = getTodayDateString();
    try {
      const [vitalsLog, exceedances, reflection, instances, symptoms] = await Promise.all([
        getTodayVitalsLog(DEFAULT_PATIENT_ID),
        checkTodayVitalsExceedances(),
        getDailyReflection(DEFAULT_PATIENT_ID, today),
        listDailyInstances(DEFAULT_PATIENT_ID, today),
        getSymptomsByDate(today, DEFAULT_PATIENT_ID),
      ]);

      const mealInstances = instances.filter((i) => i.itemType === 'nutrition');
      setData({
        vitalsSummary: formatVitalsSummary(vitalsLog),
        vitalsFlagged: exceedances.length > 0,
        mood: (reflection?.mood as ReflectionScore | undefined) ?? null,
        mealsLogged: mealInstances.filter((i) => i.status === 'completed').length,
        mealsTotal: mealInstances.length,
        symptomsCount: symptoms.length,
        loading: false,
      });
    } catch (err) {
      logError('HealthZoneNow.load', err);
      setData((prev) => ({ ...prev, loading: false }));
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useDataListener((category) => {
    if (
      category === EVENT.VITALS ||
      category === EVENT.WELLNESS ||
      category === EVENT.DAILY_INSTANCES ||
      category === EVENT.MOOD ||
      category === EVENT.NOTES
    ) {
      void load();
    }
  });

  return (
    <Zone icon="♥" label="TODAY'S HEALTH" verb="review" tint="none" accent="green" testID="health-zone-now">
      {/* VITALS */}
      <HealthRow
        styles={styles}
        label="Vitals"
        value={data.vitalsSummary}
        emptyHint="Not yet"
        emptyAction="log"
        flagged={data.vitalsFlagged}
        onEmptyPress={() => navigate('/log-vitals')}
        onValuePress={() => navigate('/log-vitals')}
      />
      {/* MOOD */}
      <HealthRow
        styles={styles}
        label="Mood"
        value={data.mood != null ? `${MOOD_EMOJI[data.mood]}  ${moodLabel(data.mood)}` : null}
        emptyHint="Not yet"
        emptyAction="log"
        flagged={false}
        onEmptyPress={() => navigate('/log-mood')}
        onValuePress={() => navigate('/log-mood')}
      />
      {/* MEALS */}
      <HealthRow
        styles={styles}
        label="Meals"
        value={
          data.mealsTotal > 0
            ? `${data.mealsLogged} of ${data.mealsTotal} logged`
            : data.mealsLogged > 0
              ? `${data.mealsLogged} logged`
              : null
        }
        emptyHint="Not yet"
        emptyAction="add"
        flagged={false}
        onEmptyPress={() => navigate('/log-meal')}
        onValuePress={() => navigate('/log-meal')}
      />
      {/* SYMPTOMS */}
      <HealthRow
        styles={styles}
        label="Symptoms"
        value={
          data.symptomsCount > 0
            ? `${data.symptomsCount} noted today`
            : null
        }
        emptyHint="None noted"
        emptyAction="add"
        flagged={false}
        onEmptyPress={() => navigate('/log-symptom')}
        onValuePress={() => navigate('/log-symptom')}
      />
    </Zone>
  );
}

function moodLabel(score: ReflectionScore): string {
  switch (score) {
    case 1: return 'Rough';
    case 2: return 'Low';
    case 3: return 'Neutral';
    case 4: return 'Okay';
    case 5: return 'Good';
  }
}

function HealthRow({
  styles,
  label,
  value,
  emptyHint,
  emptyAction,
  flagged,
  onEmptyPress,
  onValuePress,
}: {
  styles: ReturnType<typeof createStyles>;
  label: string;
  value: string | null;
  emptyHint: string;
  emptyAction: string;
  flagged: boolean;
  onEmptyPress: () => void;
  onValuePress: () => void;
}) {
  if (value != null) {
    return (
      <TouchableOpacity
        style={styles.row}
        onPress={onValuePress}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${value}. Tap to log.`}
        testID={`health-row-${label.toLowerCase()}`}
      >
        <Text style={styles.rowLabel}>{label}</Text>
        <Text style={[styles.rowValue, flagged && styles.rowValueFlagged]}>{value}</Text>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      style={styles.row}
      onPress={onEmptyPress}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={`${label}: ${emptyHint}. Tap to ${emptyAction}.`}
      testID={`health-row-${label.toLowerCase()}-empty`}
    >
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowEmpty}>
        {emptyHint}
        <Text style={styles.rowAction}>{` · ${emptyAction}`}</Text>
      </Text>
    </TouchableOpacity>
  );
}

const createStyles = (c: typeof Colors) =>
  StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'baseline',
      justifyContent: 'space-between',
      paddingVertical: ROW_V,
      borderBottomWidth: 0.5,
      borderBottomColor: c.glassBorder,
    },
    rowLabel: {
      ...TypeScale.body,
      color: c.textPrimary,
      fontWeight: '500',
    },
    rowValue: {
      ...TypeScale.body,
      color: c.textSecondary,
    },
    rowValueFlagged: {
      // F7 spec: flagged reading uses ember (review, not alert).
      color: '#c98a4a',
    },
    rowEmpty: {
      ...TypeScale.body,
      color: c.textMuted,
    },
    rowAction: {
      ...TypeScale.body,
      color: c.accent,
      fontWeight: '500',
    },
  });

export default HealthZoneNow;
