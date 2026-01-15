// ============================================================================
// QUICK LOG CARD - Hybrid Design
// Core options (permanent) + Custom options (user-addable/removable)
// ============================================================================

import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ScrollView,
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Colors } from '../../app/_theme/theme-tokens';
import { CORE_OPTIONS, CUSTOM_OPTIONS, QuickLogOption } from '../../constants/quickLogOptions';
import { useQuickLogSettings } from '../../hooks/useQuickLogSettings';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export const QuickLogCard: React.FC = () => {
  const router = useRouter();
  const [showPicker, setShowPicker] = useState(false);

  // Hook to manage user's custom options (persisted)
  const {
    userOptions,      // Array of QuickLogOption user has added
    addOption,        // Function to add an option
    removeOption,     // Function to remove an option
  } = useQuickLogSettings();

  // Combine core + user options
  const visibleOptions: QuickLogOption[] = [
    ...CORE_OPTIONS,
    ...userOptions,
  ];

  // Options available to add (not already added)
  const availableToAdd = CUSTOM_OPTIONS.filter(
    opt => !userOptions.find(u => u.id === opt.id)
  );

  const handleOptionPress = (option: QuickLogOption) => {
    router.push(option.screen as any);
  };

  const handleAddOption = (option: QuickLogOption) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    addOption(option);
    setShowPicker(false);
  };

  const handleRemoveOption = (optionId: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    removeOption(optionId);
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
            accessible={true}
            accessibilityRole="button"
            accessibilityLabel={`Log ${option.label}`}
            accessibilityHint={`Opens ${option.label} logging screen`}
          >
            {/* Icon */}
            <View style={styles.optionIcon}>
              <Text style={styles.optionIconText}>{option.icon}</Text>
            </View>

            {/* Content */}
            <View style={styles.optionContent}>
              <View style={styles.optionLabelRow}>
                <Text style={styles.optionLabel}>{option.label}</Text>
                {option.isCore && (
                  <View
                    style={styles.coreBadge}
                    accessible={true}
                    accessibilityLabel="Core option, cannot be removed"
                  >
                    <Text style={styles.coreBadgeText}>CORE</Text>
                  </View>
                )}
              </View>
              <Text style={styles.optionDescription}>{option.description}</Text>
            </View>

            {/* Add Button */}
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => handleOptionPress(option)}
            >
              <Text style={styles.addButtonText}>+</Text>
            </TouchableOpacity>

            {/* Remove Button (only for non-core) */}
            {!option.isCore && (
              <TouchableOpacity
                style={styles.removeButton}
                onPress={() => handleRemoveOption(option.id)}
                accessible={true}
                accessibilityRole="button"
                accessibilityLabel={`Remove ${option.label} from Quick Log`}
                accessibilityHint="Removes this option from your Quick Log"
              >
                <Text style={styles.removeButtonText}>✕</Text>
              </TouchableOpacity>
            )}
          </TouchableOpacity>
        ))}
      </View>

      {/* Add Quick Log Type Button */}
      <TouchableOpacity
        style={styles.addTypeButton}
        onPress={() => setShowPicker(true)}
        activeOpacity={0.7}
        accessible={true}
        accessibilityRole="button"
        accessibilityLabel="Add quick log type"
        accessibilityHint="Opens picker to add more logging options"
      >
        <View style={styles.addTypeIcon}>
          <Text style={styles.addTypeIconText}>+</Text>
        </View>
        <Text style={styles.addTypeLabel}>Add quick log type...</Text>
      </TouchableOpacity>

      {/* Add Picker Modal */}
      <Modal
        visible={showPicker}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowPicker(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add to Quick Log</Text>
              <TouchableOpacity onPress={() => setShowPicker(false)}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* Helper Text */}
            <Text style={styles.modalHelper}>
              These will appear in your Quick Log for easy access.
            </Text>

            {/* Available Options */}
            <ScrollView style={styles.modalScroll}>
              {availableToAdd.length === 0 ? (
                <Text style={styles.emptyText}>
                  All options already added!
                </Text>
              ) : (
                availableToAdd.map((option) => (
                  <TouchableOpacity
                    key={option.id}
                    style={styles.pickerOption}
                    onPress={() => handleAddOption(option)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.optionIcon}>
                      <Text style={styles.optionIconText}>{option.icon}</Text>
                    </View>
                    <View style={styles.optionContent}>
                      <Text style={styles.optionLabel}>{option.label}</Text>
                      <Text style={styles.optionDescription}>{option.description}</Text>
                    </View>
                    <Text style={styles.pickerAddIcon}>+</Text>
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
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

  // Header
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

  // Options List
  optionsList: {},
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
  optionLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  optionLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.textPrimary,
  },
  optionDescription: {
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 1,
  },

  // Core Badge
  coreBadge: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  coreBadgeText: {
    fontSize: 9,
    fontWeight: '600',
    color: Colors.textMuted,
    letterSpacing: 0.3,
  },

  // Add Button (teal circle with +)
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

  // Remove Button (red circle with ✕)
  removeButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  removeButtonText: {
    color: '#EF4444',
    fontSize: 12,
    fontWeight: '600',
  },

  // Add Type Button
  addTypeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    gap: 8,
  },
  addTypeIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.accentLight,
    borderWidth: 1.5,
    borderColor: Colors.accent,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addTypeIconText: {
    color: Colors.accent,
    fontSize: 16,
    fontWeight: '300',
  },
  addTypeLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: Colors.accent,
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Colors.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '70%',
    borderWidth: 1,
    borderColor: Colors.border,
    borderBottomWidth: 0,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '500',
    color: Colors.textPrimary,
  },
  modalClose: {
    fontSize: 20,
    color: Colors.textMuted,
    padding: 4,
  },
  modalHelper: {
    fontSize: 13,
    color: Colors.textMuted,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  modalScroll: {
    paddingBottom: 40,
  },
  emptyText: {
    fontSize: 14,
    color: Colors.textMuted,
    textAlign: 'center',
    padding: 40,
  },

  // Picker Option
  pickerOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  pickerAddIcon: {
    fontSize: 20,
    color: Colors.accent,
    marginLeft: 8,
  },
});
