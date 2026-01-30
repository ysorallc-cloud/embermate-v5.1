// ============================================================================
// TIMELINE - Container for timeline items on TODAY screen
// ============================================================================

import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { SwipeableTimelineItem } from './SwipeableTimelineItem';
import { TomorrowRow } from './TomorrowRow';
import { UndoToast } from '../common/UndoToast';
import { TimelineItem } from '../../types/timeline';
import { Colors } from '../../app/_theme/theme-tokens';
import { markMedicationTaken } from '../../utils/medicationStorage';
import { saveMorningWellness, saveEveningWellness } from '../../utils/wellnessCheckStorage';
import { format } from 'date-fns';

interface TimelineProps {
  items: TimelineItem[];
  tomorrowCount?: number;
  onRefresh?: () => void;
}

export const Timeline: React.FC<TimelineProps> = ({ items, tomorrowCount = 0, onRefresh }) => {
  const router = useRouter();
  const [undoItem, setUndoItem] = useState<TimelineItem | null>(null);
  const [showUndo, setShowUndo] = useState(false);

  const handleComplete = useCallback(async (item: TimelineItem) => {
    try {
      switch (item.type) {
        case 'medication':
          if (item.medicationIds) {
            for (const medId of item.medicationIds) {
              await markMedicationTaken(medId);
            }
          }
          break;
        case 'wellness-morning':
          // Quick complete with defaults (user can edit later by tapping)
          await saveMorningWellness(format(new Date(), 'yyyy-MM-dd'), {
            sleepQuality: 3,
            mood: 'managing',
            energyLevel: 3,
            completedAt: new Date(),
          });
          break;
        case 'wellness-evening':
          await saveEveningWellness(format(new Date(), 'yyyy-MM-dd'), {
            mood: 'managing',
            mealsLogged: true,
            dayRating: 3,
            completedAt: new Date(),
          });
          break;
      }

      setUndoItem(item);
      setShowUndo(true);

      // Refresh timeline
      if (onRefresh) {
        onRefresh();
      }
    } catch (error) {
      console.error('Error completing item:', error);
    }
  }, [onRefresh]);

  const handleUndo = useCallback(async () => {
    if (!undoItem) return;

    try {
      switch (undoItem.type) {
        case 'medication':
          if (undoItem.medicationIds) {
            for (const medId of undoItem.medicationIds) {
              await markMedicationTaken(medId, false);
            }
          }
          break;
        // Add other undo handlers as needed
      }

      // Refresh timeline
      if (onRefresh) {
        onRefresh();
      }
    } catch (error) {
      console.error('Error undoing:', error);
    }
  }, [undoItem, onRefresh]);

  const handlePress = useCallback((item: TimelineItem) => {
    switch (item.type) {
      case 'medication':
        const medIds = item.medicationIds?.join(',') || '';
        router.push(`/medication-confirm?ids=${medIds}` as any);
        break;
      case 'wellness-morning':
        router.push('/log-morning-wellness' as any);
        break;
      case 'wellness-evening':
        router.push('/log-evening-wellness' as any);
        break;
      case 'appointment':
        router.push('/appointments' as any);
        break;
      case 'vitals':
        router.push('/log-vitals' as any);
        break;
      default:
        break;
    }
  }, [router]);

  const getUndoMessage = (): string => {
    if (!undoItem) return '';

    switch (undoItem.type) {
      case 'medication':
        return 'Marked as taken';
      case 'wellness-morning':
      case 'wellness-evening':
        return 'Check-in completed';
      default:
        return 'Marked as done';
    }
  };

  if (items.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      <Text style={styles.label}>TODAY</Text>

      <View style={styles.list}>
        {items.map((item, index) => (
          <SwipeableTimelineItem
            key={item.id}
            item={item}
            isLast={index === items.length - 1 && tomorrowCount === 0}
            onComplete={handleComplete}
            onPress={handlePress}
            onUndo={() => handleUndo()}
          />
        ))}

        {/* Tomorrow row always shown */}
        {tomorrowCount > 0 && <TomorrowRow itemCount={tomorrowCount} />}
      </View>

      {/* Undo Toast */}
      <UndoToast
        visible={showUndo}
        message={getUndoMessage()}
        onUndo={handleUndo}
        onDismiss={() => {
          setShowUndo(false);
          setUndoItem(null);
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 24,
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.5,
    color: Colors.textMuted,
    marginBottom: 12,
  },
  list: {},
});
