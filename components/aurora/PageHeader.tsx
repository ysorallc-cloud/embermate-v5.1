import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Colors, Spacing, Typography } from '../../theme/theme-tokens';

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
  <View style={styles.container} accessibilityRole="header">
    {onBack && (
      <TouchableOpacity
        onPress={onBack}
        style={styles.backButton}
        accessible={true}
        accessibilityRole="button"
        accessibilityLabel="Go back"
        accessibilityHint="Returns to previous screen"
      >
        <Text style={styles.backIcon} importantForAccessibility="no-hide-descendants">←</Text>
      </TouchableOpacity>
    )}
    <View style={styles.titleContainer}>
      {category && (
        <Text style={styles.category} accessibilityRole="text">
          {category}
        </Text>
      )}
      <Text style={styles.title} accessibilityRole="header">
        {title}
      </Text>
    </View>
    {actionIcon && onAction && (
      <TouchableOpacity
        onPress={onAction}
        style={styles.actionButton}
        accessible={true}
        accessibilityRole="button"
        accessibilityLabel="Action"
        accessibilityHint="Performs page action"
      >
        <Text style={styles.actionIcon} importantForAccessibility="no-hide-descendants">{actionIcon}</Text>
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
