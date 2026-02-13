// ============================================================================
// COFFEE INLINE TRIGGER - Contextual, Minimal
// Appears after emotionally heavy tasks or detected friction
// "☕ Pause for a minute" - one line, gentle suggestion
// ============================================================================

import React from 'react';
import { TouchableOpacity, Text, View, StyleSheet } from 'react-native';

import { Colors } from '../theme/theme-tokens';
interface CoffeeInlineTriggerProps {
  onPress: () => void;
  microcopy?: string;
}

export const CoffeeInlineTrigger: React.FC<CoffeeInlineTriggerProps> = ({
  onPress,
  microcopy = 'Pause for a minute',
}) => {
  return (
    <TouchableOpacity
      style={styles.container}
      onPress={onPress}
      activeOpacity={0.7}
      accessible={true}
      accessibilityRole="button"
      accessibilityLabel={microcopy}
      accessibilityHint="Opens a brief pause moment"
    >
      <Text style={styles.icon}>☕</Text>
      <Text style={styles.text}>{microcopy}</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(232, 155, 95, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(232, 155, 95, 0.2)',
    borderRadius: 12,
    marginVertical: 12,
  },
  icon: {
    fontSize: 20,
  },
  text: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontStyle: 'italic',
  },
});

export default CoffeeInlineTrigger;
