// ============================================================================
// SCREEN HEADER
// Unified header pattern for all main screens (TODAY, HUB, FAMILY)
// ============================================================================

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Colors } from '../../theme/theme-tokens';

interface RightAction {
  type: 'button' | 'icon';
  icon?: string;
  label?: string;
  onPress: () => void;
  variant?: 'default' | 'purple' | 'gold';
}

interface ScreenHeaderProps {
  label?: string;
  title: string;
  subtitle?: string;
  rightAction?: RightAction;
}

export const ScreenHeader: React.FC<ScreenHeaderProps> = ({
  label,
  title,
  subtitle,
  rightAction,
}) => {
  const renderRightAction = () => {
    if (!rightAction) return null;

    if (rightAction.type === 'button') {
      const isVariant = rightAction.variant === 'purple' || rightAction.variant === 'gold';
      const variantColors = {
        purple: { bg: Colors.purpleLight, border: Colors.purpleBorder, text: Colors.purple },
        gold: { bg: Colors.goldLight, border: Colors.goldBorder, text: Colors.gold },
        default: { bg: Colors.surface, border: Colors.border, text: Colors.textSecondary },
      };
      const colors = variantColors[rightAction.variant || 'default'];

      return (
        <TouchableOpacity
          style={[
            styles.actionButton,
            { backgroundColor: colors.bg, borderColor: colors.border }
          ]}
          onPress={rightAction.onPress}
        >
          {rightAction.icon && (
            <Text style={styles.actionIcon}>{rightAction.icon}</Text>
          )}
          {rightAction.label && (
            <Text style={[styles.actionLabel, { color: colors.text }]}>
              {rightAction.label}
            </Text>
          )}
        </TouchableOpacity>
      );
    }

    // Icon button
    return (
      <TouchableOpacity
        style={styles.iconButton}
        onPress={rightAction.onPress}
      >
        <Text style={styles.iconButtonIcon}>{rightAction.icon}</Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.left}>
        {label && <Text style={styles.label}>{label}</Text>}
        <Text style={styles.title}>{title}</Text>
        {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
      </View>
      {renderRightAction()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 16,
  },
  left: {
    flex: 1,
    paddingRight: 12,
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.5,
    color: Colors.accent,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  title: {
    fontSize: 28,
    fontWeight: '300',
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.textMuted,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    gap: 6,
  },
  actionIcon: {
    fontSize: 16,
  },
  actionLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconButtonIcon: {
    fontSize: 20,
  },
});
