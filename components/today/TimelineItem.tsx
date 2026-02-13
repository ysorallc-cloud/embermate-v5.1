// ============================================================================
// TIMELINE ITEM - Individual timeline item with status indicators
// ============================================================================

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { navigate } from '../../lib/navigate';
import { TimelineItem as TimelineItemType } from '../../types/timeline';
import { Colors } from '../../theme/theme-tokens';
import { format } from 'date-fns';

interface Props {
  item: TimelineItemType;
  isLast: boolean;
}

export const TimelineItem: React.FC<Props> = ({ item, isLast }) => {
  const router = useRouter();

  const handlePress = () => {
    switch (item.type) {
      case 'medication':
        // Route to contextual logging if we have instance data, otherwise fallback
        if (item.instanceId && item.medicationName) {
          navigate({
            pathname: '/log-medication-plan-item',
            params: {
              medicationId: item.medicationIds?.[0] || '',
              instanceId: item.instanceId,
              scheduledTime: item.time ? format(item.time, 'HH:mm') : '',
              itemName: item.medicationName,
              itemDosage: item.dosage || '',
            },
          });
        } else {
          // Fallback to manual logging only if no Care Plan context
          const medIds = item.medicationIds?.join(',') || '';
          navigate(`/medication-confirm?ids=${medIds}`);
        }
        break;
      case 'appointment':
        navigate('/appointments');
        break;
      case 'wellness-morning':
        navigate('/log-morning-wellness');
        break;
      case 'wellness-evening':
        navigate('/log-evening-wellness');
        break;
      case 'vitals':
        navigate('/log-vitals');
        break;
    }
  };

  const circleStyles = getCircleStyles(item.status);
  const colors = getStatusColors(item.status);

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={handlePress}
      activeOpacity={0.7}
      accessibilityLabel={`${item.title}, ${formatTime(item.scheduledTime)}, ${item.status === 'done' ? 'completed' : item.status}`}
      accessibilityRole="button"
      accessibilityState={{ checked: item.status === 'done' }}
    >
      {/* Timeline connector */}
      <View style={styles.connector}>
        <View style={[styles.circle, circleStyles]}>
          {item.status === 'done' && <Text style={styles.checkmark}>✓</Text>}
          {item.status === 'available' && (
            <Text style={styles.availableIcon}>◐</Text>
          )}
        </View>

        {!isLast && (
          <View style={[styles.line, { backgroundColor: colors.line }]} />
        )}
      </View>

      {/* Content */}
      <View
        style={[
          styles.content,
          { opacity: item.status === 'done' ? 0.6 : 1 },
        ]}
      >
        {/* Time row */}
        <View style={styles.timeRow}>
          <Text style={[styles.time, { color: colors.time }]}>
            {formatTime(item.scheduledTime)}
          </Text>
          {item.status === 'available' && (
            <Text style={styles.availableLabel}>• Still available</Text>
          )}
        </View>

        {/* Title */}
        <Text style={styles.title}>{item.title}</Text>

        {/* Subtitle */}
        <Text style={[styles.subtitle, { color: colors.subtitle }]}>
          {item.subtitle}
        </Text>
      </View>
    </TouchableOpacity>
  );
};

// Helper functions
const formatTime = (date: Date): string => {
  return format(date, 'h:mm a');
};

const getCircleStyles = (status: string) => {
  switch (status) {
    case 'done':
      return {
        backgroundColor: Colors.green,
        borderColor: Colors.green,
      };
    case 'next':
      return {
        backgroundColor: 'transparent',
        borderColor: Colors.gold,
      };
    case 'available':
      return {
        backgroundColor: Colors.amberBrightTint,
        borderColor: 'rgba(251, 191, 36, 0.4)',
      };
    default: // upcoming
      return {
        backgroundColor: 'transparent',
        borderColor: Colors.border,
      };
  }
};

const getStatusColors = (status: string) => {
  switch (status) {
    case 'done':
      return {
        time: Colors.textMuted,
        subtitle: Colors.green,
        line: Colors.greenBorder,
      };
    case 'next':
      return {
        time: Colors.textMuted,
        subtitle: Colors.gold,
        line: Colors.border,
      };
    case 'available':
      return {
        time: Colors.amberBrightStrong,
        subtitle: Colors.textMuted,
        line: Colors.border,
      };
    default: // upcoming
      return {
        time: Colors.textMuted,
        subtitle: Colors.textMuted,
        line: Colors.border,
      };
  }
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
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
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkmark: {
    color: Colors.textPrimary,
    fontSize: 10,
    fontWeight: '600',
  },
  availableIcon: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.amberBrightStrong,
  },
  line: {
    flex: 1,
    width: 2,
    minHeight: 36,
    marginVertical: 4,
  },
  content: {
    flex: 1,
    paddingLeft: 12,
    paddingBottom: 12,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  time: {
    fontSize: 11,
  },
  availableLabel: {
    fontSize: 11,
    fontWeight: '500',
    color: Colors.amberBrightStrong,
  },
  title: {
    fontSize: 14,
    color: Colors.textPrimary,
    marginTop: 1,
  },
  subtitle: {
    fontSize: 12,
    marginTop: 1,
  },
});
