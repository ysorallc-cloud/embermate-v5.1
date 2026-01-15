// ============================================================================
// QUICK LOG CARD
// Card-based expandable component for logging various patient data
// Replaces grid-based button layout
// ============================================================================

import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Colors } from '../../app/_theme/theme-tokens';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface QuickLogOption {
  id: string;
  icon: string;
  label: string;
  description: string;
  screen: string;
}

const PRIMARY_OPTIONS: QuickLogOption[] = [
  {
    id: 'symptom',
    icon: '🩹',
    label: 'Symptom',
    description: 'Pain, nausea, dizziness...',
    screen: '/log-symptom',
  },
  {
    id: 'vitals',
    icon: '❤️',
    label: 'Vitals',
    description: 'BP, glucose, weight, O2',
    screen: '/log-vitals',
  },
  {
    id: 'note',
    icon: '📝',
    label: 'Note',
    description: 'Observation or reminder',
    screen: '/log-note',
  },
];

const ADDITIONAL_OPTIONS: QuickLogOption[] = [
  {
    id: 'prn',
    icon: '💊',
    label: 'PRN Medication',
    description: 'As-needed meds taken',
    screen: '/log-prn',
  },
  {
    id: 'meal',
    icon: '🍽️',
    label: 'Meal',
    description: 'Food and fluid intake',
    screen: '/log-meal',
  },
  {
    id: 'sleep',
    icon: '😴',
    label: 'Sleep',
    description: 'Nap or rest period',
    screen: '/log-sleep',
  },
  {
    id: 'activity',
    icon: '🚶',
    label: 'Activity',
    description: 'Walking, exercise, PT',
    screen: '/log-activity',
  },
  {
    id: 'mood',
    icon: '🧠',
    label: 'Mood/Behavior',
    description: 'Mental state changes',
    screen: '/log-mood',
  },
];

export const QuickLogCard: React.FC = () => {
  const [expanded, setExpanded] = useState(false);
  const router = useRouter();

  const visibleOptions = expanded
    ? [...PRIMARY_OPTIONS, ...ADDITIONAL_OPTIONS]
    : PRIMARY_OPTIONS;

  const handleToggleExpand = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded(!expanded);
  };

  const handleOptionPress = (option: QuickLogOption) => {
    router.push(option.screen as any);
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerLabel}>QUICK LOG</Text>
        <Text style={styles.headerHelper}>Tap to add</Text>
      </View>

      {/* Options List */}
      <View style={styles.optionsList}>
        {visibleOptions.map((option, index) => (
          <TouchableOpacity
            key={option.id}
            style={[
              styles.optionRow,
              index < visibleOptions.length - 1 && styles.optionRowBorder,
            ]}
            onPress={() => handleOptionPress(option)}
            activeOpacity={0.7}
          >
            <View style={styles.optionIcon}>
              <Text style={styles.optionIconText}>{option.icon}</Text>
            </View>
            <View style={styles.optionContent}>
              <Text style={styles.optionLabel}>{option.label}</Text>
              <Text style={styles.optionDescription}>{option.description}</Text>
            </View>
            <View style={styles.addButton}>
              <Text style={styles.addButtonText}>+</Text>
            </View>
          </TouchableOpacity>
        ))}
      </View>

      {/* Expand/Collapse Button */}
      <TouchableOpacity
        style={styles.expandButton}
        onPress={handleToggleExpand}
        activeOpacity={0.7}
      >
        <Text style={styles.expandButtonText}>
          {expanded ? 'Show less' : `More options (${ADDITIONAL_OPTIONS.length})`}
        </Text>
        <Text
          style={[
            styles.expandButtonArrow,
            expanded && styles.expandButtonArrowRotated,
          ]}
        >
          ▼
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 16,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerLabel: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.5,
    color: Colors.textMuted,
    textTransform: 'uppercase',
  },
  headerHelper: {
    fontSize: 11,
    color: Colors.textMuted,
  },
  optionsList: {
    // Container for option rows
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  optionRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  optionIcon: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: Colors.accentLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  optionIconText: {
    fontSize: 17,
  },
  optionContent: {
    flex: 1,
  },
  optionLabel: {
    fontSize: 14,
    color: Colors.textPrimary,
    fontWeight: '500',
  },
  optionDescription: {
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 1,
  },
  addButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  addButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '300',
  },
  expandButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    gap: 6,
  },
  expandButtonText: {
    fontSize: 13,
    fontWeight: '500',
    color: Colors.accent,
  },
  expandButtonArrow: {
    fontSize: 10,
    color: Colors.accent,
  },
  expandButtonArrowRotated: {
    transform: [{ rotate: '180deg' }],
  },
});
