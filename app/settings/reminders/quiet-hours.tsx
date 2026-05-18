// ============================================================================
// QUIET HOURS — sub-screen under Settings → Reminders.
// Enable + start/end pickers + weekend / critical-allow toggles.
// ============================================================================

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '../../../theme/theme-tokens';
import { useTheme } from '../../../contexts/ThemeContext';
import { SubScreenHeader } from '../../../components/SubScreenHeader';
import {
  type ReminderPreferences,
  getReminderPreferences,
  updateReminderPreferences,
} from '../../../services/reminderPreferencesRepo';
import { logError } from '../../../utils/devLog';
import { formatTime } from '../../../utils/text/primitives';

function formatHour(hour: number, use24h: boolean): string {
  const d = new Date();
  d.setHours(hour, 0, 0, 0);
  return formatTime(d, { format: use24h ? '24h' : '12h' });
}

export default function QuietHoursScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [prefs, setPrefs] = useState<ReminderPreferences | null>(null);
  const [editing, setEditing] = useState<'start' | 'end' | null>(null);

  useEffect(() => {
    getReminderPreferences().then(setPrefs).catch((e) => logError('quiet-hours.load', e));
  }, []);

  const patch = useCallback(async (q: Partial<ReminderPreferences['quietHours']>) => {
    const next = await updateReminderPreferences({ quietHours: q as any });
    setPrefs(next);
  }, []);

  const stepHour = useCallback(
    (which: 'start' | 'end', delta: number) => {
      if (!prefs) return;
      const cur = which === 'start' ? prefs.quietHours.startHour : prefs.quietHours.endHour;
      const next = (cur + delta + 24) % 24;
      patch(which === 'start' ? { startHour: next } : { endHour: next });
    },
    [prefs, patch],
  );

  if (!prefs) {
    return (
      <SafeAreaView style={styles.root} edges={['top']}>
        <SubScreenHeader title="Quiet hours" subtitle="When EmberMate stays quiet" />
      </SafeAreaView>
    );
  }

  const q = prefs.quietHours;
  const use24h = false; // Wire this from app-wide setting when available.

  return (
    <View style={styles.root}>
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <SubScreenHeader title="Quiet hours" subtitle="When EmberMate stays quiet" />
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* Master enable toggle */}
          <View style={styles.card}>
            <View style={styles.toggleRow} accessibilityRole="switch">
              <View style={styles.rowLeft}>
                <Text style={styles.rowTitle}>Quiet hours</Text>
                <Text style={styles.rowSubtitle}>
                  Reminders pause during this window.
                </Text>
              </View>
              <Switch
                testID="quiet-hours-enabled"
                value={q.enabled}
                onValueChange={(v) => patch({ enabled: v })}
                trackColor={{ false: colors.glassBorder, true: colors.accent }}
                accessibilityLabel="Quiet hours enabled"
              />
            </View>
          </View>

          {/* Start / End pickers */}
          {q.enabled && (
            <View style={styles.card}>
              <View style={[styles.row, styles.rowDivider]}>
                <View style={styles.rowLeft}>
                  <Text style={styles.rowTitle}>Start</Text>
                </View>
                <TouchableOpacity
                  testID="quiet-hours-start"
                  onPress={() => setEditing(editing === 'start' ? null : 'start')}
                  accessibilityRole="button"
                  accessibilityLabel={`Quiet hours start: ${formatHour(q.startHour, use24h)}`}
                >
                  <Text style={styles.timeValue}>{formatHour(q.startHour, use24h)}</Text>
                </TouchableOpacity>
              </View>
              {editing === 'start' && (
                <HourStepper
                  hour={q.startHour}
                  use24h={use24h}
                  onStep={(d) => stepHour('start', d)}
                />
              )}
              <View style={styles.row}>
                <View style={styles.rowLeft}>
                  <Text style={styles.rowTitle}>End</Text>
                </View>
                <TouchableOpacity
                  testID="quiet-hours-end"
                  onPress={() => setEditing(editing === 'end' ? null : 'end')}
                  accessibilityRole="button"
                  accessibilityLabel={`Quiet hours end: ${formatHour(q.endHour, use24h)}`}
                >
                  <Text style={styles.timeValue}>{formatHour(q.endHour, use24h)}</Text>
                </TouchableOpacity>
              </View>
              {editing === 'end' && (
                <HourStepper
                  hour={q.endHour}
                  use24h={use24h}
                  onStep={(d) => stepHour('end', d)}
                />
              )}
            </View>
          )}

          {/* Optional toggles */}
          <View style={styles.card}>
            <View style={[styles.toggleRow, styles.rowDivider]} accessibilityRole="switch">
              <View style={styles.rowLeft}>
                <Text style={styles.rowTitle}>Quiet on weekends only</Text>
              </View>
              <Switch
                testID="weekends-only-toggle"
                value={q.weekendsOnly}
                onValueChange={(v) => patch({ weekendsOnly: v })}
                trackColor={{ false: colors.glassBorder, true: colors.accent }}
                accessibilityLabel="Quiet on weekends only"
              />
            </View>
            <View style={styles.toggleRow} accessibilityRole="switch">
              <View style={styles.rowLeft}>
                <Text style={styles.rowTitle}>Allow critical reminders during quiet hours</Text>
                <Text style={styles.rowSubtitle}>
                  We'll still alert for urgent things, like missed doses past their window.
                </Text>
              </View>
              <Switch
                testID="allow-critical-toggle"
                value={q.allowCritical}
                onValueChange={(v) => patch({ allowCritical: v })}
                trackColor={{ false: colors.glassBorder, true: colors.accent }}
                accessibilityLabel="Allow critical reminders during quiet hours"
              />
            </View>
          </View>

          <View style={{ height: 40 }} />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

function HourStepper({
  hour,
  use24h,
  onStep,
}: {
  hour: number;
  use24h: boolean;
  onStep: (d: number) => void;
}) {
  const styles = useMemo(() => stepperStyles(), []);
  return (
    <View style={styles.stepper}>
      <TouchableOpacity
        onPress={() => onStep(-1)}
        style={styles.stepButton}
        accessibilityRole="button"
        accessibilityLabel="Decrement hour"
      >
        <Text style={styles.stepText}>{'−'}</Text>
      </TouchableOpacity>
      <Text style={styles.stepValue}>{formatHour(hour, use24h)}</Text>
      <TouchableOpacity
        onPress={() => onStep(1)}
        style={styles.stepButton}
        accessibilityRole="button"
        accessibilityLabel="Increment hour"
      >
        <Text style={styles.stepText}>{'+'}</Text>
      </TouchableOpacity>
    </View>
  );
}

const stepperStyles = () => StyleSheet.create({
  stepper: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    gap: 24,
    paddingVertical: 14,
  },
  stepButton: { paddingHorizontal: 16, paddingVertical: 8 },
  stepText: { fontSize: 22, color: '#5fb88a' },
  stepValue: { fontSize: 18, color: Colors.textPrimary, minWidth: 100, textAlign: 'center' as const },
});

const createStyles = (c: typeof Colors) => StyleSheet.create({
  root: { flex: 1, backgroundColor: c.background },
  scrollContent: { paddingHorizontal: 16, paddingTop: 8 },
  card: {
    backgroundColor: c.glass, borderWidth: 0.5, borderColor: c.glassBorder,
    borderRadius: 10, overflow: 'hidden' as const, marginBottom: 8,
  },
  row: {
    flexDirection: 'row' as const, alignItems: 'center' as const,
    paddingVertical: 14, paddingHorizontal: 14,
  },
  toggleRow: {
    flexDirection: 'row' as const, alignItems: 'center' as const,
    paddingVertical: 12, paddingHorizontal: 14,
  },
  rowDivider: { borderBottomWidth: 0.5, borderBottomColor: c.glassBorder },
  rowLeft: { flex: 1, paddingRight: 12 },
  rowTitle: { fontSize: 14, color: c.textPrimary, fontWeight: '500' as const },
  rowSubtitle: { fontSize: 11, color: c.textSecondary, marginTop: 2, lineHeight: 15 },
  timeValue: { fontSize: 16, color: c.accent, fontWeight: '500' as const },
});
