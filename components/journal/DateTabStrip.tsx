// ============================================================================
// DATE TAB STRIP — Horizontal scrollable date chips + calendar toggle
// ============================================================================

import React, { useMemo, useRef, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';

// ============================================================================
// TYPES
// ============================================================================

interface DateTabStripProps {
  selectedDate: string;       // YYYY-MM-DD
  onDateSelect: (date: string) => void;
  daysToShow?: number;        // Default 7
  onCalendarToggle: () => void;
  calendarOpen: boolean;
}

// ============================================================================
// HELPERS
// ============================================================================

function getDates(count: number): { date: string; label: string }[] {
  const today = new Date();
  const results: { date: string; label: string }[] = [];
  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const dateStr = `${yyyy}-${mm}-${dd}`;
    const label = i === 0
      ? 'Today'
      : `${d.toLocaleDateString('en-US', { weekday: 'short' })} ${d.getDate()}`;
    results.push({ date: dateStr, label });
  }
  return results;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function DateTabStrip({
  selectedDate,
  onDateSelect,
  daysToShow = 7,
  onCalendarToggle,
  calendarOpen,
}: DateTabStripProps) {
  const dates = useMemo(() => getDates(daysToShow), [daysToShow]);
  const scrollRef = useRef<ScrollView>(null);

  // Auto-scroll to end (today) on mount
  useEffect(() => {
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: false }), 50);
  }, []);

  return (
    <View style={styles.container}>
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
      <TouchableOpacity
        style={[styles.calendarBtn, calendarOpen && styles.calendarBtnOpen]}
        onPress={onCalendarToggle}
        activeOpacity={0.7}
        accessibilityLabel={calendarOpen ? 'Close calendar' : 'Open calendar'}
        accessibilityRole="button"
      >
        <Text style={styles.calendarIcon}>📅</Text>
      </TouchableOpacity>
    </View>
  );
}

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
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
    paddingHorizontal: 16,
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
  calendarBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(74,107,93,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(74,107,93,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 4,
  },
  calendarBtnOpen: {
    backgroundColor: 'rgba(93,202,165,0.12)',
    borderColor: 'rgba(93,202,165,0.25)',
  },
  calendarIcon: {
    fontSize: 16,
  },
});
