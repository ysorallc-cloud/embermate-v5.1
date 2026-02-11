import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Colors } from '../../theme/theme-tokens';
import { BaselineCategory, CategoryBaseline, getBaselineLanguage } from '../../utils/baselineStorage';

interface BaselineConfirmPromptProps {
  category: BaselineCategory;
  baseline: CategoryBaseline;
  onYes: () => void;
  onNotReally: () => void;
  onDismiss: () => void;
}

function getCategoryLabel(category: BaselineCategory): string {
  switch (category) {
    case 'meals':
      return 'Meals';
    case 'vitals':
      return 'Vitals';
    case 'meds':
      return 'Medications';
    default:
      return category;
  }
}

function getBaselineDescription(category: BaselineCategory, dailyCount: number): string {
  const { adverb } = getBaselineLanguage('tentative'); // Use soft language

  switch (category) {
    case 'meals':
      return `Meals are ${adverb} logged ${dailyCount} time${dailyCount !== 1 ? 's' : ''} per day.`;
    case 'vitals':
      return `Vitals are ${adverb} checked ${dailyCount} time${dailyCount !== 1 ? 's' : ''} per day.`;
    case 'meds':
      return `${dailyCount} medication${dailyCount !== 1 ? 's' : ''} ${adverb} taken per day.`;
    default:
      return '';
  }
}

export const BaselineConfirmPrompt: React.FC<BaselineConfirmPromptProps> = ({
  category,
  baseline,
  onYes,
  onNotReally,
  onDismiss,
}) => {
  return (
    <View style={styles.container}>
      <Text style={styles.message}>
        {getBaselineDescription(category, baseline.dailyCount)} Does this sound right?
      </Text>
      <View style={styles.buttons}>
        <TouchableOpacity
          style={styles.yesButton}
          onPress={onYes}
          accessibilityLabel={`Yes, ${getCategoryLabel(category)} baseline is correct`}
          accessibilityRole="button"
        >
          <Text style={styles.yesText}>Yes</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.notReallyButton}
          onPress={onNotReally}
          accessibilityLabel={`No, ${getCategoryLabel(category)} baseline is not correct`}
          accessibilityRole="button"
        >
          <Text style={styles.notReallyText}>Not really</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.dismissButton}
          onPress={onDismiss}
          accessibilityLabel={`Dismiss ${getCategoryLabel(category)} baseline prompt`}
          accessibilityRole="button"
        >
          <Text style={styles.dismissText}>Dismiss</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
  },
  message: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.7)',
    lineHeight: 18,
    marginBottom: 10,
  },
  buttons: {
    flexDirection: 'row',
    gap: 8,
  },
  yesButton: {
    backgroundColor: 'rgba(94, 234, 212, 0.15)',
    borderRadius: 6,
    paddingVertical: 6,
    paddingHorizontal: 14,
  },
  yesText: {
    fontSize: 13,
    fontWeight: '500',
    color: Colors.accent,
  },
  notReallyButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: 6,
    paddingVertical: 6,
    paddingHorizontal: 14,
  },
  notReallyText: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.6)',
  },
  dismissButton: {
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  dismissText: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.4)',
  },
});
