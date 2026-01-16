// ============================================================================
// TIMELINE ITEM - Individual timeline item with status indicators
// ============================================================================

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { TimelineItem as TimelineItemType } from '../../types/timeline';
import { Colors } from '../../app/_theme/theme-tokens';
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
        // Pass medication IDs as URL params
        const medIds = item.medicationIds?.join(',') || '';
        router.push(`/medication-confirm?ids=${medIds}` as any);
        break;
      case 'appointment':
        router.push('/appointments' as any);
        break;
      case 'wellness-morning':
        router.push('/log-morning-wellness' as any);
        break;
      case 'wellness-evening':
        router.push('/log-evening-wellness' as any);
        break;
      case 'vitals':
        router.push('/log-vitals' as any);
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
    >
      {/* Timeline connector */}
      <View style={styles.connector}>
        <View style={[styles.circle, circleStyles]}>
          {item.status === 'done' && <Text style={styles.checkmark}>✓</Text>}
          {item.status === 'overdue' && (
            <Text style={[styles.exclamation, { color: Colors.red }]}>!</Text>
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
          {item.status === 'overdue' && (
            <Text style={styles.overdueLabel}>• OVERDUE</Text>
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
    case 'overdue':
      return {
        backgroundColor: 'transparent',
        borderColor: Colors.red,
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
    case 'overdue':
      return {
        time: Colors.red,
        subtitle: Colors.red,
        line: Colors.redBorder,
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
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '600',
  },
  exclamation: {
    fontSize: 10,
    fontWeight: '700',
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
  overdueLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.red,
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
