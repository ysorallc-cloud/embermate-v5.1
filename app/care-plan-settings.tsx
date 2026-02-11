// ============================================================================
// CARE PLAN SETTINGS
// Screen for viewing and editing the care plan routines
// ============================================================================

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Modal,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { AuroraBackground } from '../components/aurora/AuroraBackground';
import { ScreenHeader } from '../components/ScreenHeader';
import { Colors } from '../theme/theme-tokens';
import { useCarePlan } from '../hooks/useCarePlan';
import {
  CarePlan,
  CarePlanRoutine,
  CarePlanItem,
} from '../utils/carePlanTypes';
import {
  clearCarePlan,
  ensureCarePlan,
  addItemToRoutine,
  removeItemFromRoutine,
  saveCarePlan,
} from '../utils/carePlanStorage';
import {
  CARE_PLAN_TEMPLATES,
  CarePlanTemplate,
  generateCarePlanFromTemplate,
  ITEM_TYPE_OPTIONS,
  ItemTypeOption,
  createItemFromType,
} from '../utils/carePlanDefaults';

export default function CarePlanSettingsScreen() {
  const router = useRouter();
  const {
    carePlan,
    dayState,
    loading,
    updateCarePlan,
    initializeCarePlan,
    refresh,
  } = useCarePlan();

  const [expandedRoutines, setExpandedRoutines] = useState<Set<string>>(new Set());
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [showAddItemModal, setShowAddItemModal] = useState(false);
  const [addItemRoutineId, setAddItemRoutineId] = useState<string | null>(null);
  const [selectedItemType, setSelectedItemType] = useState<ItemTypeOption | null>(null);
  const [customLabel, setCustomLabel] = useState('');
  const [customTarget, setCustomTarget] = useState('');

  const toggleRoutine = (routineId: string) => {
    setExpandedRoutines(prev => {
      const next = new Set(prev);
      if (next.has(routineId)) {
        next.delete(routineId);
      } else {
        next.add(routineId);
      }
      return next;
    });
  };

  const handleTemplateSelect = async (template: CarePlanTemplate) => {
    try {
      const newPlan = generateCarePlanFromTemplate(template);
      await saveCarePlan(newPlan);
      await refresh();
    } catch (error) {
      console.error('Error creating care plan:', error);
      Alert.alert('Error', 'Failed to create care plan');
    }
  };

  const handleAddItemPress = (routineId: string) => {
    setAddItemRoutineId(routineId);
    setSelectedItemType(null);
    setCustomLabel('');
    setCustomTarget('');
    setShowAddItemModal(true);
  };

  const handleAddItem = async () => {
    if (!selectedItemType || !addItemRoutineId) return;

    try {
      const target = customTarget ? parseInt(customTarget, 10) : selectedItemType.defaultTarget;
      const newItem = createItemFromType(
        selectedItemType,
        customLabel || selectedItemType.label,
        target
      );
      await addItemToRoutine(addItemRoutineId, newItem);
      setShowAddItemModal(false);
      await refresh();
    } catch (error) {
      console.error('Error adding item:', error);
      Alert.alert('Error', 'Failed to add item');
    }
  };

  const handleDeleteItem = (routineId: string, itemId: string, itemLabel: string) => {
    Alert.alert(
      'Remove Item',
      `Remove "${itemLabel}" from this routine?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await removeItemFromRoutine(routineId, itemId);
              await refresh();
            } catch (error) {
              console.error('Error removing item:', error);
              Alert.alert('Error', 'Failed to remove item');
            }
          },
        },
      ]
    );
  };

  const handleResetToDefaults = () => {
    Alert.alert(
      'Reset Care Plan',
      'This will reset your care plan to the default settings. Any customizations will be lost.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            try {
              await clearCarePlan();
              await initializeCarePlan();
            } catch (error) {
              console.error('Error resetting care plan:', error);
              Alert.alert('Error', 'Failed to reset care plan');
            }
          },
        },
      ]
    );
  };

  const formatTimeWindow = (timeWindow: { start: string; end: string }) => {
    const formatTime = (time24: string) => {
      if (!time24 || typeof time24 !== 'string') return 'Time not set';
      const parts = time24.split(':');
      if (parts.length < 2) return 'Time not set';
      const hours = parseInt(parts[0], 10);
      const minutes = parseInt(parts[1], 10);
      if (isNaN(hours) || isNaN(minutes) || hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
        return 'Time not set';
      }
      const ampm = hours >= 12 ? 'PM' : 'AM';
      const hour12 = hours % 12 || 12;
      return `${hour12}:${minutes.toString().padStart(2, '0')} ${ampm}`;
    };
    return `${formatTime(timeWindow.start)} - ${formatTime(timeWindow.end)}`;
  };

  const getItemTypeIcon = (type: CarePlanItem['type']) => {
    switch (type) {
      case 'meds': return '💊';
      case 'vitals': return '📊';
      case 'meals': return '🍽️';
      case 'mood': return '😊';
      case 'sleep': return '😴';
      case 'hydration': return '💧';
      case 'appointment': return '📅';
      case 'custom': return '✨';
      default: return '•';
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <AuroraBackground variant="log" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.accent} />
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <AuroraBackground variant="log" />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header with Back Button */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
            activeOpacity={0.7}
            accessibilityLabel="Go back"
            accessibilityRole="button"
          >
            <Text style={styles.backButtonText}>← Back</Text>
          </TouchableOpacity>
        </View>

        <ScreenHeader
          title="Care Plan"
          subtitle="Customize your daily routines"
        />

        {/* Info Section */}
        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>About Your Care Plan</Text>
          <Text style={styles.infoText}>
            Your care plan organizes daily tasks into time-based routines.
            It drives the "Now" timeline and progress tracking throughout the app.
          </Text>
        </View>

        {/* No Plan State - Template Selection */}
        {!carePlan && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>Set Up Your Care Plan</Text>
            <Text style={styles.emptySubtitle}>
              Choose a template that fits your care needs
            </Text>

            {/* Template Options */}
            {CARE_PLAN_TEMPLATES.map((template) => (
              <TouchableOpacity
                key={template.id}
                style={styles.templateCard}
                onPress={() => handleTemplateSelect(template.id)}
                accessibilityLabel={`Select ${template.name} care plan template`}
                accessibilityRole="button"
              >
                <Text style={styles.templateEmoji}>{template.emoji}</Text>
                <View style={styles.templateContent}>
                  <Text style={styles.templateName}>{template.name}</Text>
                  <Text style={styles.templateDescription}>{template.description}</Text>
                </View>
                <Text style={styles.templateChevron}>›</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Routines List */}
        {carePlan && carePlan.routines.map(routine => (
          <View key={routine.id} style={styles.routineCard}>
            <TouchableOpacity
              style={styles.routineHeader}
              onPress={() => toggleRoutine(routine.id)}
              activeOpacity={0.7}
              accessibilityLabel={`${routine.name} routine, ${routine.items.length} items, ${expandedRoutines.has(routine.id) ? 'collapse' : 'expand'}`}
              accessibilityRole="button"
              accessibilityState={{ expanded: expandedRoutines.has(routine.id) }}
            >
              <View style={styles.routineHeaderLeft}>
                <Text style={styles.routineEmoji}>{routine.emoji}</Text>
                <View>
                  <Text style={styles.routineName}>{routine.name}</Text>
                  <Text style={styles.routineTime}>
                    {formatTimeWindow(routine.timeWindow)}
                  </Text>
                </View>
              </View>
              <View style={styles.routineHeaderRight}>
                <Text style={styles.routineItemCount}>
                  {routine.items.length} items
                </Text>
                <Text style={styles.expandIcon}>
                  {expandedRoutines.has(routine.id) ? '▼' : '▶'}
                </Text>
              </View>
            </TouchableOpacity>

            {expandedRoutines.has(routine.id) && (
              <View style={styles.routineItems}>
                {routine.items.map(item => (
                  <TouchableOpacity
                    key={item.id}
                    style={styles.routineItem}
                    onLongPress={() => handleDeleteItem(routine.id, item.id, item.label)}
                    delayLongPress={500}
                    activeOpacity={0.7}
                    accessibilityLabel={`${item.label}, target ${item.target}, long press to remove`}
                    accessibilityRole="button"
                  >
                    <Text style={styles.itemIcon}>
                      {item.emoji || getItemTypeIcon(item.type)}
                    </Text>
                    <View style={styles.itemContent}>
                      <Text style={styles.itemLabel}>{item.label}</Text>
                      <Text style={styles.itemMeta}>
                        Target: {item.target} • {item.completionRule}
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))}

                {/* Add Item Button */}
                <TouchableOpacity
                  style={styles.addItemButton}
                  onPress={() => handleAddItemPress(routine.id)}
                  accessibilityLabel={`Add item to ${routine.name} routine`}
                  accessibilityRole="button"
                >
                  <Text style={styles.addItemIcon}>+</Text>
                  <Text style={styles.addItemText}>Add item</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        ))}

        {/* Actions */}
        {carePlan && (
          <View style={styles.actionsSection}>
            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={handleResetToDefaults}
              accessibilityLabel="Reset care plan to defaults"
              accessibilityRole="button"
            >
              <Text style={styles.secondaryButtonText}>Reset to Defaults</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Bottom spacing */}
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Add Item Modal */}
      <Modal
        visible={showAddItemModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowAddItemModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Item</Text>
              <TouchableOpacity
                onPress={() => setShowAddItemModal(false)}
                accessibilityLabel="Close add item modal"
                accessibilityRole="button"
              >
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>

            {!selectedItemType ? (
              // Step 1: Select item type
              <ScrollView style={styles.modalScroll}>
                <Text style={styles.modalSectionLabel}>Choose type</Text>
                {ITEM_TYPE_OPTIONS.map((option, index) => (
                  <TouchableOpacity
                    key={`${option.type}-${index}`}
                    style={styles.typeOption}
                    onPress={() => {
                      setSelectedItemType(option);
                      setCustomLabel(option.label);
                      setCustomTarget(String(option.defaultTarget));
                    }}
                    accessibilityLabel={`Select ${option.label} item type`}
                    accessibilityRole="button"
                  >
                    <Text style={styles.typeEmoji}>{option.emoji}</Text>
                    <View style={styles.typeContent}>
                      <Text style={styles.typeLabel}>{option.label}</Text>
                      <Text style={styles.typeDescription}>{option.description}</Text>
                    </View>
                    <Text style={styles.typeChevron}>›</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            ) : (
              // Step 2: Configure item
              <View style={styles.configSection}>
                <TouchableOpacity
                  style={styles.backLink}
                  onPress={() => setSelectedItemType(null)}
                  accessibilityLabel="Change item type"
                  accessibilityRole="button"
                >
                  <Text style={styles.backLinkText}>← Change type</Text>
                </TouchableOpacity>

                <View style={styles.selectedType}>
                  <Text style={styles.selectedTypeEmoji}>{selectedItemType.emoji}</Text>
                  <Text style={styles.selectedTypeLabel}>{selectedItemType.label}</Text>
                </View>

                <View style={styles.formField}>
                  <Text style={styles.fieldLabel}>Label</Text>
                  <TextInput
                    style={styles.textInput}
                    value={customLabel}
                    onChangeText={setCustomLabel}
                    placeholder="e.g., Morning medications"
                    placeholderTextColor="rgba(255,255,255,0.3)"
                    accessibilityLabel="Care plan item label"
                  />
                </View>

                <View style={styles.formField}>
                  <Text style={styles.fieldLabel}>
                    Target {selectedItemType.targetType === 'count' ? '(count)' : '(1 = done/later)'}
                  </Text>
                  <TextInput
                    style={styles.textInput}
                    value={customTarget}
                    onChangeText={setCustomTarget}
                    placeholder={String(selectedItemType.defaultTarget)}
                    placeholderTextColor="rgba(255,255,255,0.3)"
                    keyboardType="numeric"
                    accessibilityLabel="Care plan item target"
                  />
                  {selectedItemType.targetType === 'count' && (
                    <Text style={styles.fieldHint}>
                      e.g., 8 glasses of water, 3 medication doses
                    </Text>
                  )}
                </View>

                <TouchableOpacity
                  style={styles.addButton}
                  onPress={handleAddItem}
                  accessibilityLabel="Add to routine"
                  accessibilityRole="button"
                >
                  <Text style={styles.addButtonText}>Add to Routine</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: Colors.textSecondary,
    fontSize: 16,
    marginTop: 10,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 80,
  },

  // Header
  header: {
    marginBottom: 8,
  },
  backButton: {
    paddingVertical: 8,
  },
  backButtonText: {
    fontSize: 16,
    color: Colors.accent,
    fontWeight: '500',
  },

  // Info Card
  infoCard: {
    backgroundColor: 'rgba(94, 234, 212, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(94, 234, 212, 0.15)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.7)',
    lineHeight: 20,
  },

  // Empty State
  emptyState: {
    paddingVertical: 20,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.5)',
    textAlign: 'center',
    marginBottom: 20,
  },

  // Template Cards
  templateCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  templateEmoji: {
    fontSize: 28,
  },
  templateContent: {
    flex: 1,
  },
  templateName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  templateDescription: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.6)',
    lineHeight: 16,
  },
  templateChevron: {
    fontSize: 18,
    color: 'rgba(255, 255, 255, 0.3)',
  },

  // Routine Card
  routineCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    marginBottom: 12,
    overflow: 'hidden',
  },
  routineHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
  },
  routineHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  routineEmoji: {
    fontSize: 24,
  },
  routineName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  routineTime: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.5)',
  },
  routineHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  routineItemCount: {
    fontSize: 12,
    color: 'rgba(94, 234, 212, 0.7)',
  },
  expandIcon: {
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.4)',
  },

  // Routine Items
  routineItems: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.06)',
    paddingVertical: 8,
  },
  routineItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 14,
    gap: 12,
  },
  itemIcon: {
    fontSize: 16,
    width: 24,
    textAlign: 'center',
  },
  itemContent: {
    flex: 1,
  },
  itemLabel: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    marginBottom: 2,
  },
  itemMeta: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.4)',
  },

  // Add Item Button
  addItemButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  addItemIcon: {
    fontSize: 16,
    color: Colors.accent,
    width: 24,
    textAlign: 'center',
  },
  addItemText: {
    fontSize: 13,
    color: Colors.accent,
    fontWeight: '500',
  },

  // Actions
  actionsSection: {
    marginTop: 20,
    gap: 12,
  },
  primaryButton: {
    backgroundColor: Colors.accent,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 10,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: Colors.background,
    fontSize: 15,
    fontWeight: '600',
  },
  secondaryButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 10,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 15,
    fontWeight: '500',
  },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Colors.background,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
    paddingBottom: 40,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  modalClose: {
    fontSize: 20,
    color: 'rgba(255, 255, 255, 0.5)',
    padding: 4,
  },
  modalScroll: {
    padding: 20,
  },
  modalSectionLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.5)',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 12,
  },

  // Type Options
  typeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.06)',
  },
  typeEmoji: {
    fontSize: 24,
    width: 32,
    textAlign: 'center',
  },
  typeContent: {
    flex: 1,
  },
  typeLabel: {
    fontSize: 15,
    fontWeight: '500',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  typeDescription: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.5)',
  },
  typeChevron: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.3)',
  },

  // Config Section
  configSection: {
    padding: 20,
  },
  backLink: {
    marginBottom: 16,
  },
  backLinkText: {
    fontSize: 14,
    color: Colors.accent,
  },
  selectedType: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'rgba(94, 234, 212, 0.1)',
    padding: 12,
    borderRadius: 10,
    marginBottom: 20,
  },
  selectedTypeEmoji: {
    fontSize: 24,
  },
  selectedTypeLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.accent,
  },
  formField: {
    marginBottom: 16,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.7)',
    marginBottom: 8,
  },
  fieldHint: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.4)',
    marginTop: 6,
  },
  textInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#FFFFFF',
  },
  addButton: {
    backgroundColor: Colors.accent,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 8,
  },
  addButtonText: {
    color: Colors.background,
    fontSize: 15,
    fontWeight: '600',
  },
});
