// ============================================================================
// CARE PLAN MANAGER
// Screen for managing the regimen-based CarePlan and CarePlanItems
// Uses NEW types from types/carePlan.ts and storage/carePlanRepo.ts
// ============================================================================

import React, { useState, useEffect, useCallback } from 'react';
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
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { AuroraBackground } from '../../components/aurora/AuroraBackground';
import { ScreenHeader } from '../../components/ScreenHeader';
import { Colors } from '../../theme/theme-tokens';
import {
  CarePlan,
  CarePlanItem,
  CarePlanItemType,
  CarePlanItemPriority,
  TimeWindow,
  TimeWindowLabel,
  DEFAULT_TIME_WINDOWS,
} from '../../types/carePlan';
import {
  getActiveCarePlan,
  createCarePlan,
  listCarePlanItems,
  upsertCarePlanItem,
  archiveCarePlanItem,
  deleteCarePlanItem,
  DEFAULT_PATIENT_ID,
} from '../../storage/carePlanRepo';
import { generateUniqueId } from '../../utils/idGenerator';
import { emitDataUpdate } from '../../lib/events';

// ============================================================================
// TYPES
// ============================================================================

interface ItemTypeConfig {
  type: CarePlanItemType;
  label: string;
  emoji: string;
  description: string;
  defaultPriority: CarePlanItemPriority;
}

const ITEM_TYPES: ItemTypeConfig[] = [
  { type: 'medication', label: 'Medication', emoji: '💊', description: 'Pills, supplements, treatments', defaultPriority: 'required' },
  { type: 'vitals', label: 'Vitals Check', emoji: '📊', description: 'BP, glucose, temperature', defaultPriority: 'recommended' },
  { type: 'nutrition', label: 'Meal', emoji: '🍽️', description: 'Breakfast, lunch, dinner', defaultPriority: 'recommended' },
  { type: 'mood', label: 'Mood Check', emoji: '😊', description: 'How they\'re feeling', defaultPriority: 'optional' },
  { type: 'hydration', label: 'Hydration', emoji: '💧', description: 'Water intake tracking', defaultPriority: 'optional' },
  { type: 'activity', label: 'Activity', emoji: '🚶', description: 'Exercise, walking, movement', defaultPriority: 'optional' },
  { type: 'sleep', label: 'Sleep', emoji: '😴', description: 'Sleep quality tracking', defaultPriority: 'optional' },
  { type: 'appointment', label: 'Appointment', emoji: '📅', description: 'Doctor visits, check-ups', defaultPriority: 'required' },
  { type: 'custom', label: 'Custom', emoji: '✨', description: 'Any other task', defaultPriority: 'optional' },
];

const TIME_WINDOWS: { label: TimeWindowLabel; display: string; emoji: string }[] = [
  { label: 'morning', display: 'Morning', emoji: '🌅' },
  { label: 'afternoon', display: 'Afternoon', emoji: '☀️' },
  { label: 'evening', display: 'Evening', emoji: '🌆' },
  { label: 'night', display: 'Night', emoji: '🌙' },
];

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function CarePlanManageScreen() {
  const router = useRouter();
  const [carePlan, setCarePlan] = useState<CarePlan | null>(null);
  const [items, setItems] = useState<CarePlanItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingItem, setEditingItem] = useState<CarePlanItem | null>(null);

  // Form state
  const [formType, setFormType] = useState<CarePlanItemType>('medication');
  const [formName, setFormName] = useState('');
  const [formInstructions, setFormInstructions] = useState('');
  const [formPriority, setFormPriority] = useState<CarePlanItemPriority>('recommended');
  const [formActive, setFormActive] = useState(true);
  const [formTimeWindows, setFormTimeWindows] = useState<Set<TimeWindowLabel>>(new Set(['morning']));

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  const loadData = async () => {
    try {
      setLoading(true);
      let plan = await getActiveCarePlan(DEFAULT_PATIENT_ID);

      // Auto-create care plan if none exists
      if (!plan) {
        plan = await createCarePlan(DEFAULT_PATIENT_ID);
      }

      setCarePlan(plan);

      const planItems = await listCarePlanItems(plan.id);
      setItems(planItems);
    } catch (error) {
      console.error('Error loading care plan:', error);
      Alert.alert('Error', 'Failed to load care plan');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormType('medication');
    setFormName('');
    setFormInstructions('');
    setFormPriority('recommended');
    setFormActive(true);
    setFormTimeWindows(new Set(['morning']));
    setEditingItem(null);
  };

  const openAddModal = (type?: CarePlanItemType) => {
    resetForm();
    if (type) {
      setFormType(type);
      const config = ITEM_TYPES.find(t => t.type === type);
      if (config) {
        setFormPriority(config.defaultPriority);
      }
    }
    setShowAddModal(true);
  };

  const openEditModal = (item: CarePlanItem) => {
    setEditingItem(item);
    setFormType(item.type);
    setFormName(item.name);
    setFormInstructions(item.instructions || '');
    setFormPriority(item.priority);
    setFormActive(item.active);

    // Extract time windows from schedule
    const windows = new Set<TimeWindowLabel>();
    for (const tw of item.schedule.times) {
      windows.add(tw.label);
    }
    setFormTimeWindows(windows.size > 0 ? windows : new Set(['morning']));

    setShowAddModal(true);
  };

  const toggleTimeWindow = (label: TimeWindowLabel) => {
    setFormTimeWindows(prev => {
      const next = new Set(prev);
      if (next.has(label)) {
        // Don't allow removing the last window
        if (next.size > 1) {
          next.delete(label);
        }
      } else {
        next.add(label);
      }
      return next;
    });
  };

  const handleSave = async () => {
    if (!carePlan) return;
    if (!formName.trim()) {
      Alert.alert('Error', 'Please enter a name');
      return;
    }

    try {
      const now = new Date().toISOString();

      // Build time windows from selection
      const times: TimeWindow[] = Array.from(formTimeWindows).map(label => {
        const defaults = DEFAULT_TIME_WINDOWS[label as keyof typeof DEFAULT_TIME_WINDOWS];
        return {
          id: generateUniqueId(),
          kind: 'window' as const,
          label,
          start: defaults?.start || '09:00',
          end: defaults?.end || '12:00',
        };
      });

      const itemData: CarePlanItem = {
        id: editingItem?.id || generateUniqueId(),
        carePlanId: carePlan.id,
        type: formType,
        name: formName.trim(),
        instructions: formInstructions.trim() || undefined,
        priority: formPriority,
        active: formActive,
        schedule: {
          frequency: 'daily',
          times,
        },
        emoji: ITEM_TYPES.find(t => t.type === formType)?.emoji,
        createdAt: editingItem?.createdAt || now,
        updatedAt: now,
      };

      await upsertCarePlanItem(itemData);
      setShowAddModal(false);
      resetForm();
      await loadData();
      emitDataUpdate('carePlanItems');
    } catch (error) {
      console.error('Error saving item:', error);
      Alert.alert('Error', 'Failed to save item');
    }
  };

  const handleDelete = (item: CarePlanItem) => {
    Alert.alert(
      'Delete Item',
      `Are you sure you want to delete "${item.name}"? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteCarePlanItem(item.carePlanId, item.id);
              await loadData();
              emitDataUpdate('carePlanItems');
            } catch (error) {
              console.error('Error deleting item:', error);
              Alert.alert('Error', 'Failed to delete item');
            }
          },
        },
      ]
    );
  };

  const handleToggleActive = async (item: CarePlanItem) => {
    try {
      await upsertCarePlanItem({ ...item, active: !item.active });
      await loadData();
      emitDataUpdate('carePlanItems');
    } catch (error) {
      console.error('Error toggling item:', error);
    }
  };

  // Group items by type
  const itemsByType = items.reduce((acc, item) => {
    const key = item.type;
    if (!acc[key]) acc[key] = [];
    acc[key].push(item);
    return acc;
  }, {} as Record<CarePlanItemType, CarePlanItem[]>);

  const getItemConfig = (type: CarePlanItemType) => {
    return ITEM_TYPES.find(t => t.type === type) || ITEM_TYPES[ITEM_TYPES.length - 1];
  };

  const formatTimeWindows = (item: CarePlanItem): string => {
    return item.schedule.times
      .map(tw => TIME_WINDOWS.find(w => w.label === tw.label)?.display || tw.label)
      .join(', ');
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
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Text style={styles.backButtonText}>← Back</Text>
          </TouchableOpacity>
        </View>

        <ScreenHeader
          title="Care Plan"
          subtitle="Manage daily care tasks"
        />

        {/* Info Card */}
        <View style={styles.infoCard}>
          <Text style={styles.infoText}>
            Add tasks that need to happen daily. Each task can be scheduled for
            multiple times of day (morning, afternoon, evening, night).
          </Text>
        </View>

        {/* Quick Add Buttons */}
        <View style={styles.quickAddSection}>
          <Text style={styles.sectionLabel}>QUICK ADD</Text>
          <View style={styles.quickAddGrid}>
            {ITEM_TYPES.slice(0, 6).map(config => (
              <TouchableOpacity
                key={config.type}
                style={styles.quickAddButton}
                onPress={() => openAddModal(config.type)}
              >
                <Text style={styles.quickAddEmoji}>{config.emoji}</Text>
                <Text style={styles.quickAddLabel}>{config.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Items List */}
        {items.length > 0 && (
          <View style={styles.itemsSection}>
            <Text style={styles.sectionLabel}>YOUR CARE PLAN ({items.length} items)</Text>

            {Object.entries(itemsByType).map(([type, typeItems]) => {
              const config = getItemConfig(type as CarePlanItemType);
              return (
                <View key={type} style={styles.typeGroup}>
                  <View style={styles.typeHeader}>
                    <Text style={styles.typeEmoji}>{config.emoji}</Text>
                    <Text style={styles.typeLabel}>{config.label}</Text>
                    <Text style={styles.typeCount}>{typeItems.length}</Text>
                  </View>

                  {typeItems.map(item => (
                    <TouchableOpacity
                      key={item.id}
                      style={[styles.itemRow, !item.active && styles.itemRowInactive]}
                      onPress={() => openEditModal(item)}
                      onLongPress={() => handleDelete(item)}
                      delayLongPress={500}
                    >
                      <View style={styles.itemContent}>
                        <Text style={[styles.itemName, !item.active && styles.itemNameInactive]}>
                          {item.name}
                        </Text>
                        <Text style={styles.itemMeta}>
                          {formatTimeWindows(item)} • {item.priority}
                        </Text>
                      </View>
                      <Switch
                        value={item.active}
                        onValueChange={() => handleToggleActive(item)}
                        trackColor={{ false: 'rgba(255,255,255,0.1)', true: 'rgba(94, 234, 212, 0.3)' }}
                        thumbColor={item.active ? Colors.accent : 'rgba(255,255,255,0.5)'}
                      />
                    </TouchableOpacity>
                  ))}
                </View>
              );
            })}
          </View>
        )}

        {/* Empty State */}
        {items.length === 0 && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>📋</Text>
            <Text style={styles.emptyTitle}>No care tasks yet</Text>
            <Text style={styles.emptySubtitle}>
              Add your first task using the quick add buttons above
            </Text>
          </View>
        )}

        {/* Add Custom Button */}
        <TouchableOpacity
          style={styles.addCustomButton}
          onPress={() => openAddModal()}
        >
          <Text style={styles.addCustomText}>+ Add Custom Task</Text>
        </TouchableOpacity>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Add/Edit Modal */}
      <Modal
        visible={showAddModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowAddModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingItem ? 'Edit Task' : 'Add Task'}
              </Text>
              <TouchableOpacity onPress={() => setShowAddModal(false)}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScroll}>
              {/* Type Selection (only for new items) */}
              {!editingItem && (
                <View style={styles.formSection}>
                  <Text style={styles.formLabel}>Type</Text>
                  <View style={styles.typeGrid}>
                    {ITEM_TYPES.map(config => (
                      <TouchableOpacity
                        key={config.type}
                        style={[
                          styles.typeChip,
                          formType === config.type && styles.typeChipSelected,
                        ]}
                        onPress={() => {
                          setFormType(config.type);
                          setFormPriority(config.defaultPriority);
                        }}
                      >
                        <Text style={styles.typeChipEmoji}>{config.emoji}</Text>
                        <Text style={[
                          styles.typeChipLabel,
                          formType === config.type && styles.typeChipLabelSelected,
                        ]}>
                          {config.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}

              {/* Name */}
              <View style={styles.formSection}>
                <Text style={styles.formLabel}>Name</Text>
                <TextInput
                  style={styles.textInput}
                  value={formName}
                  onChangeText={setFormName}
                  placeholder="e.g., Sertraline, Morning vitals check"
                  placeholderTextColor="rgba(255,255,255,0.3)"
                />
              </View>

              {/* Instructions */}
              <View style={styles.formSection}>
                <Text style={styles.formLabel}>Instructions (optional)</Text>
                <TextInput
                  style={[styles.textInput, styles.textInputMultiline]}
                  value={formInstructions}
                  onChangeText={setFormInstructions}
                  placeholder="e.g., Take with food"
                  placeholderTextColor="rgba(255,255,255,0.3)"
                  multiline
                  numberOfLines={2}
                />
              </View>

              {/* Time Windows */}
              <View style={styles.formSection}>
                <Text style={styles.formLabel}>When (select one or more)</Text>
                <View style={styles.windowGrid}>
                  {TIME_WINDOWS.map(tw => (
                    <TouchableOpacity
                      key={tw.label}
                      style={[
                        styles.windowChip,
                        formTimeWindows.has(tw.label) && styles.windowChipSelected,
                      ]}
                      onPress={() => toggleTimeWindow(tw.label)}
                    >
                      <Text style={styles.windowEmoji}>{tw.emoji}</Text>
                      <Text style={[
                        styles.windowLabel,
                        formTimeWindows.has(tw.label) && styles.windowLabelSelected,
                      ]}>
                        {tw.display}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Priority */}
              <View style={styles.formSection}>
                <Text style={styles.formLabel}>Priority</Text>
                <View style={styles.priorityRow}>
                  {(['required', 'recommended', 'optional'] as CarePlanItemPriority[]).map(p => (
                    <TouchableOpacity
                      key={p}
                      style={[
                        styles.priorityChip,
                        formPriority === p && styles.priorityChipSelected,
                      ]}
                      onPress={() => setFormPriority(p)}
                    >
                      <Text style={[
                        styles.priorityLabel,
                        formPriority === p && styles.priorityLabelSelected,
                      ]}>
                        {p.charAt(0).toUpperCase() + p.slice(1)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Active Toggle */}
              <View style={styles.formSection}>
                <View style={styles.toggleRow}>
                  <Text style={styles.formLabel}>Active</Text>
                  <Switch
                    value={formActive}
                    onValueChange={setFormActive}
                    trackColor={{ false: 'rgba(255,255,255,0.1)', true: 'rgba(94, 234, 212, 0.3)' }}
                    thumbColor={formActive ? Colors.accent : 'rgba(255,255,255,0.5)'}
                  />
                </View>
                <Text style={styles.formHint}>
                  Inactive items won't generate daily tasks
                </Text>
              </View>

              {/* Save Button */}
              <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
                <Text style={styles.saveButtonText}>
                  {editingItem ? 'Save Changes' : 'Add Task'}
                </Text>
              </TouchableOpacity>

              {/* Delete Button (edit mode only) */}
              {editingItem && (
                <TouchableOpacity
                  style={styles.deleteButton}
                  onPress={() => {
                    setShowAddModal(false);
                    handleDelete(editingItem);
                  }}
                >
                  <Text style={styles.deleteButtonText}>Delete Task</Text>
                </TouchableOpacity>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// ============================================================================
// STYLES
// ============================================================================

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
    padding: 14,
    marginBottom: 20,
  },
  infoText: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.7)',
    lineHeight: 20,
  },

  // Section
  sectionLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.5)',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 12,
  },

  // Quick Add
  quickAddSection: {
    marginBottom: 24,
  },
  quickAddGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  quickAddButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    minWidth: 100,
  },
  quickAddEmoji: {
    fontSize: 24,
    marginBottom: 4,
  },
  quickAddLabel: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.7)',
  },

  // Items List
  itemsSection: {
    marginBottom: 20,
  },
  typeGroup: {
    marginBottom: 16,
  },
  typeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  typeEmoji: {
    fontSize: 16,
  },
  typeLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.8)',
  },
  typeCount: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.4)',
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 10,
    padding: 12,
    marginBottom: 6,
  },
  itemRowInactive: {
    opacity: 0.5,
  },
  itemContent: {
    flex: 1,
  },
  itemName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  itemNameInactive: {
    textDecorationLine: 'line-through',
  },
  itemMeta: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.4)',
  },

  // Empty State
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyEmoji: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.7)',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.4)',
    textAlign: 'center',
  },

  // Add Custom Button
  addCustomButton: {
    backgroundColor: 'rgba(94, 234, 212, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(94, 234, 212, 0.3)',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  addCustomText: {
    fontSize: 14,
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
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '85%',
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
    paddingBottom: 40,
  },

  // Form
  formSection: {
    marginBottom: 20,
  },
  formLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.7)',
    marginBottom: 8,
  },
  formHint: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.4)',
    marginTop: 4,
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
  textInputMultiline: {
    minHeight: 60,
    textAlignVertical: 'top',
  },

  // Type Grid
  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  typeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  typeChipSelected: {
    backgroundColor: 'rgba(94, 234, 212, 0.15)',
    borderColor: Colors.accent,
  },
  typeChipEmoji: {
    fontSize: 14,
  },
  typeChipLabel: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.7)',
  },
  typeChipLabelSelected: {
    color: Colors.accent,
    fontWeight: '500',
  },

  // Window Grid
  windowGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  windowChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  windowChipSelected: {
    backgroundColor: 'rgba(94, 234, 212, 0.15)',
    borderColor: Colors.accent,
  },
  windowEmoji: {
    fontSize: 16,
  },
  windowLabel: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.7)',
  },
  windowLabelSelected: {
    color: Colors.accent,
    fontWeight: '500',
  },

  // Priority
  priorityRow: {
    flexDirection: 'row',
    gap: 8,
  },
  priorityChip: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
  priorityChipSelected: {
    backgroundColor: 'rgba(94, 234, 212, 0.15)',
    borderColor: Colors.accent,
  },
  priorityLabel: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.6)',
  },
  priorityLabelSelected: {
    color: Colors.accent,
    fontWeight: '500',
  },

  // Toggle Row
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  // Buttons
  saveButton: {
    backgroundColor: Colors.accent,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 10,
  },
  saveButtonText: {
    color: Colors.background,
    fontSize: 15,
    fontWeight: '600',
  },
  deleteButton: {
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.5)',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 12,
  },
  deleteButtonText: {
    color: '#EF4444',
    fontSize: 15,
    fontWeight: '500',
  },
});
