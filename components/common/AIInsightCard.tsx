// ============================================================================
// AI INSIGHT CARD - Displays pattern-based, supportive insights
// Read-only, non-nagging, confidence-filtered
// ============================================================================

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ViewStyle } from 'react-native';
import { Colors, Spacing, BorderRadius } from '../../theme/theme-tokens';
import { AIInsight, InsightType } from '../../utils/insightRules';
import { ComponentRole } from '../../types/componentRoles';

// ============================================================================
// TYPES
// ============================================================================

export interface AIInsightCardProps {
  /** The insight to display */
  insight: AIInsight;

  /** Number of additional insights available */
  additionalCount?: number;

  /** Press handler for "see more" action */
  onSeeMore?: () => void;

  /** Component role (always 'display' for insights) */
  __role?: ComponentRole;

  /** Show compact variant */
  compact?: boolean;

  /** Additional container styles */
  style?: ViewStyle;

  /** Test ID for testing */
  testID?: string;
}

// ============================================================================
// COMPONENT
// ============================================================================

export const AIInsightCard: React.FC<AIInsightCardProps> = ({
  insight,
  additionalCount = 0,
  onSeeMore,
  __role = 'display',
  compact = false,
  style,
  testID,
}) => {
  const typeColors = getTypeColors(insight.type);

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: typeColors.background, borderColor: typeColors.border },
        compact && styles.containerCompact,
        style,
      ]}
      accessible={true}
      accessibilityRole="none"
      accessibilityLabel={`Insight: ${insight.title}. ${insight.message}`}
      testID={testID}
    >
      {/* Icon */}
      <View style={[styles.iconContainer, { backgroundColor: typeColors.iconBackground }]}>
        <Text style={styles.icon}>{insight.icon}</Text>
      </View>

      {/* Content */}
      <View style={styles.content}>
        <View style={styles.labelRow}>
          <Text style={[styles.label, { color: typeColors.accent }]}>
            {getTypeLabel(insight.type)}
          </Text>
          {insight.confidence >= 0.9 && (
            <View style={styles.confidenceBadge}>
              <Text style={styles.confidenceText}>High confidence</Text>
            </View>
          )}
        </View>

        <Text style={styles.title}>{insight.title}</Text>
        <Text style={[styles.message, compact && styles.messageCompact]}>
          {insight.message}
        </Text>
      </View>

      {/* Badge for additional insights */}
      {additionalCount > 0 && (
        <TouchableOpacity
          style={styles.badge}
          onPress={onSeeMore}
          accessible={true}
          accessibilityRole="button"
          accessibilityLabel={`${additionalCount} more insights`}
          accessibilityHint="Tap to see more insights"
        >
          <Text style={styles.badgeText}>+{additionalCount}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

// ============================================================================
// LOADING STATE
// ============================================================================

export const AIInsightCardLoading: React.FC<{
  compact?: boolean;
  style?: ViewStyle;
}> = ({ compact = false, style }) => (
  <View style={[styles.container, styles.containerLoading, compact && styles.containerCompact, style]}>
    <View style={[styles.iconContainer, styles.iconLoading]}>
      <Text style={styles.icon}>✨</Text>
    </View>
    <View style={styles.content}>
      <Text style={styles.label}>ANALYZING</Text>
      <Text style={styles.loadingText}>Looking for patterns...</Text>
    </View>
  </View>
);

// ============================================================================
// EMPTY STATE
// ============================================================================

export const AIInsightCardEmpty: React.FC<{
  message?: string;
  compact?: boolean;
  style?: ViewStyle;
}> = ({
  message = 'No patterns detected right now',
  compact = false,
  style,
}) => (
  <View style={[styles.container, styles.containerEmpty, compact && styles.containerCompact, style]}>
    <View style={[styles.iconContainer, styles.iconEmpty]}>
      <Text style={styles.icon}>✓</Text>
    </View>
    <View style={styles.content}>
      <Text style={[styles.label, { color: Colors.green }]}>ALL GOOD</Text>
      <Text style={styles.title}>Everything on track</Text>
      <Text style={[styles.message, compact && styles.messageCompact]}>{message}</Text>
    </View>
  </View>
);

// ============================================================================
// HELPERS
// ============================================================================

function getTypeColors(type: InsightType): {
  background: string;
  border: string;
  accent: string;
  iconBackground: string;
} {
  switch (type) {
    case 'reinforcement':
      return {
        background: Colors.greenLight,
        border: Colors.greenBorder,
        accent: Colors.green,
        iconBackground: 'rgba(16, 185, 129, 0.2)',
      };
    case 'dependency':
      return {
        background: Colors.amberLight,
        border: Colors.amberBorder,
        accent: Colors.amber,
        iconBackground: 'rgba(245, 158, 11, 0.2)',
      };
    case 'pattern':
      return {
        background: Colors.purpleLight,
        border: Colors.purpleBorder,
        accent: Colors.purple,
        iconBackground: 'rgba(139, 92, 246, 0.2)',
      };
    case 'contextual':
    default:
      return {
        background: Colors.accentLight,
        border: Colors.accentBorder,
        accent: Colors.accent,
        iconBackground: 'rgba(20, 184, 166, 0.2)',
      };
  }
}

function getTypeLabel(type: InsightType): string {
  switch (type) {
    case 'reinforcement':
      return 'DOING GREAT';
    case 'dependency':
      return 'TIP';
    case 'pattern':
      return 'PATTERN';
    case 'contextual':
      return 'INSIGHT';
    default:
      return 'INSIGHT';
  }
}

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  container: {
    borderRadius: BorderRadius.md + 2,
    padding: 14,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  containerCompact: {
    padding: 10,
  },
  containerLoading: {
    backgroundColor: Colors.glass,
    borderColor: Colors.glassBorder,
  },
  containerEmpty: {
    backgroundColor: Colors.greenLight,
    borderColor: Colors.greenBorder,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  iconLoading: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  iconEmpty: {
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
  },
  icon: {
    fontSize: 22,
  },
  content: {
    flex: 1,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  label: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  confidenceBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  confidenceText: {
    fontSize: 9,
    fontWeight: '500',
    color: Colors.textSecondary,
  },
  title: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  message: {
    fontSize: 13,
    lineHeight: 18,
    color: Colors.textSecondary,
  },
  messageCompact: {
    fontSize: 12,
    lineHeight: 16,
  },
  loadingText: {
    fontSize: 13,
    color: Colors.textMuted,
    fontStyle: 'italic',
  },
  badge: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginLeft: 8,
    alignSelf: 'flex-start',
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
});

export default AIInsightCard;
