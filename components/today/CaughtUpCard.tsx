// ============================================================================
// CAUGHT UP CARD - All done for today (Green)
// ============================================================================

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '../../app/_theme/theme-tokens';

export const CaughtUpCard: React.FC = () => {
  return (
    <View style={styles.container}>
      <View style={styles.checkContainer}>
        <Text style={styles.checkIcon}>✓</Text>
      </View>

      <View style={styles.content}>
        <Text style={styles.label}>ALL DONE FOR TODAY</Text>
        <Text style={styles.title}>Great job! Rest up.</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.greenLight,
    borderWidth: 1,
    borderColor: Colors.greenBorder,
    borderRadius: 14,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkContainer: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  checkIcon: {
    fontSize: 18,
    color: Colors.green,
  },
  content: {
    flex: 1,
  },
  label: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.5,
    color: Colors.green,
    marginBottom: 2,
  },
  title: {
    fontSize: 14,
    color: Colors.textPrimary,
  },
});
