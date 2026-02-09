import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, Spacing } from '../../theme/theme-tokens';

interface Props {
  title: string;
  children: React.ReactNode;
}

export function ShiftSection({ title, children }: Props) {
  if (!children) return null;

  return (
    <View>
      <Text style={styles.sectionHeader}>{title}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  sectionHeader: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: Colors.textMuted,
    marginBottom: Spacing.md,
    marginTop: Spacing.lg,
  },
});
