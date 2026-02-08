// ============================================================================
// NEXT UP CARD - Primary Decision Engine
// Answers: "What is the next irreversible decision the caregiver must make?"
// CALM URGENCY: Only clinical items 30+ min overdue show red
// ============================================================================

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { parseTimeForDisplay } from '../../utils/nowHelpers';
import { getUrgencyStatus } from '../../utils/nowUrgency';
import { getDetailedUrgencyLabel } from '../../utils/urgency';

interface NextUpCardProps {
  nextUp: any | null;
  hasRegimenInstances: boolean;
  completedCount: number;
  onPress: (instance: any) => void;
}

export function NextUpCard({ nextUp, hasRegimenInstances, completedCount, onPress }: NextUpCardProps) {
  // Empty state: All caught up
  if (hasRegimenInstances && !nextUp && completedCount > 0) {
    return (
      <View style={styles.nextUpEmpty}>
        <Text style={styles.nextUpEmptyEmoji}>✓</Text>
        <Text style={styles.nextUpEmptyTitle}>All caught up!</Text>
        <Text style={styles.nextUpEmptySubtitle}>No scheduled items remain today.</Text>
      </View>
    );
  }

  if (!hasRegimenInstances || !nextUp) return null;

  const nextUpTime = parseTimeForDisplay(nextUp.scheduledTime);
  const urgencyInfo = getUrgencyStatus(nextUp.scheduledTime, false, nextUp.itemType);

  // Determine card styles based on Calm Urgency tier/tone
  const getCardStyle = () => {
    if (urgencyInfo.tone === 'danger') return styles.nextUpCardOverdue;
    if (urgencyInfo.tone === 'warn') return styles.nextUpCardDueSoon;
    if (urgencyInfo.tier === 'info' && urgencyInfo.status !== 'COMPLETE') return styles.nextUpCardLater;
    return null;
  };

  const getIconStyle = () => {
    if (urgencyInfo.tone === 'danger') return styles.nextUpIconOverdue;
    if (urgencyInfo.tone === 'warn') return styles.nextUpIconDueSoon;
    if (urgencyInfo.tier === 'info' && urgencyInfo.status !== 'COMPLETE') return styles.nextUpIconLater;
    return null;
  };

  const getLabelStyle = () => {
    if (urgencyInfo.tone === 'danger') return styles.nextUpLabelOverdue;
    if (urgencyInfo.tone === 'warn') return styles.nextUpLabelDueSoon;
    if (urgencyInfo.tier === 'info' && urgencyInfo.status !== 'COMPLETE') return styles.nextUpLabelLater;
    return null;
  };

  const getUrgencyLabelStyle = () => {
    if (urgencyInfo.tone === 'danger') return styles.nextUpUrgencyLabelOverdue;
    if (urgencyInfo.tone === 'warn') return styles.nextUpUrgencyLabelDueSoon;
    if (urgencyInfo.tier === 'info' && urgencyInfo.status !== 'COMPLETE') return styles.nextUpUrgencyLabelLater;
    return null;
  };

  const getActionStyle = () => {
    if (urgencyInfo.tone === 'danger') return styles.nextUpActionOverdue;
    if (urgencyInfo.tone === 'warn') return styles.nextUpActionDueSoon;
    if (urgencyInfo.tier === 'info' && urgencyInfo.status !== 'COMPLETE') return styles.nextUpActionLater;
    return null;
  };

  const displayLabel = urgencyInfo.itemUrgency
    ? getDetailedUrgencyLabel(urgencyInfo.itemUrgency)
    : urgencyInfo.label;

  return (
    <TouchableOpacity
      style={[styles.nextUpCard, getCardStyle()]}
      onPress={() => onPress(nextUp)}
      activeOpacity={0.7}
      accessible={true}
      accessibilityRole="button"
      accessibilityLabel={`${nextUp.itemName}. ${urgencyInfo.label}. Tap to log.`}
    >
      <View style={[styles.nextUpIcon, getIconStyle()]}>
        <Text style={styles.nextUpEmoji}>
          {nextUp.itemEmoji || '💊'}
        </Text>
      </View>
      <View style={styles.nextUpContent}>
        <Text style={[styles.nextUpLabel, getLabelStyle()]}>
          NEXT UP
        </Text>
        <Text style={styles.nextUpTitle}>
          {nextUp.itemName}
        </Text>
        {nextUp.instructions && (
          <Text style={styles.nextUpSubtitle} numberOfLines={1}>
            {nextUp.instructions}
          </Text>
        )}
        <Text style={[styles.nextUpProximityLabel, getUrgencyLabelStyle()]}>
          {urgencyInfo.tier === 'critical' && urgencyInfo.proximityLabel
            ? urgencyInfo.proximityLabel
            : displayLabel}
        </Text>
      </View>
      <View style={[styles.nextUpAction, getActionStyle()]}>
        <Text style={styles.nextUpActionText}>Log</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  // Default (blue)
  nextUpCard: {
    backgroundColor: 'rgba(59, 130, 246, 0.12)',
    borderWidth: 2,
    borderColor: 'rgba(59, 130, 246, 0.4)',
    borderRadius: 16,
    padding: 18,
    marginBottom: 24,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },
  nextUpIcon: {
    width: 52,
    height: 52,
    backgroundColor: 'rgba(59, 130, 246, 0.25)',
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nextUpEmoji: {
    fontSize: 26,
  },
  nextUpContent: {
    flex: 1,
  },
  nextUpLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#3B82F6',
    letterSpacing: 1.2,
    marginBottom: 4,
  },
  nextUpTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  nextUpSubtitle: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.6)',
    marginTop: 2,
  },
  nextUpProximityLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.7)',
    marginTop: 4,
  },
  nextUpAction: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nextUpActionText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  // Due Soon variant (Amber)
  nextUpCardDueSoon: {
    backgroundColor: 'rgba(251, 191, 36, 0.12)',
    borderColor: 'rgba(251, 191, 36, 0.4)',
    shadowColor: '#F59E0B',
  },
  nextUpIconDueSoon: {
    backgroundColor: 'rgba(251, 191, 36, 0.25)',
  },
  nextUpLabelDueSoon: {
    color: '#F59E0B',
  },
  nextUpUrgencyLabelDueSoon: {
    color: '#F59E0B',
  },
  nextUpActionDueSoon: {
    backgroundColor: '#F59E0B',
  },

  // Overdue variant (Red)
  nextUpCardOverdue: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderColor: 'rgba(239, 68, 68, 0.5)',
    shadowColor: '#EF4444',
  },
  nextUpIconOverdue: {
    backgroundColor: 'rgba(239, 68, 68, 0.25)',
  },
  nextUpLabelOverdue: {
    color: '#EF4444',
  },
  nextUpUrgencyLabelOverdue: {
    color: '#EF4444',
  },
  nextUpActionOverdue: {
    backgroundColor: '#EF4444',
  },

  // Later Today variant (Muted)
  nextUpCardLater: {
    backgroundColor: 'rgba(59, 130, 246, 0.08)',
    borderColor: 'rgba(59, 130, 246, 0.25)',
    borderWidth: 1,
  },
  nextUpIconLater: {
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
  },
  nextUpLabelLater: {
    color: 'rgba(59, 130, 246, 0.8)',
  },
  nextUpUrgencyLabelLater: {
    color: 'rgba(255, 255, 255, 0.5)',
  },
  nextUpActionLater: {
    backgroundColor: 'rgba(59, 130, 246, 0.6)',
  },

  // Empty state when all caught up
  nextUpEmpty: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
    borderRadius: 16,
    padding: 24,
    marginBottom: 24,
    alignItems: 'center',
  },
  nextUpEmptyEmoji: {
    fontSize: 32,
    marginBottom: 8,
  },
  nextUpEmptyTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#10B981',
    marginBottom: 4,
  },
  nextUpEmptySubtitle: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.5)',
  },
});
