// ============================================================================
// TOMORROW ROW - Links to calendar view from timeline
// ============================================================================

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Colors } from '../../app/_theme/theme-tokens';
import { addDays } from 'date-fns';

interface TomorrowRowProps {
  itemCount: number;
}

export const TomorrowRow: React.FC<TomorrowRowProps> = ({ itemCount }) => {
  const router = useRouter();

  const handlePress = () => {
    const tomorrow = addDays(new Date(), 1);
    router.push({
      pathname: '/calendar' as any,
      params: { selectedDate: tomorrow.toISOString() },
    });
  };

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={handlePress}
      activeOpacity={0.7}
    >
      {/* Timeline connector */}
      <View style={styles.connector}>
        <View style={styles.circle} />
      </View>

      {/* Content */}
      <View style={styles.content}>
        <Text style={styles.label}>TOMORROW</Text>
        <Text style={styles.subtitle}>
          {itemCount} item{itemCount !== 1 ? 's' : ''} scheduled
        </Text>
      </View>

      <Text style={styles.arrow}>→</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 8,
    opacity: 0.6,
  },
  connector: {
    width: 28,
    alignItems: 'center',
  },
  circle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: Colors.border,
  },
  content: {
    flex: 1,
    paddingLeft: 12,
  },
  label: {
    fontSize: 11,
    color: Colors.textMuted,
  },
  subtitle: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 1,
  },
  arrow: {
    fontSize: 18,
    color: Colors.accent,
  },
});
