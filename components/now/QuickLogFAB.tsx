// ============================================================================
// QUICK LOG FAB — bottom-right floating action button on the Now tab.
//
// Pre-launch UX-1: was previously routed straight to /quick-log-more on
// tap. Now accepts an onPress handler from the parent so Now can open
// the new QuickLogSheet (Note / Vitals / Water / Meal / More picker)
// without leaving the tab.
// ============================================================================

import React from 'react';
import { TouchableOpacity, Text, View, StyleSheet } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';

export interface QuickLogFABProps {
  /** Tap handler. Now owns the open/close state for the QuickLogSheet. */
  onPress: () => void;
}

export function QuickLogFAB({ onPress }: QuickLogFABProps) {
  const { colors } = useTheme();

  return (
    <TouchableOpacity
      testID="quick-log-fab"
      style={[styles.fab, { backgroundColor: colors.accent }]}
      onPress={onPress}
      accessibilityLabel="Log a new entry — meds, vitals, meals, and more"
      accessibilityRole="button"
      activeOpacity={0.8}
    >
      <View style={styles.fabContent}>
        <Text style={styles.icon}>+</Text>
        <Text style={styles.label}>Log</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    bottom: 96,
    right: 20,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 100,
    paddingHorizontal: 18, // allow: tap-target padding (Apple HIG ≥44pt)
    paddingVertical: 14, // allow: tap-target padding (Apple HIG ≥44pt)
  },
  fabContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  icon: {
    color: '#0a0c0a',
    fontSize: 22,
    fontWeight: '300',
    lineHeight: 24,
  },
  label: {
    color: '#0a0c0a',
    fontSize: 14,
    fontWeight: '600',
  },
});
