// ============================================================================
// SWIPEABLE TIMELINE ITEM
// Swipe right to complete, tap to open details
// ============================================================================

import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  PanResponder,
  Dimensions,
  TouchableOpacity,
  Vibration,
  Platform,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { Colors } from '../../app/_theme/theme-tokens';
import { TimelineItem as TimelineItemType } from '../../types/timeline';
import { format } from 'date-fns';

const SCREEN_WIDTH = Dimensions.get('window').width;
const SWIPE_THRESHOLD = 100;
const SNAP_THRESHOLD = 60;

interface Props {
  item: TimelineItemType;
  isLast: boolean;
  onComplete: (item: TimelineItemType) => void;
  onPress: (item: TimelineItemType) => void;
  onUndo: (item: TimelineItemType) => void;
}

export const SwipeableTimelineItem: React.FC<Props> = ({
  item,
  isLast,
  onComplete,
  onPress,
  onUndo,
}) => {
  const translateX = useRef(new Animated.Value(0)).current;
  const [isRevealed, setIsRevealed] = useState(false);
  const [justCompleted, setJustCompleted] = useState(false);

  // Haptic feedback
  const triggerHaptic = (type: 'light' | 'medium' | 'success') => {
    if (Platform.OS === 'ios') {
      switch (type) {
        case 'light':
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          break;
        case 'medium':
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          break;
        case 'success':
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          break;
      }
    } else {
      Vibration.vibrate(type === 'success' ? [0, 50] : [0, 10]);
    }
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        // Only respond to horizontal swipes
        return Math.abs(gestureState.dx) > 10 && Math.abs(gestureState.dy) < 10;
      },
      onPanResponderGrant: () => {
        translateX.setOffset((translateX as any)._value);
        translateX.setValue(0);
      },
      onPanResponderMove: (_, gestureState) => {
        // Only allow right swipe for completion
        if (gestureState.dx > 0) {
          translateX.setValue(gestureState.dx);

          // Haptic at threshold
          if (gestureState.dx >= SNAP_THRESHOLD && !isRevealed) {
            setIsRevealed(true);
            triggerHaptic('medium');
          } else if (gestureState.dx < SNAP_THRESHOLD && isRevealed) {
            setIsRevealed(false);
          }
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        translateX.flattenOffset();

        if (gestureState.dx >= SWIPE_THRESHOLD) {
          // Complete action
          Animated.timing(translateX, {
            toValue: SCREEN_WIDTH,
            duration: 200,
            useNativeDriver: true,
          }).start(() => {
            triggerHaptic('success');
            setJustCompleted(true);
            onComplete(item);

            // Reset position after completion
            setTimeout(() => {
              translateX.setValue(0);
            }, 100);
          });
        } else {
          // Snap back
          Animated.spring(translateX, {
            toValue: 0,
            useNativeDriver: true,
            tension: 100,
            friction: 10,
          }).start();
          setIsRevealed(false);
        }
      },
    })
  ).current;

  // Don't allow swipe on completed items
  const isSwipeable = item.status !== 'done' && !justCompleted;

  const circleStyles = getCircleStyles(item.status);
  const statusColors = getStatusColors(item.status);

  // Background revealed on swipe
  const backgroundOpacity = translateX.interpolate({
    inputRange: [0, SNAP_THRESHOLD],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  return (
    <View style={styles.container}>
      {/* Swipe Background */}
      {isSwipeable && (
        <Animated.View
          style={[
            styles.swipeBackground,
            { opacity: backgroundOpacity },
          ]}
        >
          <Text style={styles.swipeBackgroundIcon}>✓</Text>
          <Text style={styles.swipeBackgroundText}>
            Mark as {item.type === 'medication' ? 'taken' : 'done'}
          </Text>
        </Animated.View>
      )}

      {/* Main Item */}
      <Animated.View
        style={[
          styles.itemContainer,
          { transform: [{ translateX: isSwipeable ? translateX : 0 }] },
        ]}
        {...(isSwipeable ? panResponder.panHandlers : {})}
      >
        <TouchableOpacity
          style={styles.item}
          onPress={() => onPress(item)}
          activeOpacity={0.7}
        >
          {/* Timeline connector */}
          <View style={styles.connector}>
            <View style={[styles.circle, circleStyles]}>
              {item.status === 'done' && <Text style={styles.checkmark}>✓</Text>}
              {item.status === 'overdue' && <Text style={styles.exclamation}>!</Text>}
            </View>
            {!isLast && (
              <View style={[styles.line, { backgroundColor: statusColors.line }]} />
            )}
          </View>

          {/* Content */}
          <View style={[styles.content, { opacity: item.status === 'done' ? 0.6 : 1 }]}>
            <View style={styles.timeRow}>
              <Text style={[styles.time, { color: statusColors.time }]}>
                {formatTime(item.scheduledTime)}
              </Text>
              {item.status === 'overdue' && (
                <Text style={styles.overdueLabel}>• OVERDUE</Text>
              )}
            </View>
            <Text style={styles.title}>{item.title}</Text>
            <Text style={[styles.subtitle, { color: statusColors.subtitle }]}>
              {item.subtitle}
            </Text>
          </View>

          {/* Undo button for just-completed items */}
          {justCompleted && (
            <TouchableOpacity
              style={styles.undoButton}
              onPress={() => {
                setJustCompleted(false);
                onUndo(item);
              }}
            >
              <Text style={styles.undoIcon}>↩️</Text>
            </TouchableOpacity>
          )}
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
};

// Helper functions
const formatTime = (date: Date): string => {
  return format(date, 'h:mm a');
};

const getCircleStyles = (status: string) => {
  switch (status) {
    case 'done':
      return { backgroundColor: Colors.green, borderColor: Colors.green };
    case 'next':
      return { backgroundColor: 'transparent', borderColor: Colors.gold };
    case 'overdue':
      return { backgroundColor: 'transparent', borderColor: Colors.red };
    default:
      return { backgroundColor: 'transparent', borderColor: Colors.border };
  }
};

const getStatusColors = (status: string) => {
  switch (status) {
    case 'done':
      return { time: Colors.textMuted, subtitle: Colors.green, line: 'rgba(34, 197, 94, 0.3)' };
    case 'next':
      return { time: Colors.textMuted, subtitle: Colors.gold, line: Colors.border };
    case 'overdue':
      return { time: Colors.red, subtitle: Colors.red, line: 'rgba(239, 68, 68, 0.3)' };
    default:
      return { time: Colors.textMuted, subtitle: Colors.textMuted, line: Colors.border };
  }
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  swipeBackground: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    backgroundColor: 'rgba(34, 197, 94, 0.12)',
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 20,
    gap: 8,
  },
  swipeBackgroundIcon: {
    fontSize: 20,
    color: Colors.green,
  },
  swipeBackgroundText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.green,
  },
  itemContainer: {
    backgroundColor: Colors.background,
  },
  item: {
    flexDirection: 'row',
    paddingVertical: 4,
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
    fontSize: 10,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  exclamation: {
    fontSize: 10,
    color: Colors.red,
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
  undoButton: {
    paddingHorizontal: 12,
    justifyContent: 'center',
  },
  undoIcon: {
    fontSize: 18,
  },
});
