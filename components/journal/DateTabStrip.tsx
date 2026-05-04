// ============================================================================
// DATE TAB STRIP
//
// Horizontal date chips that re-center on the currently selected date, plus:
//   • Left-edge fade overlay so caregivers see the strip extends behind it.
//   • A "Jump" button on the right that opens a DatePickerPopover.
//   • A "Back to today" affordance shown when the strip is centered on a
//     non-today date.
//
// The legacy in-Journal calendar mode was retired in v6.7. The popover is
// inline (LayoutAnimation reveal) so it shares the page's layout context.
// ============================================================================

import React, { useMemo, useRef, useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../contexts/ThemeContext';
import { DatePickerPopover, DayStatus } from './DatePickerPopover';

// Enable LayoutAnimation on Android.
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// ============================================================================
// TYPES
// ============================================================================

interface DateTabStripProps {
  selectedDate: string;       // YYYY-MM-DD
  onDateSelect: (date: string) => void;
  daysToShow?: number;        // Default 4
  /** Optional per-date status indicators driving the popover dot colours. */
  dateStatuses?: Record<string, DayStatus | undefined>;
  /** Whole-percent adherence for the visible month (footer line). */
  adherencePercent?: number;
  /** Fires when the user steps months in the popover — caller refreshes
   *  status data for the visible month. */
  onPopoverMonthChange?: (year: number, month: number) => void;
}

// ============================================================================
// HELPERS
// ============================================================================

function formatDateKey(d: Date): string {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function todayKey(): string {
  return formatDateKey(new Date());
}

/** Build a strip ending on `referenceDate` with `count` days. The reference
 *  date sits on the right edge; earlier days fill to the left. */
function buildStrip(referenceDate: Date, count: number): { date: string; label: string; isToday: boolean }[] {
  const tk = todayKey();
  const out: { date: string; label: string; isToday: boolean }[] = [];
  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(referenceDate);
    d.setDate(referenceDate.getDate() - i);
    const key = formatDateKey(d);
    const isToday = key === tk;
    const label = isToday
      ? 'Today'
      : `${d.toLocaleDateString('en-US', { weekday: 'short' })} ${d.getDate()}`;
    out.push({ date: key, label, isToday });
  }
  return out;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function DateTabStrip({
  selectedDate,
  onDateSelect,
  daysToShow = 4,
  dateStatuses,
  adherencePercent,
  onPopoverMonthChange,
}: DateTabStripProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  // Phase 3: strip is centered on `selectedDate`. The reference date sits on
  // the right end of the strip; earlier days fill in to the left.
  const referenceDate = useMemo(() => {
    return new Date(`${selectedDate}T12:00:00`);
  }, [selectedDate]);
  const dates = useMemo(
    () => buildStrip(referenceDate, daysToShow),
    [referenceDate, daysToShow],
  );
  const isViewingToday = selectedDate === todayKey();

  const scrollRef = useRef<ScrollView>(null);
  useEffect(() => {
    const t = setTimeout(() => scrollRef.current?.scrollToEnd({ animated: false }), 50);
    return () => clearTimeout(t);
  }, [selectedDate]);

  const [jumpOpen, setJumpOpen] = useState(false);
  const handleJumpToggle = useCallback(() => {
    if (Platform.OS !== 'web') {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    }
    setJumpOpen((v) => !v);
  }, []);

  const handlePickerSelect = useCallback(
    (key: string) => {
      onDateSelect(key);
      if (Platform.OS !== 'web') {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      }
      setJumpOpen(false);
    },
    [onDateSelect],
  );

  const handleBackToToday = useCallback(() => {
    onDateSelect(todayKey());
  }, [onDateSelect]);

  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        <View style={styles.stripWrap}>
          <ScrollView
            ref={scrollRef}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            {dates.map(({ date, label }) => {
              const isSelected = date === selectedDate;
              return (
                <TouchableOpacity
                  key={date}
                  testID={`strip-chip-${date}`}
                  style={[styles.chip, isSelected && styles.chipSelected]}
                  onPress={() => onDateSelect(date)}
                  activeOpacity={0.7}
                  accessibilityLabel={`${label}${isSelected ? ', selected' : ''}`}
                  accessibilityRole="button"
                  accessibilityState={{ selected: isSelected }}
                >
                  <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>
                    {label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          <LinearGradient
            colors={[colors.background, 'transparent']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.fadeOverlay}
            pointerEvents="none"
          />
        </View>

        {/* Phase 4 — Back to today affordance, visible only off-today. */}
        {!isViewingToday && (
          <TouchableOpacity
            style={styles.backToTodayBtn}
            onPress={handleBackToToday}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Back to today"
            accessibilityHint="Return the strip to today and select today."
          >
            <Text style={styles.backToTodayText}>{'Back to today'}</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={styles.jumpBtn}
          onPress={handleJumpToggle}
          activeOpacity={0.7}
          accessibilityLabel="Jump to date"
          accessibilityHint="Opens a calendar to navigate to a specific date."
          accessibilityRole="button"
        >
          <Text style={styles.jumpText}>{'📅 Jump'}</Text>
        </TouchableOpacity>
      </View>

      <DatePickerPopover
        visible={jumpOpen}
        selectedDate={selectedDate}
        onSelect={handlePickerSelect}
        onClose={() => setJumpOpen(false)}
        statuses={dateStatuses}
        adherencePercent={adherencePercent}
        onMonthChange={onPopoverMonthChange}
      />
    </View>
  );
}

// ============================================================================
// STYLES
// ============================================================================

const createStyles = (c: any) => StyleSheet.create({
  wrap: {
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stripWrap: {
    flex: 1,
    position: 'relative',
  },
  scrollContent: {
    paddingRight: 8,
  },
  chip: {
    backgroundColor: 'rgba(74,107,93,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(74,107,93,0.12)',
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 16, // allow: tap-target padding (Apple HIG ≥44pt)
    marginRight: 8,
  },
  chipSelected: {
    backgroundColor: 'rgba(93,202,165,0.12)',
    borderColor: 'rgba(93,202,165,0.25)',
  },
  chipText: {
    fontSize: 13,
    color: 'rgba(200,195,180,0.45)',
  },
  chipTextSelected: {
    fontWeight: '600',
    color: '#5DCAA5',
  },
  fadeOverlay: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 16,
  },
  jumpBtn: {
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: 'rgba(183, 148, 244, 0.08)',
    borderWidth: 0.5,
    borderColor: 'rgba(183, 148, 244, 0.40)',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 4,
  },
  jumpText: {
    fontSize: 11,
    fontWeight: '500',
    color: c.caregiverAccent || c.textSecondary,
  },
  backToTodayBtn: {
    paddingHorizontal: 8,
    paddingVertical: 6,
    marginLeft: 4,
  },
  backToTodayText: {
    fontSize: 11,
    fontWeight: '500',
    color: c.accent,
  },
});
