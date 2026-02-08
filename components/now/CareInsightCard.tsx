// ============================================================================
// CARE INSIGHT CARD - Pattern-based supportive guidance
// Only shown when it adds unique value beyond Next Up card
// ============================================================================

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import type { CareInsight } from '../../utils/nowHelpers';

interface CareInsightCardProps {
  careInsight: CareInsight | null;
  hasNextUp: boolean;
}

export function CareInsightCard({ careInsight, hasNextUp }: CareInsightCardProps) {
  if (!careInsight) return null;

  // Only show when it adds unique value beyond Next Up card
  const shouldShow =
    !hasNextUp ||
    careInsight.type === 'reinforcement' ||
    careInsight.type === 'dependency' ||
    careInsight.confidence >= 0.8;

  if (!shouldShow) return null;

  return (
    <View style={[
      styles.careInsightCard,
      careInsight.type === 'reinforcement' && styles.careInsightReinforcement,
      careInsight.type === 'pattern' && styles.careInsightPattern,
      careInsight.type === 'preventative' && styles.careInsightPreventative,
      careInsight.type === 'dependency' && styles.careInsightDependency,
    ]}>
      <View style={styles.careInsightHeader}>
        <Text style={styles.careInsightLabel}>CARE INSIGHT</Text>
      </View>
      <View style={styles.careInsightBody}>
        <Text style={styles.careInsightIcon}>{careInsight.icon}</Text>
        <View style={styles.careInsightContent}>
          <Text style={styles.careInsightTitle}>{careInsight.title}</Text>
          <Text style={styles.careInsightMessage}>{careInsight.message}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  careInsightCard: {
    backgroundColor: 'rgba(139, 92, 246, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.15)',
    borderRadius: 12,
    padding: 14,
    marginBottom: 20,
  },
  careInsightReinforcement: {
    backgroundColor: 'rgba(16, 185, 129, 0.05)',
    borderColor: 'rgba(16, 185, 129, 0.15)',
  },
  careInsightPattern: {
    backgroundColor: 'rgba(59, 130, 246, 0.05)',
    borderColor: 'rgba(59, 130, 246, 0.15)',
  },
  careInsightPreventative: {
    backgroundColor: 'rgba(251, 191, 36, 0.05)',
    borderColor: 'rgba(251, 191, 36, 0.15)',
  },
  careInsightDependency: {
    backgroundColor: 'rgba(94, 234, 212, 0.05)',
    borderColor: 'rgba(94, 234, 212, 0.15)',
  },
  careInsightHeader: {
    marginBottom: 10,
  },
  careInsightLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: 'rgba(139, 92, 246, 0.7)',
    letterSpacing: 1,
  },
  careInsightBody: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  careInsightIcon: {
    fontSize: 20,
    marginTop: 2,
  },
  careInsightContent: {
    flex: 1,
  },
  careInsightTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  careInsightMessage: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.65)',
    lineHeight: 19,
  },
});
