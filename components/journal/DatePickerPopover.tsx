// ============================================================================
// DATE PICKER POPOVER — UX-restructure (Commit 7)
//
// Bottom-sheet calendar that slides up from the bottom of the screen.
// Heatmap dot palette (good/partial/missed/no-data), purple appointment
// markers per day, a collapsible info legend, and an optional streak line.
// ============================================================================

import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  LayoutAnimation,
  Platform,
} from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';

// 'no-data' is rendered as a gray heatDot for past days where the caller
// has confirmed the day exists but holds no logs.
export type DayStatus = 'good' | 'partial' | 'missed' | 'no-data';

export interface DatePickerPopoverProps {
  visible: boolean;
  selectedDate: string; // YYYY-MM-DD
  onSelect: (date: string) => void;
  onClose: () => void;
  /** Pre-computed status per visible date. Caller caches by month. */
  statuses?: Record<string, DayStatus | undefined>;
  /** YYYY-MM-DD → presence flag for an appointment marker on that day. */
  appointments?: Record<string, boolean | undefined>;
  /** Optional streak count rendered as "🔥 N days in a row". */
  streakDays?: number;
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
  appointments,
  streakDays,
  adherencePercent,
  onMonthChange,
}: DatePickerPopoverProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const seed = useMemo(() => new Date(`${selectedDate}T12:00:00`), [selectedDate]);
  const [pickerYear, setPickerYear] = useState(seed.getFullYear());
  const [pickerMonth, setPickerMonth] = useState(seed.getMonth());
  const [showLegend, setShowLegend] = useState(false);

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

  const toggleLegend = useCallback(() => {
    if (Platform.OS !== 'web') {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    }
    setShowLegend((v) => !v);
  }, []);

  if (!visible) return null;

  const dotColorFor = (s: DayStatus | undefined): string | null => {
    if (s === 'good') return colors.accent;
    if (s === 'partial') return colors.warning;
    if (s === 'missed') return colors.error;
    if (s === 'no-data') return colors.textTertiary;
    return null;
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.layer}>
        <TouchableOpacity
          style={styles.overlay}
          activeOpacity={1}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Close date picker"
        />
        <View style={styles.sheet}>
          <View style={styles.handleBar} />

          <View style={styles.titleRow}>
            <Text style={styles.title}>{'Jump to a day'}</Text>
            <TouchableOpacity
              style={styles.infoButton}
              onPress={toggleLegend}
              accessibilityRole="button"
              accessibilityLabel="Toggle legend"
              accessibilityState={{ expanded: showLegend }}
            >
              <Text style={styles.infoButtonGlyph}>{'ⓘ'}</Text>
            </TouchableOpacity>
          </View>

          {showLegend && (
            <View style={styles.legend} testID="calendar-legend">
              <LegendRow color={colors.accent} label="Good day" c={colors} />
              <LegendRow color={colors.warning} label="Partial" c={colors} />
              <LegendRow color={colors.error} label="Missed" c={colors} />
              <LegendRow color={colors.textTertiary} label="No data" c={colors} />
              <LegendRow
                color={colors.caregiverAccent || colors.textSecondary}
                label="Appointment"
                c={colors}
                marker
              />
            </View>
          )}

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
                const heatColor = dotColorFor(status);
                const hasAppointment = !!appointments?.[key];

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
                    {heatColor && !isSelected && (
                      <View
                        testID={`date-dot-${key}`}
                        style={[styles.heatDot, { backgroundColor: heatColor }]}
                      />
                    )}
                    {hasAppointment && (
                      <View
                        testID={`appt-marker-${key}`}
                        style={[
                          styles.appointmentMarker,
                          {
                            backgroundColor:
                              colors.caregiverAccent || colors.textSecondary,
                          },
                        ]}
                      />
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          ))}

          {typeof streakDays === 'number' && streakDays >= 2 && (
            <View style={styles.streakRow}>
              <Text style={styles.streakText}>
                {`🔥 ${streakDays} days in a row`}
              </Text>
            </View>
          )}

          {typeof adherencePercent === 'number' && (
            <View style={styles.footer}>
              <Text style={styles.footerText}>
                {`${Math.round(adherencePercent)}% adherence this month · tap any day`}
              </Text>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

function LegendRow({
  color,
  label,
  c,
  marker,
}: {
  color: string;
  label: string;
  c: any;
  marker?: boolean;
}) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', marginVertical: 2 }}>
      <View
        style={[
          marker
            ? { width: 8, height: 2, borderRadius: 1 }
            : { width: 6, height: 6, borderRadius: 3 },
          { backgroundColor: color, marginRight: 8 },
        ]}
      />
      <Text style={{ fontSize: 11, color: c.textSecondary }}>{label}</Text>
    </View>
  );
}

const createStyles = (c: any) =>
  StyleSheet.create({
    layer: {
      flex: 1,
      justifyContent: 'flex-end' as const,
    },
    overlay: {
      position: 'absolute' as const,
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.45)',
    },
    sheet: {
      backgroundColor: c.glass,
      borderTopLeftRadius: 16,
      borderTopRightRadius: 16,
      paddingHorizontal: 16, // allow: bottom-sheet horizontal padding
      paddingTop: 8,
      paddingBottom: 24,     // allow: home-indicator clearance
      borderTopWidth: 0.5,
      borderColor: c.glassBorder,
    },
    handleBar: {
      alignSelf: 'center' as const,
      width: 36,
      height: 4,
      borderRadius: 2,
      backgroundColor: c.glassBorder,
      marginBottom: 8,
    },
    titleRow: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      justifyContent: 'space-between' as const,
      marginBottom: 8,
    },
    title: {
      fontSize: 15,
      fontWeight: '600' as const,
      color: c.textPrimary,
    },
    infoButton: {
      width: 24,
      height: 24,
      borderRadius: 12,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
    },
    infoButtonGlyph: {
      fontSize: 14,
      color: c.textSecondary,
    },
    legend: {
      paddingVertical: 8,
      paddingHorizontal: 4,
      marginBottom: 8,
      borderTopWidth: 0.5,
      borderTopColor: c.glassBorder,
      borderBottomWidth: 0.5,
      borderBottomColor: c.glassBorder,
    },
    headerRow: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      justifyContent: 'space-between' as const,
      marginBottom: 8,
    },
    chevronBtn: {
      paddingVertical: 6,
      paddingHorizontal: 12, // allow: tap-target padding
    },
    chevronDisabled: {
      opacity: 0.4,
    },
    chevron: {
      fontSize: 16,
      color: c.textSecondary,
    },
    chevronTextDisabled: {
      color: c.textTertiary,
    },
    monthLabel: {
      fontSize: 13,
      fontWeight: '600' as const,
      color: c.textPrimary,
    },
    weekdayRow: {
      flexDirection: 'row' as const,
      paddingVertical: 4,
      marginBottom: 4,
    },
    weekdayLabel: {
      flex: 1,
      textAlign: 'center' as const,
      fontSize: 9,
      color: c.textTertiary,
    },
    weekRow: {
      flexDirection: 'row' as const,
      gap: 2,
      marginBottom: 4,
    },
    dayCellSpacer: {
      flex: 1,
      aspectRatio: 1,
    },
    dayCell: {
      flex: 1,
      aspectRatio: 1,
      borderRadius: 8,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      paddingTop: 2,
      position: 'relative' as const,
    },
    dayLabel: {
      fontSize: 11,
      color: c.textPrimary,
      fontWeight: '500' as const,
    },
    dayLabelFuture: {
      color: c.textTertiary,
      opacity: 0.5,
    },
    dayLabelSelected: {
      color: '#1f201c',
      fontWeight: '600' as const,
    },
    heatDot: {
      width: 4,
      height: 4,
      borderRadius: 2,
      marginTop: 2,
    },
    appointmentMarker: {
      position: 'absolute' as const,
      bottom: 2,
      width: 8,
      height: 1.5,
      borderRadius: 0.75,
    },
    streakRow: {
      paddingTop: 8,
      alignItems: 'center' as const,
    },
    streakText: {
      fontSize: 12,
      fontWeight: '500' as const,
      color: c.accent,
    },
    footer: {
      borderTopWidth: 0.5,
      borderTopColor: c.glassBorder,
      paddingTop: 8,
      marginTop: 8,
      alignItems: 'center' as const,
    },
    footerText: {
      fontSize: 10,
      color: c.textTertiary,
    },
  });

export default DatePickerPopover;
