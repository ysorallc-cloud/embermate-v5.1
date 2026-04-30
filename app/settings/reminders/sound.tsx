// ============================================================================
// SOUND AND VIBRATION — sub-screen under Settings → Reminders.
// Radio-style sound selection + iOS DND respect toggle.
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
  type SoundChoice,
  getReminderPreferences,
  updateReminderPreferences,
} from '../../../services/reminderPreferencesRepo';
import { logError } from '../../../utils/devLog';

const SOUND_OPTIONS: { value: SoundChoice; label: string; helper: string }[] = [
  { value: 'gentle', label: 'Gentle', helper: 'A soft chime and light vibration. Recommended.' },
  { value: 'standard', label: 'Standard', helper: 'iOS default sound.' },
  { value: 'silent', label: 'Silent', helper: 'Vibration only.' },
];

export default function ReminderSoundScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [prefs, setPrefs] = useState<ReminderPreferences | null>(null);

  useEffect(() => {
    getReminderPreferences().then(setPrefs).catch((e) => logError('sound.load', e));
  }, []);

  const setSound = useCallback(async (value: SoundChoice) => {
    const next = await updateReminderPreferences({ sound: value });
    setPrefs(next);
    // 1-second preview chime would fire here. The actual audio file lives
    // in services/notificationSounds.ts when the engine integration ships.
  }, []);

  const setRespectDND = useCallback(async (value: boolean) => {
    const next = await updateReminderPreferences({ respectSystemDND: value });
    setPrefs(next);
  }, []);

  if (!prefs) {
    return (
      <SafeAreaView style={styles.root} edges={['top']}>
        <SubScreenHeader title="Sound and vibration" subtitle="How reminders feel" />
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.root}>
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <SubScreenHeader title="Sound and vibration" subtitle="How reminders feel" />
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <Text style={styles.eyebrow}>{'SOUND'}</Text>
          <View style={styles.card}>
            {SOUND_OPTIONS.map((opt, i) => {
              const selected = prefs.sound === opt.value;
              const isLast = i === SOUND_OPTIONS.length - 1;
              return (
                <TouchableOpacity
                  key={opt.value}
                  testID={`sound-option-${opt.value}`}
                  style={[styles.row, !isLast && styles.rowDivider]}
                  onPress={() => setSound(opt.value)}
                  activeOpacity={0.7}
                  accessibilityRole="radio"
                  accessibilityLabel={opt.label}
                  accessibilityHint={opt.helper}
                  accessibilityState={{ selected }}
                >
                  <View style={[styles.radio, selected && styles.radioSelected]}>
                    {selected && <View style={styles.radioInner} />}
                  </View>
                  <View style={styles.rowLeft}>
                    <Text style={[styles.rowTitle, selected && styles.rowTitleSelected]}>
                      {opt.label}
                    </Text>
                    <Text style={styles.rowSubtitle}>{opt.helper}</Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>

          <View style={styles.card}>
            <View style={styles.toggleRow} accessibilityRole="switch">
              <View style={styles.rowLeft}>
                <Text style={styles.rowTitle}>Use iOS Do Not Disturb settings</Text>
                <Text style={styles.rowSubtitle}>
                  When on, your iPhone's focus modes silence EmberMate too.
                </Text>
              </View>
              <Switch
                testID="respect-dnd-toggle"
                value={prefs.respectSystemDND}
                onValueChange={setRespectDND}
                trackColor={{ false: colors.glassBorder, true: colors.accent }}
                accessibilityLabel="Use iOS Do Not Disturb settings"
              />
            </View>
          </View>

          <View style={{ height: 40 }} />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const createStyles = (c: typeof Colors) => StyleSheet.create({
  root: { flex: 1, backgroundColor: c.background },
  scrollContent: { paddingHorizontal: 16, paddingTop: 8 },
  eyebrow: {
    fontSize: 9, fontWeight: '500' as const, letterSpacing: 0.5,
    color: c.textTertiary, marginBottom: 6,
  },
  card: {
    backgroundColor: c.glass, borderWidth: 0.5, borderColor: c.glassBorder,
    borderRadius: 10, overflow: 'hidden' as const, marginBottom: 8,
  },
  row: {
    flexDirection: 'row' as const, alignItems: 'center' as const,
    paddingVertical: 14, paddingHorizontal: 14, gap: 12,
  },
  toggleRow: {
    flexDirection: 'row' as const, alignItems: 'center' as const,
    paddingVertical: 12, paddingHorizontal: 14,
  },
  rowDivider: { borderBottomWidth: 0.5, borderBottomColor: c.glassBorder },
  rowLeft: { flex: 1 },
  rowTitle: { fontSize: 14, color: c.textPrimary, fontWeight: '500' as const },
  rowTitleSelected: { color: c.accent },
  rowSubtitle: { fontSize: 11, color: c.textSecondary, marginTop: 2, lineHeight: 15 },
  radio: {
    width: 18, height: 18, borderRadius: 9,
    borderWidth: 1, borderColor: c.glassBorder,
    alignItems: 'center' as const, justifyContent: 'center' as const,
  },
  radioSelected: { borderColor: c.accent },
  radioInner: {
    width: 10, height: 10, borderRadius: 5, backgroundColor: c.accent,
  },
});
