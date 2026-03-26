// ============================================================================
// MONTH CALENDAR — Collapsible month-view with status dots per day
// ============================================================================

import React, { useState, useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, LayoutAnimation } from 'react-native';

// ============================================================================
// TYPES
// ============================================================================

export interface DayStatus {
  date: string;               // YYYY-MM-DD
  status: 'full' | 'partial' | 'none' | 'future';
}

interface MonthCalendarProps {
  selectedDate: string;
  onDateSelect: (date: string) => void;
  dayStatuses: DayStatus[];
  visible: boolean;
}

// ============================================================================
// HELPERS
// ============================================================================

const DOW_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

function toDateStr(y: number, m: number, d: number): string {
  return `${y}-${pad2(m + 1)}-${pad2(d)}`;
}

function todayStr(): string {
  const t = new Date();
  return toDateStr(t.getFullYear(), t.getMonth(), t.getDate());
}

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfWeek(year: number, month: number): number {
  return new Date(year, month, 1).getDay();
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const DOT_COLORS: Record<DayStatus['status'], string | null> = {
  full: '#5DCAA5',
  partial: '#c8a44e',
  none: 'rgba(200,195,180,0.15)',
  future: null,
};

// ============================================================================
// COMPONENT
// ============================================================================

export function MonthCalendar({ selectedDate, onDateSelect, dayStatuses, visible }: MonthCalendarProps) {
  const today = todayStr();
  const todayDate = new Date();
  const currentYear = todayDate.getFullYear();
  const currentMonth = todayDate.getMonth();

  // Parse selectedDate to init month view
  const selParts = selectedDate.split('-');
  const [viewYear, setViewYear] = useState(parseInt(selParts[0]));
  const [viewMonth, setViewMonth] = useState(parseInt(selParts[1]) - 1);

  const statusMap = useMemo(() => {
    const m = new Map<string, DayStatus['status']>();
    for (const ds of dayStatuses) m.set(ds.date, ds.status);
    return m;
  }, [dayStatuses]);

  if (!visible) return null;

  LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);

  const daysInMonth = getDaysInMonth(viewYear, viewMonth);
  const firstDow = getFirstDayOfWeek(viewYear, viewMonth);
  const canGoForward = viewYear < currentYear || (viewYear === currentYear && viewMonth < currentMonth);

  const navigateMonth = (delta: number) => {
    let ny = viewYear;
    let nm = viewMonth + delta;
    if (nm < 0) { nm = 11; ny--; }
    if (nm > 11) { nm = 0; ny++; }
    // Don't go past current month
    if (ny > currentYear || (ny === currentYear && nm > currentMonth)) return;
    setViewYear(ny);
    setViewMonth(nm);
  };

  // Build grid rows
  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDow; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <View style={styles.container}>
      {/* Month header */}
      <View style={styles.monthHeader}>
        <TouchableOpacity onPress={() => navigateMonth(-1)} style={styles.arrow} accessibilityLabel="Previous month">
          <Text style={styles.arrowText}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.monthLabel}>{MONTH_NAMES[viewMonth]} {viewYear}</Text>
        <TouchableOpacity
          onPress={() => navigateMonth(1)}
          style={[styles.arrow, !canGoForward && { opacity: 0.2 }]}
          disabled={!canGoForward}
          accessibilityLabel="Next month"
        >
          <Text style={styles.arrowText}>›</Text>
        </TouchableOpacity>
      </View>

      {/* Day-of-week header */}
      <View style={styles.dowRow}>
        {DOW_LABELS.map((label, i) => (
          <Text key={i} style={styles.dowLabel}>{label}</Text>
        ))}
      </View>

      {/* Day cells */}
      {Array.from({ length: cells.length / 7 }, (_, row) => (
        <View key={row} style={styles.weekRow}>
          {cells.slice(row * 7, row * 7 + 7).map((day, col) => {
            if (day === null) return <View key={col} style={styles.dayCell} />;

            const dateStr = toDateStr(viewYear, viewMonth, day);
            const isFuture = dateStr > today;
            const isSelected = dateStr === selectedDate;
            const isToday = dateStr === today;
            const status = statusMap.get(dateStr) || (isFuture ? 'future' : 'none');
            const dotColor = DOT_COLORS[status];

            return (
              <TouchableOpacity
                key={col}
                style={styles.dayCell}
                onPress={() => !isFuture && onDateSelect(dateStr)}
                disabled={isFuture}
                activeOpacity={0.7}
                accessibilityLabel={`${MONTH_NAMES[viewMonth]} ${day}${isSelected ? ', selected' : ''}${isFuture ? ', future' : ''}`}
              >
                <View style={[isSelected && styles.daySelected]}>
                  <Text style={[
                    styles.dayNumber,
                    isSelected && styles.dayNumberSelected,
                    isToday && !isSelected && styles.dayNumberToday,
                    isFuture && styles.dayNumberFuture,
                  ]}>
                    {day}
                  </Text>
                </View>
                {dotColor && <View style={[styles.statusDot, { backgroundColor: dotColor }]} />}
              </TouchableOpacity>
            );
          })}
        </View>
      ))}
    </View>
  );
}

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'rgba(74,107,93,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(74,107,93,0.1)',
    borderRadius: 14,
    padding: 16,
    marginBottom: 24,
  },
  monthHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  arrow: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  arrowText: {
    fontSize: 22,
    color: 'rgba(200,195,180,0.5)',
  },
  monthLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#eae6db',
  },
  dowRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  dowLabel: {
    flex: 1,
    textAlign: 'center',
    fontSize: 11,
    color: 'rgba(200,195,180,0.3)',
  },
  weekRow: {
    flexDirection: 'row',
  },
  dayCell: {
    flex: 1,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayNumber: {
    fontSize: 13,
    color: 'rgba(200,195,180,0.5)',
    textAlign: 'center',
  },
  dayNumberSelected: {
    color: '#eae6db',
    fontWeight: '600',
  },
  dayNumberToday: {
    color: '#5DCAA5',
  },
  dayNumberFuture: {
    color: 'rgba(200,195,180,0.15)',
  },
  daySelected: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(93,202,165,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    marginTop: 2,
  },
});
