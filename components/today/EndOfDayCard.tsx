// ============================================================================
// END OF DAY CARD - Evening reflection prompt (Purple)
// ============================================================================

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Colors } from '../../theme/theme-tokens';

interface EndOfDayCardProps {
  careRecipientName: string;
}

export const EndOfDayCard: React.FC<EndOfDayCardProps> = ({
  careRecipientName,
}) => {
  const router = useRouter();

  const handleLogMood = () => {
    router.push('/log-evening-wellness');
  };

  const handleAddNote = () => {
    router.push('/log-note');
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.moonIcon}>🌙</Text>
        <Text style={styles.label}>END OF DAY</Text>
      </View>

      <Text style={styles.prompt}>How was {careRecipientName}'s day overall?</Text>

      <View style={styles.buttons}>
        <TouchableOpacity
          style={styles.button}
          onPress={handleLogMood}
          accessibilityLabel={`Log mood for ${careRecipientName}`}
          accessibilityRole="button"
        >
          <Text style={styles.buttonIcon}>😊</Text>
          <Text style={styles.buttonText}>Log mood</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.button}
          onPress={handleAddNote}
          accessibilityLabel={`Add note for ${careRecipientName}`}
          accessibilityRole="button"
        >
          <Text style={styles.buttonIcon}>📝</Text>
          <Text style={styles.buttonText}>Add note</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.purpleLight,
    borderWidth: 1,
    borderColor: Colors.purpleBorder,
    borderRadius: 14,
    padding: 14,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  moonIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  label: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.5,
    color: Colors.purple,
  },
  prompt: {
    fontSize: 14,
    color: Colors.textPrimary,
    marginBottom: 12,
  },
  buttons: {
    flexDirection: 'row',
    gap: 8,
  },
  button: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: Colors.border,
    borderWidth: 1,
    borderColor: Colors.purpleBorder,
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  buttonIcon: {
    fontSize: 14,
  },
  buttonText: {
    fontSize: 13,
    color: Colors.textPrimary,
  },
});
