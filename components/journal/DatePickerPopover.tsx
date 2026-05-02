// ============================================================================
// DATE PICKER POPOVER
//
// Bottom-anchored popover that slides down from below the date strip.
// Inline (no Modal) so it shares the journal page's layout context. Driven
// by an externally-supplied `statuses` map — caller computes outcome dots
// per date when the visible month changes (so we don't recompute per cell).
// ============================================================================

import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  LayoutAnimation,
  Platform,
} from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';

export type DayStatus = 'good' | 'partial' | 'missed';

export interface DatePickerPopoverProps {
  visible: boolean;
  selectedDate: string; // YYYY-MM-DD
  onSelect: (date: string) => void;
  onClose: () => void;
  /** Pre-computed status per visible date. Caller caches by month. */
  statuses?: Record<string, DayStatus | undefined>;
  /** Optional month adherence rounded to whole percent (footer). */
  adherencePercent?: number;
  /** Fires when the user steps months — caller can refresh statuses. */
  onMonthChange?: (year: number, month: number) => void;
}

const WEEKDAY_HEADERS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

function formatDateKey(d: Date): string {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function buildMonthMatrix(year: number, month: number): (Date | null)[][] {
  const first = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0).getDate();
  const startCol = first.getDay();
  const cells: (Date | null)[] = [];
  for (let i = 0; i < startCol; i++) cells.push(null);
  for (let d = 1; d <= lastDay; d++) cells.push(new Date(year, month, d));
  while (cells.length < 42) cells.push(null);
  const rows: (Date | null)[][] = [];
  for (let i = 0; i < 6; i++) rows.push(cells.slice(i * 7, i * 7 + 7));
  return rows;
}

export function DatePickerPopover({
  visible,
  selectedDate,
  onSelect,
  onClose,
  statuses,
  adherencePercent,
  onMonthChange,
}: DatePickerPopoverProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const seed = useMemo(() => new Date(`${selectedDate}T12:00:00`), [selectedDate]);
  const [pickerYear, setPickerYear] = useState(seed.getFullYear());
  const [pickerMonth, setPickerMonth] = useState(seed.getMonth());

  const today = useMemo(() => new Date(), []);
  const todayMidnight = useMemo(() => {
    const d = new Date(today);
    d.setHours(23, 59, 59, 999);
    return d;
  }, [today]);

  const isCurrentMonth =
    pickerYear === today.getFullYear() && pickerMonth === today.getMonth();

  const monthMatrix = useMemo(
    () => buildMonthMatrix(pickerYear, pickerMonth),
    [pickerYear, pickerMonth],
  );

  const monthLabel = useMemo(
    () =>
      new Date(pickerYear, pickerMonth, 1).toLocaleDateString('en-US', {
        month: 'long',
        year: 'numeric',
      }),
    [pickerYear, pickerMonth],
  );

  const stepMonth = useCallback(
    (delta: number) => {
      let y = pickerYear;
      let m = pickerMonth + delta;
      if (m < 0) { m = 11; y--; }
      if (m > 11) { m = 0; y++; }
      // Don't navigate past the current month.
      if (delta > 0 && (y > today.getFullYear() ||
        (y === today.getFullYear() && m > today.getMonth()))) {
        return;
      }
      if (Platform.OS !== 'web') {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      }
      setPickerYear(y);
      setPickerMonth(m);
      onMonthChange?.(y, m);
    },
    [pickerYear, pickerMonth, today, onMonthChange],
  );

  const handleSelect = useCallback(
    (d: Date) => {
      if (d.getTime() > todayMidnight.getTime()) return;
      onSelect(formatDateKey(d));
    },
    [todayMidnight, onSelect],
  );

  if (!visible) return null;

  return (
    <View style={styles.layer}>
      <TouchableOpacity
        style={styles.overlay}
        activeOpacity={1}
        onPress={onClose}
        accessibilityRole="button"
        accessibilityLabel="Close date picker"
      />
      <View style={styles.card}>
        <View style={styles.headerRow}>
          <TouchableOpacity
            style={styles.chevronBtn}
            onPress={() => stepMonth(-1)}
            accessibilityRole="button"
            accessibilityLabel="Previous month"
          >
            <Text style={styles.chevron}>{'‹'}</Text>
          </TouchableOpacity>
          <Text style={styles.monthLabel}>{monthLabel}</Text>
          <TouchableOpacity
            style={[styles.chevronBtn, isCurrentMonth && styles.chevronDisabled]}
            onPress={() => stepMonth(1)}
            disabled={isCurrentMonth}
            accessibilityRole="button"
            accessibilityLabel="Next month"
            accessibilityState={{ disabled: isCurrentMonth }}
          >
            <Text style={[styles.chevron, isCurrentMonth && styles.chevronTextDisabled]}>
              {'›'}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.weekdayRow}>
          {WEEKDAY_HEADERS.map((w, i) => (
            <Text
              key={`wk-${i}`}
              testID={`weekday-${i}`}
              style={styles.weekdayLabel}
            >
              {w}
            </Text>
          ))}
        </View>

        {monthMatrix.map((row, ri) => (
          <View key={`row-${ri}`} style={styles.weekRow}>
            {row.map((cell, ci) => {
              if (!cell) return <View key={`empty-${ri}-${ci}`} style={styles.dayCellSpacer} />;
              const key = formatDateKey(cell);
              const isSelected = key === selectedDate;
              const isFuture = cell.getTime() > todayMidnight.getTime();
              const status = statuses?.[key];
              const dotColor =
                status === 'good' ? colors.accent
                : status === 'partial' ? colors.warning
                : status === 'missed' ? colors.error
                : null;

              return (
                <TouchableOpacity
                  key={`cell-${ri}-${ci}`}
                  testID={`date-cell-${key}`}
                  style={[
                    styles.dayCell,
                    isSelected && { backgroundColor: colors.accent },
                  ]}
                  onPress={() => handleSelect(cell)}
                  disabled={isFuture}
                  activeOpacity={0.7}
                  accessibilityRole="button"
                  accessibilityLabel={cell.toLocaleDateString('en-US', {
                    weekday: 'long',
                    month: 'long',
                    day: 'numeric',
                  })}
                  accessibilityState={{ selected: isSelected, disabled: isFuture }}
                >
                  <Text
                    style={[
                      styles.dayLabel,
                      isFuture && styles.dayLabelFuture,
                      isSelected && styles.dayLabelSelected,
                    ]}
                  >
                    {cell.getDate()}
                  </Text>
                  {dotColor && !isSelected && (
                    <View
                      testID={`date-dot-${key}`}
                      style={[styles.dot, { backgroundColor: dotColor }]}
                    />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        ))}

        {typeof adherencePercent === 'number' && (
          <View style={styles.footer}>
            <Text style={styles.footerText}>
              {`${Math.round(adherencePercent)}% adherence this month · tap any day`}
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}

const createStyles = (c: any) =>
  StyleSheet.create({
    layer: {
      // Inline anchor — caller positions the popover inside the page flow.
    },
    overlay: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'transparent',
    },
    card: {
      backgroundColor: c.glass,
      borderWidth: 0.5,
      borderColor: c.glassBorder,
      borderRadius: 12,
      padding: 12,
    },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 8,
    },
    chevronBtn: {
      paddingVertical: 2,
      paddingHorizontal: 6,
    },
    chevronDisabled: {
      opacity: 0.4,
    },
    chevron: {
      fontSize: 12,
      color: c.textSecondary,
    },
    chevronTextDisabled: {
      color: c.textTertiary,
    },
    monthLabel: {
      fontSize: 12,
      fontWeight: '600',
      color: c.textPrimary,
    },
    weekdayRow: {
      flexDirection: 'row',
      paddingVertical: 2,
      marginBottom: 4,
    },
    weekdayLabel: {
      flex: 1,
      textAlign: 'center',
      fontSize: 7.5,
      color: c.textTertiary,
    },
    weekRow: {
      flexDirection: 'row',
      gap: 2,
      marginBottom: 2,
    },
    dayCellSpacer: {
      flex: 1,
      aspectRatio: 1,
    },
    dayCell: {
      flex: 1,
      aspectRatio: 1,
      borderRadius: 6,
      alignItems: 'center',
      justifyContent: 'center',
    },
    dayLabel: {
      fontSize: 9,
      color: c.textPrimary,
      fontWeight: '500',
    },
    dayLabelFuture: {
      color: c.textTertiary,
      opacity: 0.5,
    },
    dayLabelSelected: {
      // Dark text fg on the sage-filled selected pill. Flipped in lockstep
      // with the Phase 0 page-bg lift (#141612 → #1f201c) so the
      // foreground/background pair retains its tonal relationship.
      color: '#1f201c',
      fontWeight: '600',
    },
    dot: {
      width: 3,
      height: 3,
      borderRadius: 1.5,
      marginTop: 2,
    },
    footer: {
      borderTopWidth: 0.5,
      borderTopColor: c.glassBorder,
      paddingTop: 8,
      marginTop: 8,
      alignItems: 'center',
    },
    footerText: {
      fontSize: 8.5,
      color: c.textTertiary,
    },
  });

export default DatePickerPopover;
