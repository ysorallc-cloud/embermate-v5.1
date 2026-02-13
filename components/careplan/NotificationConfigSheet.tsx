// ============================================================================
// NOTIFICATION CONFIG SHEET
// Bottom sheet for configuring per-item notification settings
// ============================================================================

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Switch,
  Modal,
  Pressable,
  ScrollView,
  Animated,
  Dimensions,
} from 'react-native';
import { Colors, Spacing } from '../../theme/theme-tokens';
import type { NotificationConfig, NotificationTiming } from '../../types/notifications';
import type { CarePlanItemType } from '../../types/carePlan';
import {
  getDefaultNotificationConfig,
  getTimingLabel,
  getFollowUpLabel,
} from '../../utils/notificationDefaults';

// ============================================================================
// TYPES
// ============================================================================

interface NotificationConfigSheetProps {
  visible: boolean;
  itemId: string;
  itemName: string;
  itemType: CarePlanItemType;
  currentConfig?: NotificationConfig;
  onSave: (config: NotificationConfig) => void;
  onClose: () => void;
}

// ============================================================================
// TIMING OPTIONS
// ============================================================================

const TIMING_OPTIONS: { value: NotificationTiming; label: string }[] = [
  { value: 'at_time', label: 'At scheduled time' },
  { value: 'before_5', label: '5 minutes before' },
  { value: 'before_15', label: '15 minutes before' },
  { value: 'before_30', label: '30 minutes before' },
  { value: 'before_60', label: '1 hour before' },
];

const FOLLOW_UP_INTERVALS: (15 | 30 | 60)[] = [15, 30, 60];

const MAX_ATTEMPTS_OPTIONS = [1, 2, 3, 4, 5];

// ============================================================================
// COMPONENT
// ============================================================================

export const NotificationConfigSheet: React.FC<NotificationConfigSheetProps> = ({
  visible,
  itemId,
  itemName,
  itemType,
  currentConfig,
  onSave,
  onClose,
}) => {
  // Get defaults for this item type
  const defaults = getDefaultNotificationConfig(itemType);

  // Local state for editing
  const [enabled, setEnabled] = useState(currentConfig?.enabled ?? defaults.enabled);
  const [timing, setTiming] = useState<NotificationTiming>(
    currentConfig?.timing ?? defaults.timing
  );
  const [followUpEnabled, setFollowUpEnabled] = useState(
    currentConfig?.followUp?.enabled ?? defaults.followUp.enabled
  );
  const [followUpInterval, setFollowUpInterval] = useState<15 | 30 | 60>(
    currentConfig?.followUp?.intervalMinutes ?? defaults.followUp.intervalMinutes
  );
  const [maxAttempts, setMaxAttempts] = useState(
    currentConfig?.followUp?.maxAttempts ?? defaults.followUp.maxAttempts
  );

  // Reset state when config changes
  useEffect(() => {
    if (visible) {
      setEnabled(currentConfig?.enabled ?? defaults.enabled);
      setTiming(currentConfig?.timing ?? defaults.timing);
      setFollowUpEnabled(currentConfig?.followUp?.enabled ?? defaults.followUp.enabled);
      setFollowUpInterval(
        currentConfig?.followUp?.intervalMinutes ?? defaults.followUp.intervalMinutes
      );
      setMaxAttempts(currentConfig?.followUp?.maxAttempts ?? defaults.followUp.maxAttempts);
    }
  }, [visible, currentConfig, defaults]);

  const handleSave = useCallback(() => {
    const config: NotificationConfig = {
      enabled,
      timing,
      followUp: {
        enabled: followUpEnabled,
        intervalMinutes: followUpInterval,
        maxAttempts,
      },
    };
    onSave(config);
    onClose();
  }, [enabled, timing, followUpEnabled, followUpInterval, maxAttempts, onSave, onClose]);

  const handleReset = useCallback(() => {
    setEnabled(defaults.enabled);
    setTiming(defaults.timing);
    setFollowUpEnabled(defaults.followUp.enabled);
    setFollowUpInterval(defaults.followUp.intervalMinutes);
    setMaxAttempts(defaults.followUp.maxAttempts);
  }, [defaults]);

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose} accessibilityLabel="Close reminder settings" accessibilityRole="button">
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()} accessibilityRole="none">
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }} accessibilityLabel="Cancel" accessibilityRole="button">
              <Text style={styles.cancelButton}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.title}>Reminder Settings</Text>
            <TouchableOpacity onPress={handleSave} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }} accessibilityLabel="Save reminder settings" accessibilityRole="button">
              <Text style={styles.saveButton}>Save</Text>
            </TouchableOpacity>
          </View>

          {/* Item Name */}
          <View style={styles.itemInfo}>
            <Text style={styles.itemName}>{itemName}</Text>
          </View>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {/* Enable Toggle */}
            <View style={styles.section}>
              <View style={styles.row}>
                <View style={styles.rowContent}>
                  <Text style={styles.rowLabel}>Reminders</Text>
                  <Text style={styles.rowDescription}>
                    Get notified when it's time for this item
                  </Text>
                </View>
                <Switch
                  value={enabled}
                  onValueChange={setEnabled}
                  trackColor={{ false: Colors.glass, true: Colors.accentLight }}
                  thumbColor={enabled ? Colors.accent : Colors.textMuted}
                />
              </View>
            </View>

            {/* Timing Section (only show if enabled) */}
            {enabled && (
              <>
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>When to remind</Text>
                  <View style={styles.optionList}>
                    {TIMING_OPTIONS.map((option) => (
                      <TouchableOpacity
                        key={option.value}
                        style={[
                          styles.optionItem,
                          timing === option.value && styles.optionItemSelected,
                        ]}
                        onPress={() => setTiming(option.value)}
                        accessibilityLabel={option.label}
                        accessibilityRole="radio"
                        accessibilityState={{ selected: timing === option.value }}
                      >
                        <Text
                          style={[
                            styles.optionText,
                            timing === option.value && styles.optionTextSelected,
                          ]}
                        >
                          {option.label}
                        </Text>
                        {timing === option.value && (
                          <Text style={styles.checkmark}>✓</Text>
                        )}
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                {/* Follow-up Section (primarily for medications) */}
                {(itemType === 'medication' || itemType === 'appointment') && (
                  <View style={styles.section}>
                    <View style={styles.row}>
                      <View style={styles.rowContent}>
                        <Text style={styles.rowLabel}>Follow-up reminders</Text>
                        <Text style={styles.rowDescription}>
                          Re-remind if not logged
                        </Text>
                      </View>
                      <Switch
                        value={followUpEnabled}
                        onValueChange={setFollowUpEnabled}
                        trackColor={{ false: Colors.glass, true: Colors.accentLight }}
                        thumbColor={followUpEnabled ? Colors.accent : Colors.textMuted}
                      />
                    </View>

                    {followUpEnabled && (
                      <>
                        {/* Interval */}
                        <Text style={styles.subSectionTitle}>Remind every</Text>
                        <View style={styles.chipRow}>
                          {FOLLOW_UP_INTERVALS.map((interval) => (
                            <TouchableOpacity
                              key={interval}
                              style={[
                                styles.chip,
                                followUpInterval === interval && styles.chipSelected,
                              ]}
                              onPress={() => setFollowUpInterval(interval)}
                              accessibilityLabel={`Remind every ${interval} minutes`}
                              accessibilityRole="radio"
                              accessibilityState={{ selected: followUpInterval === interval }}
                            >
                              <Text
                                style={[
                                  styles.chipText,
                                  followUpInterval === interval && styles.chipTextSelected,
                                ]}
                              >
                                {interval} min
                              </Text>
                            </TouchableOpacity>
                          ))}
                        </View>

                        {/* Max attempts */}
                        <Text style={styles.subSectionTitle}>Maximum reminders</Text>
                        <View style={styles.chipRow}>
                          {MAX_ATTEMPTS_OPTIONS.map((attempts) => (
                            <TouchableOpacity
                              key={attempts}
                              style={[
                                styles.chip,
                                maxAttempts === attempts && styles.chipSelected,
                              ]}
                              onPress={() => setMaxAttempts(attempts)}
                              accessibilityLabel={`Maximum ${attempts} reminder${attempts === 1 ? '' : 's'}`}
                              accessibilityRole="radio"
                              accessibilityState={{ selected: maxAttempts === attempts }}
                            >
                              <Text
                                style={[
                                  styles.chipText,
                                  maxAttempts === attempts && styles.chipTextSelected,
                                ]}
                              >
                                {attempts}
                              </Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                      </>
                    )}
                  </View>
                )}
              </>
            )}

            {/* Reset to Defaults */}
            <TouchableOpacity
              style={styles.resetButton}
              onPress={handleReset}
              accessibilityLabel="Reset to defaults"
              accessibilityRole="button"
            >
              <Text style={styles.resetButtonText}>Reset to defaults</Text>
            </TouchableOpacity>

            {/* Bottom spacing */}
            <View style={{ height: 40 }} />
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

// ============================================================================
// STYLES
// ============================================================================

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: Colors.background,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: SCREEN_HEIGHT * 0.75,
    paddingBottom: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.glassBorder,
  },
  cancelButton: {
    fontSize: 16,
    color: Colors.textSecondary,
  },
  title: {
    fontSize: 17,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  saveButton: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.accent,
  },
  itemInfo: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.glassBorder,
  },
  itemName: {
    fontSize: 15,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  content: {
    paddingHorizontal: 16,
  },
  section: {
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.glassBorder,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rowContent: {
    flex: 1,
    marginRight: 12,
  },
  rowLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.textPrimary,
  },
  rowDescription: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  optionList: {
    gap: 2,
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: 'transparent',
  },
  optionItemSelected: {
    backgroundColor: Colors.accentLight,
  },
  optionText: {
    fontSize: 15,
    color: Colors.textPrimary,
  },
  optionTextSelected: {
    color: Colors.accent,
    fontWeight: '500',
  },
  checkmark: {
    fontSize: 16,
    color: Colors.accent,
    fontWeight: '600',
  },
  subSectionTitle: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 16,
    marginBottom: 8,
  },
  chipRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  chip: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: Colors.glass,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
  },
  chipSelected: {
    backgroundColor: Colors.accentLight,
    borderColor: Colors.accentBorder,
  },
  chipText: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  chipTextSelected: {
    color: Colors.accent,
    fontWeight: '500',
  },
  resetButton: {
    alignItems: 'center',
    paddingVertical: 16,
    marginTop: 8,
  },
  resetButtonText: {
    fontSize: 14,
    color: Colors.textMuted,
    textDecorationLine: 'underline',
  },
});

export default NotificationConfigSheet;
