// ============================================================================
// EMPTY CARD - No tasks scheduled (Default surface)
// ============================================================================

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Colors } from '../../theme/theme-tokens';

export const EmptyCard: React.FC = () => {
  const router = useRouter();

  const handleAddSomething = () => {
    router.push('/calendar');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.icon}>📅</Text>
      <Text style={styles.label}>SCHEDULE</Text>
      <Text style={styles.message}>No upcoming tasks scheduled.</Text>
      <Text style={styles.submessage}>
        Tap to add an appointment or medication.
      </Text>

      <TouchableOpacity
        style={styles.button}
        onPress={handleAddSomething}
        accessibilityLabel="Add an appointment or medication"
        accessibilityRole="button"
      >
        <Text style={styles.buttonText}>+ Add something</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 14,
    padding: 20,
    alignItems: 'center',
  },
  icon: {
    fontSize: 24,
    marginBottom: 8,
  },
  label: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.5,
    color: Colors.textMuted,
    marginBottom: 8,
  },
  message: {
    fontSize: 14,
    color: Colors.textPrimary,
    textAlign: 'center',
  },
  submessage: {
    fontSize: 12,
    color: Colors.textMuted,
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 16,
  },
  button: {
    backgroundColor: Colors.accentLight,
    borderWidth: 1,
    borderColor: Colors.accent,
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  buttonText: {
    fontSize: 13,
    color: Colors.accent,
    fontWeight: '500',
  },
});
