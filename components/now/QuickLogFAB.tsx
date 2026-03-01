import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { navigate } from '../../lib/navigate';
import { useTheme } from '../../contexts/ThemeContext';

export function QuickLogFAB() {
  const { colors } = useTheme();

  return (
    <TouchableOpacity
      style={[styles.fab, { backgroundColor: colors.accent }]}
      onPress={() => navigate('/quick-log-more')}
      accessibilityLabel="Log a new entry"
      accessibilityRole="button"
      activeOpacity={0.8}
    >
      <Text style={styles.icon}>+</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    bottom: 96,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 100,
  },
  icon: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '300',
    lineHeight: 30,
  },
});
