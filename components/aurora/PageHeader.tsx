import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Colors, Spacing, Typography } from '../../app/_theme/theme-tokens';

interface Props {
  category?: string;
  title: string;
  onBack?: () => void;
  actionIcon?: string;
  onAction?: () => void;
}

export const PageHeader: React.FC<Props> = ({
  category,
  title,
  onBack,
  actionIcon,
  onAction,
}) => (
  <View style={styles.container}>
    {onBack && (
      <TouchableOpacity onPress={onBack} style={styles.backButton}>
        <Text style={styles.backIcon}>←</Text>
      </TouchableOpacity>
    )}
    <View style={styles.titleContainer}>
      {category && <Text style={styles.category}>{category}</Text>}
      <Text style={styles.title}>{title}</Text>
    </View>
    {actionIcon && onAction && (
      <TouchableOpacity onPress={onAction} style={styles.actionButton}>
        <Text style={styles.actionIcon}>{actionIcon}</Text>
      </TouchableOpacity>
    )}
  </View>
);

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.lg,
    marginBottom: Spacing.xxl,
  },
  backButton: {
    backgroundColor: Colors.glass,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    borderRadius: 14,
    padding: Spacing.md,
  },
  backIcon: {
    fontSize: 18,
    color: Colors.textSecondary,
  },
  titleContainer: {
    flex: 1,
  },
  category: {
    ...Typography.caption,
    color: Colors.textMuted,
    marginBottom: 2,
  },
  title: {
    ...Typography.displaySmall,
    color: Colors.textPrimary,
  },
  actionButton: {
    backgroundColor: Colors.glass,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    borderRadius: 12,
    padding: Spacing.md,
  },
  actionIcon: {
    fontSize: 16,
  },
});

export default PageHeader;
