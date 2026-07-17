// ============================================================================
// QUICK LOG SHEET — bottom sheet anchored to the Now tab's QuickLogFAB.
//
// Pre-launch UX-1 scope: replace the prior "FAB navigates straight to
// /quick-log-more" handoff with an in-tab picker that satisfies the most
// common quick-log paths without leaving Now.
//
// Picker rows:
//   • Vitals — drills into VitalsSheetBody (BP + HR fast-path)
//   • Water  — INLINE preset chips on the row (+1 +2 +3 +4)
//   • Meal   — INLINE preset chips on the row (Breakfast / Lunch / Dinner / Snack)
//   • More   — routes to /quick-log-more (full quick-log grid)
//
// The freeform "Note" row was removed with the unanchored note feature (it
// wrote to noteStorage, which nothing live reads). The anchored notes stay:
// custom care-plan tasks still complete via /log-note (+NoteForm), and the
// quick-log-more "Quick observation" note (→ Journal by date) is untouched.
//
// Tap-budget guarantees from the device-walk gate:
//   • Vitals  — FAB + Vitals row + Save                     = 3 taps  (≤4 budget)
//   • Water   — FAB + chip                                   = 2 taps
//   • Meal    — FAB + chip                                   = 2 taps
//   • More    — FAB + More row → /quick-log-more            = 2 taps
//
// Storage helpers are shared with the existing /log-* screens
// (saveVital + saveVitalsLog for Vitals, updateTodayWaterLog for Water,
// saveMealsLog for Meal); no parallel storage paths are introduced.
// ============================================================================

import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
  Alert,
  TextInput,
} from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { navigate } from '../../lib/navigate';
import { saveVital } from '../../utils/vitalsStorage';
import { saveVitalsLog, updateTodayWaterLog, getTodayWaterLog, saveMealsLog } from '../../utils/centralStorage';
import { hapticSuccess } from '../../utils/hapticFeedback';
import { emitDataUpdate } from '../../lib/events';
import { EVENT } from '../../lib/eventNames';
import { logError } from '../../utils/devLog';

type SheetMode = 'picker' | 'vitals';
type MealPreset = 'Breakfast' | 'Lunch' | 'Dinner' | 'Snack';

export interface QuickLogSheetProps {
  visible: boolean;
  onClose: () => void;
}

export function QuickLogSheet({ visible, onClose }: QuickLogSheetProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [mode, setMode] = useState<SheetMode>('picker');
  // Reset to picker every time the sheet opens so a re-open never
  // lands the user mid-flow inside the previous sub-body.
  React.useEffect(() => {
    if (visible) setMode('picker');
  }, [visible]);

  const handleClose = useCallback(() => {
    setMode('picker');
    onClose();
  }, [onClose]);

  const handleBackToPicker = useCallback(() => setMode('picker'), []);

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={handleClose}>
      <TouchableOpacity
        style={styles.overlay}
        activeOpacity={1}
        onPress={handleClose}
        accessibilityRole="button"
        accessibilityLabel="Close quick-log menu"
      >
        <TouchableOpacity
          style={styles.sheet}
          activeOpacity={1}
          accessibilityRole="none"
          accessibilityLabel="Quick log menu"
          testID="quick-log-sheet"
        >
          <View style={styles.handle} />

          {mode === 'picker' && <PickerBody styles={styles} setMode={setMode} onClose={handleClose} />}
          {mode === 'vitals' && <VitalsSheetBody styles={styles} onBack={handleBackToPicker} onSaved={handleClose} />}
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

// ============================================================================
// PICKER BODY — 5 rows; Water/Meal carry inline preset chips.
// ============================================================================

function PickerBody({
  styles,
  setMode,
  onClose,
}: {
  styles: ReturnType<typeof createStyles>;
  setMode: (m: SheetMode) => void;
  onClose: () => void;
}) {
  const handleWaterPreset = useCallback(
    async (cups: number) => {
      try {
        const today = await getTodayWaterLog();
        const next = (today?.glasses ?? 0) + cups;
        await updateTodayWaterLog(next);
        emitDataUpdate(EVENT.WATER);
        await hapticSuccess();
      } catch (err) {
        logError('QuickLogSheet.handleWaterPreset', err);
        Alert.alert('Error', 'Failed to log water');
        return;
      }
      onClose();
    },
    [onClose],
  );

  const handleMealPreset = useCallback(
    async (preset: MealPreset) => {
      try {
        await saveMealsLog({
          timestamp: new Date().toISOString(),
          meals: [preset],
          mealType: preset.toLowerCase(),
        });
        // saveMealsLog already fires emitMealEvent internally; we
        // emit DAILY_INSTANCES to refresh any meal-related care-plan
        // instance state on Now (matches log-meal's pattern).
        emitDataUpdate(EVENT.DAILY_INSTANCES);
        await hapticSuccess();
      } catch (err) {
        logError('QuickLogSheet.handleMealPreset', err);
        Alert.alert('Error', 'Failed to log meal');
        return;
      }
      onClose();
    },
    [onClose],
  );

  return (
    <>
      <Text style={styles.title}>Quick log</Text>

      <DrilldownRow
        styles={styles}
        icon="♥"
        label="Vitals"
        testID="quick-log-row-vitals"
        onPress={() => setMode('vitals')}
      />

      <View style={styles.chipRow} testID="quick-log-row-water">
        <Text style={styles.chipRowIcon}>💧</Text>
        <Text style={styles.chipRowLabel}>Water</Text>
        <View style={styles.chips}>
          {[1, 2, 3, 4].map((n) => (
            <TouchableOpacity
              key={n}
              testID={`quick-log-water-chip-${n}`}
              style={styles.chip}
              onPress={() => void handleWaterPreset(n)}
              accessibilityRole="button"
              accessibilityLabel={`Add ${n} glass${n !== 1 ? 'es' : ''} of water`}
            >
              <Text style={styles.chipText}>+{n}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.chipRow} testID="quick-log-row-meal">
        <Text style={styles.chipRowIcon}>🍽</Text>
        <Text style={styles.chipRowLabel}>Meal</Text>
        <View style={styles.chips}>
          {(['Breakfast', 'Lunch', 'Dinner', 'Snack'] as MealPreset[]).map((m) => (
            <TouchableOpacity
              key={m}
              testID={`quick-log-meal-chip-${m.toLowerCase()}`}
              style={styles.chip}
              onPress={() => void handleMealPreset(m)}
              accessibilityRole="button"
              accessibilityLabel={`Log ${m}`}
            >
              <Text style={styles.chipText}>{m[0]}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <DrilldownRow
        styles={styles}
        icon="…"
        label="More"
        testID="quick-log-row-more"
        onPress={() => {
          onClose();
          navigate('/quick-log-more');
        }}
      />
    </>
  );
}

function DrilldownRow({
  styles,
  icon,
  label,
  testID,
  onPress,
}: {
  styles: ReturnType<typeof createStyles>;
  icon: string;
  label: string;
  testID: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      testID={testID}
      style={styles.row}
      onPress={onPress}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <Text style={styles.rowIcon}>{icon}</Text>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowChevron}>{'›'}</Text>
    </TouchableOpacity>
  );
}

// ============================================================================
// VITALS SHEET BODY — BP + HR fast-path. Full-form / extra fields stay
// on /log-vitals. Same storage helpers as the route screen.
// ============================================================================

function VitalsSheetBody({
  styles,
  onBack,
  onSaved,
}: {
  styles: ReturnType<typeof createStyles>;
  onBack: () => void;
  onSaved: () => void;
}) {
  const { colors } = useTheme();
  const [systolic, setSystolic] = useState('');
  const [diastolic, setDiastolic] = useState('');
  const [heartRate, setHeartRate] = useState('');
  const [saving, setSaving] = useState(false);

  const anyField =
    systolic.trim().length > 0 || diastolic.trim().length > 0 || heartRate.trim().length > 0;
  const canSave = anyField && !saving;

  const handleSave = useCallback(async () => {
    if (!canSave) return;
    setSaving(true);
    try {
      const ts = new Date().toISOString();
      if (systolic && diastolic) {
        await saveVital({ type: 'systolic', value: parseFloat(systolic), unit: 'mmHg', timestamp: ts });
        await saveVital({ type: 'diastolic', value: parseFloat(diastolic), unit: 'mmHg', timestamp: ts });
      }
      if (heartRate) {
        await saveVital({ type: 'heartRate', value: parseFloat(heartRate), unit: 'bpm', timestamp: ts });
      }
      await saveVitalsLog({
        timestamp: ts,
        systolic: systolic ? parseFloat(systolic) : undefined,
        diastolic: diastolic ? parseFloat(diastolic) : undefined,
        heartRate: heartRate ? parseFloat(heartRate) : undefined,
      });
      await hapticSuccess();
      emitDataUpdate(EVENT.VITALS);
      onSaved();
    } catch (err) {
      logError('QuickLogSheet.VitalsSheetBody.save', err);
      Alert.alert('Error', 'Failed to save vitals');
      setSaving(false);
    }
  }, [canSave, systolic, diastolic, heartRate, onSaved]);

  return (
    <>
      <SheetSubHeader styles={styles} title="Vitals" onBack={onBack} />

      <Text style={styles.fieldLabel}>Blood Pressure</Text>
      <View style={styles.bpRow}>
        <TextInput
          testID="quick-log-vitals-systolic"
          style={styles.bpInput}
          value={systolic}
          onChangeText={setSystolic}
          placeholder="120"
          placeholderTextColor={colors.textMuted}
          keyboardType="numeric"
          accessibilityLabel="Systolic"
        />
        <Text style={styles.bpSlash}>/</Text>
        <TextInput
          testID="quick-log-vitals-diastolic"
          style={styles.bpInput}
          value={diastolic}
          onChangeText={setDiastolic}
          placeholder="80"
          placeholderTextColor={colors.textMuted}
          keyboardType="numeric"
          accessibilityLabel="Diastolic"
        />
      </View>

      <Text style={styles.fieldLabel}>Heart Rate</Text>
      <TextInput
        testID="quick-log-vitals-hr"
        style={styles.hrInput}
        value={heartRate}
        onChangeText={setHeartRate}
        placeholder="72"
        placeholderTextColor={colors.textMuted}
        keyboardType="numeric"
        accessibilityLabel="Heart rate"
      />

      <SheetSaveButton
        styles={styles}
        label={saving ? 'Saving…' : 'Save reading'}
        disabled={!canSave}
        testID="quick-log-vitals-save"
        onPress={() => void handleSave()}
      />
    </>
  );
}

// ============================================================================
// SHARED SHEET-PRIMITIVES — back row + save button.
// ============================================================================

function SheetSubHeader({
  styles,
  title,
  onBack,
}: {
  styles: ReturnType<typeof createStyles>;
  title: string;
  onBack: () => void;
}) {
  return (
    <View style={styles.subHeader}>
      <TouchableOpacity
        onPress={onBack}
        style={styles.backRow}
        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        accessibilityRole="button"
        accessibilityLabel="Back"
        testID="quick-log-back"
      >
        <Text style={styles.backArrow}>{'‹'}</Text>
        <Text style={styles.backLabel}>Back</Text>
      </TouchableOpacity>
      <Text style={styles.subTitle}>{title}</Text>
    </View>
  );
}

function SheetSaveButton({
  styles,
  label,
  disabled,
  onPress,
  testID,
}: {
  styles: ReturnType<typeof createStyles>;
  label: string;
  disabled: boolean;
  onPress: () => void;
  testID?: string;
}) {
  return (
    <TouchableOpacity
      style={[styles.saveBtn, disabled && styles.saveBtnDisabled]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.85}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      testID={testID}
    >
      <Text style={styles.saveBtnText}>{label}</Text>
    </TouchableOpacity>
  );
}

const createStyles = (c: any) =>
  StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: c.overlay || 'rgba(0,0,0,0.6)',
      justifyContent: 'flex-end',
    },
    sheet: {
      backgroundColor: c.menuSurface || c.glass,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      paddingHorizontal: 20,
      paddingTop: 8,
      paddingBottom: 32, // allow: bottom safe-area inset
      maxHeight: '85%',
    },
    handle: {
      width: 40,
      height: 4,
      borderRadius: 2,
      backgroundColor: c.glassBorder,
      alignSelf: 'center',
      marginBottom: 14, // allow: off-scale handle gap
    },
    title: {
      fontSize: 18,
      fontWeight: '600',
      color: c.textPrimary,
      marginBottom: 12,
    },
    subHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      marginBottom: 16, // allow: sub-header to body rhythm
    },
    backRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingVertical: 4,
      paddingRight: 8,
    },
    backArrow: {
      fontSize: 24,
      color: c.textSecondary,
      lineHeight: 24,
    },
    backLabel: {
      fontSize: 13,
      color: c.textSecondary,
    },
    subTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: c.textPrimary,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 14, // allow: tap-target padding (Apple HIG ≥44pt)
      paddingHorizontal: 4,
      borderBottomWidth: 0.5,
      borderBottomColor: c.glassBorder,
      gap: 14,
    },
    rowIcon: {
      fontSize: 18,
      color: c.textSecondary,
      width: 24,
      textAlign: 'center',
    },
    rowLabel: {
      flex: 1,
      fontSize: 15,
      fontWeight: '500',
      color: c.textPrimary,
    },
    rowChevron: {
      fontSize: 18,
      color: c.textMuted,
    },
    chipRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 12, // allow: tap-target padding (Apple HIG ≥44pt)
      paddingHorizontal: 4,
      borderBottomWidth: 0.5,
      borderBottomColor: c.glassBorder,
      gap: 14,
    },
    chipRowIcon: {
      fontSize: 18,
      width: 24,
      textAlign: 'center',
    },
    chipRowLabel: {
      fontSize: 15,
      fontWeight: '500',
      color: c.textPrimary,
      width: 56,
    },
    chips: {
      flex: 1,
      flexDirection: 'row',
      gap: 8,
      justifyContent: 'flex-end',
    },
    chip: {
      minWidth: 40,
      paddingVertical: 8,
      paddingHorizontal: 12, // allow: chip tap-target
      backgroundColor: c.accentLight,
      borderWidth: 0.5,
      borderColor: c.accentBorder,
      borderRadius: 8,
      alignItems: 'center',
    },
    chipText: {
      fontSize: 13,
      fontWeight: '600',
      color: c.accent,
    },
    fieldLabel: {
      fontSize: 9,
      fontWeight: '600',
      letterSpacing: 1.5,
      textTransform: 'uppercase',
      color: c.textTertiary,
      marginTop: 8,
      marginBottom: 6,
    },
    bpRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      marginBottom: 6,
    },
    bpInput: {
      flex: 1,
      backgroundColor: c.surfaceElevated,
      borderWidth: 0.5,
      borderColor: c.glassBorder,
      borderRadius: 12,
      paddingHorizontal: 14, // allow: tap-target padding (Apple HIG ≥44pt)
      paddingVertical: 14, // allow: tap-target padding (Apple HIG ≥44pt)
      fontSize: 18,
      color: c.textPrimary,
      textAlign: 'center',
    },
    bpSlash: {
      fontSize: 18,
      color: c.textMuted,
    },
    hrInput: {
      backgroundColor: c.surfaceElevated,
      borderWidth: 0.5,
      borderColor: c.glassBorder,
      borderRadius: 12,
      paddingHorizontal: 14, // allow: tap-target padding (Apple HIG ≥44pt)
      paddingVertical: 14, // allow: tap-target padding (Apple HIG ≥44pt)
      fontSize: 18,
      color: c.textPrimary,
      textAlign: 'center',
      marginBottom: 6,
    },
    saveBtn: {
      marginTop: 16, // allow: footer button gap above keyboard
      backgroundColor: c.accent,
      borderRadius: 14,
      paddingVertical: 14, // allow: tap-target padding (Apple HIG ≥44pt)
      alignItems: 'center',
    },
    saveBtnDisabled: {
      opacity: 0.5,
    },
    saveBtnText: {
      fontSize: 14,
      fontWeight: '600',
      color: '#0a1510',
    },
  });

export default QuickLogSheet;
