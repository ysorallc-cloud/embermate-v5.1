// ============================================================================
// REMINDER TIMING — sub-screen under Settings → Reminders.
// Smart-timing toggle, per-category advance pickers, follow-up reminder toggles.
// ============================================================================

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '../../../theme/theme-tokens';
import { useTheme } from '../../../contexts/ThemeContext';
import { SubScreenHeader } from '../../../components/SubScreenHeader';
import {
  type AdvanceMinutes,
  type ReminderPreferences,
  type PerCategoryAdvance,
  getReminderPreferences,
  updateReminderPreferences,
} from '../../../services/reminderPreferencesRepo';
import { logError } from '../../../utils/devLog';

type Category = keyof PerCategoryAdvance;

const CATEGORY_LABELS: Record<Category, { icon: string; name: string }> = {
  medications: { icon: '💊', name: 'Medications' },
  vitals: { icon: '📊', name: 'Vitals' },
  wellness: { icon: '🌅', name: 'Wellness check-ins' },
  meals: { icon: '🍽️', name: 'Meals' },
  appointments: { icon: '📅', name: 'Appointments' },
};

const ADVANCE_OPTIONS: { value: AdvanceMinutes; label: string }[] = [
  { value: 0, label: 'At time' },
  { value: 5, label: '5 min before' },
  { value: 15, label: '15 min before' },
  { value: 30, label: '30 min before' },
  { value: 60, label: '1 hour before' },
  { value: null, label: 'Off' },
];

function advanceLabel(value: AdvanceMinutes): string {
  return ADVANCE_OPTIONS.find((o) => o.value === value)?.label ?? 'At time';
}

export default function ReminderTimingScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [prefs, setPrefs] = useState<ReminderPreferences | null>(null);
  const [pickerForCategory, setPickerForCategory] = useState<Category | null>(null);

  useEffect(() => {
    getReminderPreferences().then(setPrefs).catch((e) => logError('timing.load', e));
  }, []);

  const patch = useCallback(
    async (update: Partial<ReminderPreferences>) => {
      const next = await updateReminderPreferences(update);
      setPrefs(next);
    },
    [],
  );

  const setAdvance = useCallback(
    (category: Category, value: AdvanceMinutes) => {
      patch({ perCategoryAdvance: { [category]: value } as any });
      setPickerForCategory(null);
    },
    [patch],
  );

  if (!prefs) {
    return (
      <SafeAreaView style={styles.root} edges={['top']}>
        <SubScreenHeader title="Reminder timing" subtitle="When you'd like to be nudged" />
      </SafeAreaView>
    );
  }

  // Smart timing is gated behind 14 days of data — for v6.7 we surface the
  // toggle but keep it disabled with a tooltip line. The actual data check
  // lives downstream in the notification engine; surface the UX contract
  // here.
  const smartTimingDisabled = !prefs.smartTiming; // proxy: only enable if pre-set
  const smartTimingHelper = smartTimingDisabled
    ? 'Available after 14 days of logs.'
    : 'Stop reminding when you log on time consistently.';

  const visibleCats: Category[] = ['medications', 'vitals', 'wellness', 'meals'];
  const escalationCats: Category[] = ['medications', 'vitals', 'wellness'];

  return (
    <View style={styles.root}>
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <SubScreenHeader title="Reminder timing" subtitle="When you'd like to be nudged" />
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* Smart timing */}
          <View style={styles.card}>
            <View style={styles.toggleRow} accessibilityRole="switch">
              <View style={styles.rowLeft}>
                <Text style={styles.rowTitle}>Smart timing</Text>
                <Text style={styles.rowSubtitle}>{smartTimingHelper}</Text>
              </View>
              <Switch
                testID="smart-timing-toggle"
                value={prefs.smartTiming}
                onValueChange={(v) => patch({ smartTiming: v })}
                trackColor={{ false: colors.glassBorder, true: colors.accent }}
                accessibilityLabel="Smart timing"
              />
            </View>
          </View>

          {/* Per-category defaults */}
          <Text style={styles.eyebrow}>{'PER-CATEGORY DEFAULTS'}</Text>
          <View style={styles.card}>
            {visibleCats.map((cat, i) => {
              const meta = CATEGORY_LABELS[cat];
              const isLast = i === visibleCats.length - 1;
              return (
                <TouchableOpacity
                  key={cat}
                  testID={`advance-row-${cat}`}
                  style={[styles.row, !isLast && styles.rowDivider]}
                  onPress={() => setPickerForCategory(cat)}
                  accessibilityRole="button"
                  accessibilityLabel={`${meta.name}: ${advanceLabel(prefs.perCategoryAdvance[cat])}`}
                  accessibilityHint="Choose how far ahead to send reminders for this category."
                >
                  <Text style={styles.icon}>{meta.icon}</Text>
                  <View style={styles.rowLeft}>
                    <Text style={styles.rowTitle}>{meta.name}</Text>
                    <Text style={styles.rowSubtitle}>
                      {advanceLabel(prefs.perCategoryAdvance[cat])}
                    </Text>
                  </View>
                  <Text style={styles.chevron}>{'›'}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Per-category escalation */}
          <Text style={styles.eyebrow}>{'FOLLOW-UP REMINDERS'}</Text>
          <Text style={styles.eyebrowHint}>
            For medications and vitals where missed logs matter most.
          </Text>
          <View style={styles.card}>
            {escalationCats.map((cat, i) => {
              const meta = CATEGORY_LABELS[cat];
              const isLast = i === escalationCats.length - 1;
              return (
                <View
                  key={cat}
                  style={[styles.toggleRow, !isLast && styles.rowDivider]}
                  accessibilityRole="switch"
                >
                  <Text style={styles.icon}>{meta.icon}</Text>
                  <View style={styles.rowLeft}>
                    <Text style={styles.rowTitle}>{meta.name}</Text>
                    <Text style={styles.rowSubtitle}>
                      Send a follow-up if not logged within 30 min
                    </Text>
                  </View>
                  <Switch
                    testID={`escalation-toggle-${cat}`}
                    value={(prefs.perCategoryEscalation as any)[cat]}
                    onValueChange={(v) =>
                      patch({ perCategoryEscalation: { [cat]: v } as any })
                    }
                    trackColor={{ false: colors.glassBorder, true: colors.accent }}
                    accessibilityLabel={`${meta.name} follow-up reminder`}
                  />
                </View>
              );
            })}
          </View>

          <View style={{ height: 40 }} />
        </ScrollView>
      </SafeAreaView>

      {/* Picker sheet */}
      <Modal
        visible={pickerForCategory != null}
        animationType="slide"
        transparent
        onRequestClose={() => setPickerForCategory(null)}
      >
        <TouchableOpacity
          style={styles.overlay}
          activeOpacity={1}
          onPress={() => setPickerForCategory(null)}
          accessibilityRole="button"
          accessibilityLabel="Close picker"
        >
          <TouchableOpacity
            activeOpacity={1}
            style={styles.sheet}
            accessibilityRole="none"
            accessibilityLabel="Reminder timing picker"
          >
            <View style={styles.handle} />
            <Text style={styles.sheetTitle}>
              {pickerForCategory ? CATEGORY_LABELS[pickerForCategory].name : ''}
            </Text>
            {ADVANCE_OPTIONS.map((opt) => {
              const selected = pickerForCategory != null &&
                prefs.perCategoryAdvance[pickerForCategory] === opt.value;
              return (
                <TouchableOpacity
                  key={String(opt.value)}
                  testID={`picker-option-${opt.value}`}
                  style={[styles.pickerRow, selected && styles.pickerRowSelected]}
                  onPress={() => pickerForCategory && setAdvance(pickerForCategory, opt.value)}
                  accessibilityRole="button"
                  accessibilityLabel={opt.label}
                  accessibilityState={{ selected }}
                >
                  <Text style={[styles.pickerLabel, selected && styles.pickerLabelSelected]}>
                    {opt.label}
                  </Text>
                  {selected && <Text style={styles.pickerCheck}>{'✓'}</Text>}
                </TouchableOpacity>
              );
            })}
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const createStyles = (c: typeof Colors) => StyleSheet.create({
  root: { flex: 1, backgroundColor: c.background },
  scrollContent: { paddingHorizontal: 16, paddingTop: 8 },
  eyebrow: {
    fontSize: 9, fontWeight: '500' as const, letterSpacing: 0.5,
    color: c.textTertiary, marginTop: 24, marginBottom: 6,
  },
  eyebrowHint: {
    fontSize: 11, fontStyle: 'italic' as const, color: c.textSecondary, marginBottom: 8,
  },
  card: {
    backgroundColor: c.glass, borderWidth: 0.5, borderColor: c.glassBorder,
    borderRadius: 10, overflow: 'hidden' as const, marginBottom: 8,
  },
  row: {
    flexDirection: 'row' as const, alignItems: 'center' as const,
    paddingVertical: 12, paddingHorizontal: 14, gap: 10,
  },
  toggleRow: {
    flexDirection: 'row' as const, alignItems: 'center' as const,
    paddingVertical: 12, paddingHorizontal: 14, gap: 10,
  },
  rowDivider: { borderBottomWidth: 0.5, borderBottomColor: c.glassBorder },
  icon: { fontSize: 18 },
  rowLeft: { flex: 1 },
  rowTitle: { fontSize: 14, color: c.textPrimary, fontWeight: '500' as const },
  rowSubtitle: { fontSize: 11, color: c.textSecondary, marginTop: 2, lineHeight: 15 },
  chevron: { fontSize: 18, color: c.textTertiary },
  overlay: {
    flex: 1, backgroundColor: c.overlay || 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' as const,
  },
  sheet: {
    backgroundColor: (c as any).menuSurface || c.glass, borderTopLeftRadius: 20,
    borderTopRightRadius: 20, padding: 20, paddingBottom: 40,
  },
  handle: {
    width: 40, height: 4, borderRadius: 2, backgroundColor: c.glassBorder,
    alignSelf: 'center' as const, marginBottom: 14,
  },
  sheetTitle: {
    fontSize: 16, fontWeight: '600' as const, color: c.textPrimary, marginBottom: 12,
  },
  pickerRow: {
    flexDirection: 'row' as const, alignItems: 'center' as const,
    paddingVertical: 14, paddingHorizontal: 12, borderRadius: 8,
  },
  pickerRowSelected: { backgroundColor: 'rgba(95, 184, 138, 0.10)' },
  pickerLabel: { flex: 1, fontSize: 15, color: c.textPrimary },
  pickerLabelSelected: { color: c.accent, fontWeight: '500' as const },
  pickerCheck: { fontSize: 16, color: c.accent },
});
