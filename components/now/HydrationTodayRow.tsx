// ============================================================================
// HYDRATION TODAY ROW
//
// Standalone Now-tab tracker for cups of water — separate from the schedule
// timeline so it's always visible at a glance. Single tap on `+` adds one
// cup; long-press opens a small picker for +1 / +2 / +4 (e.g. "she just
// drank a full bottle"). Tap on the row body opens the detail sheet for
// edits (existing /log-water flow).
//
// Tone-anchored copy:
//   • Eyebrow:  "HYDRATION TODAY"
//   • Big:      "{n} cup" / "{n} cups"
//   • Subtitle: "Goal: N cups" or "—" — never "Configure hydration target".
// ============================================================================

import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  Animated,
  StyleSheet,
} from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';

export interface HydrationTodayRowProps {
  cupsToday: number;
  goal?: number;
  onAddCup: (amount: number) => void;
  onRowPress: () => void;
}

const PICKER_OPTIONS: Array<{ amount: number; label: string }> = [
  { amount: 1, label: '+1 cup' },
  { amount: 2, label: '+2 cups' },
  { amount: 4, label: '+4 cups (full bottle)' },
];

export function HydrationTodayRow({
  cupsToday,
  goal,
  onAddCup,
  onRowPress,
}: HydrationTodayRowProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [pickerVisible, setPickerVisible] = useState(false);
  const scale = useRef(new Animated.Value(1)).current;

  const bounce = useCallback(() => {
    Animated.sequence([
      Animated.spring(scale, { toValue: 1.12, useNativeDriver: true, friction: 4 }),
      Animated.spring(scale, { toValue: 1, useNativeDriver: true, friction: 6 }),
    ]).start();
  }, [scale]);

  const handleSingleTap = useCallback(() => {
    onAddCup(1);
    bounce();
  }, [onAddCup, bounce]);

  const handleLongPress = useCallback(() => {
    setPickerVisible(true);
  }, []);

  const handlePickerSelect = useCallback((amount: number) => {
    setPickerVisible(false);
    onAddCup(amount);
    bounce();
  }, [onAddCup, bounce]);

  const cupsLabel = `${cupsToday} cup${cupsToday === 1 ? '' : 's'}`;
  const goalLabel = typeof goal === 'number' && goal > 0
    ? `Goal: ${goal} cup${goal === 1 ? '' : 's'}`
    : '—';
  const a11yLabel =
    typeof goal === 'number' && goal > 0
      ? `Hydration today: ${cupsLabel} of ${goal}. Tap to edit.`
      : `Hydration today: ${cupsLabel}. Tap to edit.`;

  return (
    <>
      <TouchableOpacity
        testID="hydration-today-row"
        style={styles.row}
        onPress={onRowPress}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel={a11yLabel}
        accessibilityHint="Opens the hydration log to edit cups, time, or notes."
      >
        <View style={styles.body}>
          <Text style={styles.eyebrow}>{'HYDRATION TODAY'}</Text>
          <Text style={styles.bigNumber}>{cupsLabel}</Text>
          <Text style={styles.subtitle}>{goalLabel}</Text>
        </View>

        <Animated.View style={{ transform: [{ scale }] }}>
          <TouchableOpacity
            testID="hydration-today-add"
            style={styles.plusButton}
            onPress={handleSingleTap}
            onLongPress={handleLongPress}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Add one cup of water"
            accessibilityHint="Long press for multi-cup options."
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={styles.plusGlyph}>{'+'}</Text>
          </TouchableOpacity>
        </Animated.View>
      </TouchableOpacity>

      <Modal
        visible={pickerVisible}
        animationType="fade"
        transparent
        onRequestClose={() => setPickerVisible(false)}
      >
        <TouchableOpacity
          style={styles.overlay}
          activeOpacity={1}
          onPress={() => setPickerVisible(false)}
          accessibilityRole="button"
          accessibilityLabel="Close picker"
        >
          <View style={styles.picker} accessibilityLabel="Cups picker">
            {PICKER_OPTIONS.map((opt) => (
              <TouchableOpacity
                key={opt.amount}
                testID={`hydration-today-picker-${opt.amount}`}
                style={styles.pickerRow}
                onPress={() => handlePickerSelect(opt.amount)}
                accessibilityRole="button"
                accessibilityLabel={opt.label}
              >
                <Text style={styles.pickerText}>{opt.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

const createStyles = (c: any) => StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: c.glass,
    borderWidth: 0.5,
    borderColor: c.glassBorder,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  body: {
    flex: 1,
  },
  eyebrow: {
    fontSize: 9,
    fontWeight: '500',
    letterSpacing: 0.6,
    color: c.textTertiary,
    marginBottom: 4,
  },
  bigNumber: {
    fontSize: 22,
    fontWeight: '500',
    color: c.textPrimary,
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 11,
    color: c.textSecondary,
  },
  plusButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: c.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
  },
  plusGlyph: {
    fontSize: 22,
    fontWeight: '500',
    color: c.textPrimary,
    lineHeight: 24,
  },
  overlay: {
    flex: 1,
    backgroundColor: c.overlay || 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  picker: {
    backgroundColor: (c as any).menuSurface || c.glass,
    borderWidth: 0.5,
    borderColor: c.glassBorder,
    borderRadius: 12,
    minWidth: 220,
    paddingVertical: 4,
  },
  pickerRow: {
    paddingVertical: 14, // allow: tap-target padding (Apple HIG ≥44pt)
    paddingHorizontal: 18, // allow: tap-target padding (Apple HIG ≥44pt)
  },
  pickerText: {
    fontSize: 14,
    color: c.textPrimary,
    fontWeight: '500',
  },
});

export default HydrationTodayRow;
