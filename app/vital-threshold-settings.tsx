// ============================================================================
// VITAL THRESHOLD SETTINGS
// Customize patient-specific vital sign normal ranges
// ============================================================================

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors, Spacing, BorderRadius } from '../theme/theme-tokens';
import { CommonStyles } from '../theme/commonStyles';
import PageHeader from '../components/PageHeader';
import { VITAL_THRESHOLDS, VitalType, loadCustomThresholds } from '../utils/vitalThresholds';

const STORAGE_KEY = '@embermate_custom_vital_thresholds';

interface ThresholdValues {
  low: number;
  high: number;
  criticalLow: number;
  criticalHigh: number;
}

type CustomThresholds = Partial<Record<VitalType, ThresholdValues>>;

const VITAL_DISPLAY: { key: VitalType; emoji: string }[] = [
  { key: 'systolic', emoji: '🫀' },
  { key: 'diastolic', emoji: '🫀' },
  { key: 'heartRate', emoji: '💓' },
  { key: 'glucose', emoji: '🩸' },
  { key: 'spo2', emoji: '🫁' },
  { key: 'temperature', emoji: '🌡️' },
];

export default function VitalThresholdSettings() {
  const router = useRouter();
  const [customThresholds, setCustomThresholds] = useState<CustomThresholds>({});
  const [editingValues, setEditingValues] = useState<Record<string, string>>({});
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    loadCustomThresholds();
  }, []);

  const loadCustomThresholds = async () => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) {
        setCustomThresholds(JSON.parse(stored));
      }
    } catch (error) {
      console.error('Error loading custom thresholds:', error);
    }
  };

  const getEffectiveValue = (vitalKey: VitalType, field: keyof ThresholdValues): number => {
    const custom = customThresholds[vitalKey];
    if (custom && custom[field] !== undefined) {
      return custom[field];
    }
    return VITAL_THRESHOLDS[vitalKey][field];
  };

  const getEditKey = (vitalKey: VitalType, field: string) => `${vitalKey}_${field}`;

  const getDisplayValue = (vitalKey: VitalType, field: keyof ThresholdValues): string => {
    const editKey = getEditKey(vitalKey, field);
    if (editingValues[editKey] !== undefined) {
      return editingValues[editKey];
    }
    return String(getEffectiveValue(vitalKey, field));
  };

  const isCustomized = (vitalKey: VitalType): boolean => {
    return customThresholds[vitalKey] !== undefined;
  };

  const handleValueChange = (vitalKey: VitalType, field: keyof ThresholdValues, text: string) => {
    const editKey = getEditKey(vitalKey, field);
    setEditingValues(prev => ({ ...prev, [editKey]: text }));
    setHasChanges(true);
  };

  const handleValueBlur = (vitalKey: VitalType, field: keyof ThresholdValues) => {
    const editKey = getEditKey(vitalKey, field);
    const text = editingValues[editKey];
    if (text === undefined) return;

    const parsed = parseFloat(text);
    if (isNaN(parsed)) {
      // Revert to current effective value
      setEditingValues(prev => {
        const next = { ...prev };
        delete next[editKey];
        return next;
      });
      return;
    }

    // Apply the value
    setCustomThresholds(prev => {
      const defaults = VITAL_THRESHOLDS[vitalKey];
      const existing = prev[vitalKey] || {
        low: defaults.low,
        high: defaults.high,
        criticalLow: defaults.criticalLow,
        criticalHigh: defaults.criticalHigh,
      };
      return {
        ...prev,
        [vitalKey]: { ...existing, [field]: parsed },
      };
    });

    // Clear edit state for this field
    setEditingValues(prev => {
      const next = { ...prev };
      delete next[editKey];
      return next;
    });
  };

  const handleResetVital = (vitalKey: VitalType) => {
    const defaults = VITAL_THRESHOLDS[vitalKey];
    Alert.alert(
      'Reset to Default',
      `Reset ${defaults.name} thresholds to clinical defaults?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          onPress: () => {
            setCustomThresholds(prev => {
              const next = { ...prev };
              delete next[vitalKey];
              return next;
            });
            // Clear any editing state for this vital
            setEditingValues(prev => {
              const next = { ...prev };
              Object.keys(next).forEach(key => {
                if (key.startsWith(vitalKey)) delete next[key];
              });
              return next;
            });
            setHasChanges(true);
          },
        },
      ]
    );
  };

  const handleResetAll = () => {
    Alert.alert(
      'Reset All Thresholds',
      'Reset all vital thresholds to clinical defaults?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset All',
          style: 'destructive',
          onPress: () => {
            setCustomThresholds({});
            setEditingValues({});
            setHasChanges(true);
          },
        },
      ]
    );
  };

  const validateThresholds = (): string | null => {
    for (const { key } of VITAL_DISPLAY) {
      const defaults = VITAL_THRESHOLDS[key];
      const cLow = getEffectiveValue(key, 'criticalLow');
      const low = getEffectiveValue(key, 'low');
      const high = getEffectiveValue(key, 'high');
      const cHigh = getEffectiveValue(key, 'criticalHigh');

      if (cLow >= low) {
        return `${defaults.name}: Critical Low must be less than Low`;
      }
      if (low >= high) {
        return `${defaults.name}: Low must be less than High`;
      }
      if (high >= cHigh) {
        return `${defaults.name}: High must be less than Critical High`;
      }
    }
    return null;
  };

  const handleSave = async () => {
    const error = validateThresholds();
    if (error) {
      Alert.alert('Invalid Range', error);
      return;
    }

    try {
      // Only save non-empty thresholds
      const toSave: CustomThresholds = {};
      for (const [key, value] of Object.entries(customThresholds)) {
        if (value) toSave[key as VitalType] = value;
      }

      if (Object.keys(toSave).length > 0) {
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
      } else {
        await AsyncStorage.removeItem(STORAGE_KEY);
      }

      // Reload cache so getVitalStatus/generateVitalAlert use new values
      await loadCustomThresholds();

      setHasChanges(false);
      Alert.alert('Saved', 'Custom vital thresholds saved successfully.');
    } catch (error) {
      console.error('Error saving thresholds:', error);
      Alert.alert('Error', 'Could not save thresholds. Please try again.');
    }
  };

  const renderThresholdField = (
    vitalKey: VitalType,
    field: keyof ThresholdValues,
    label: string,
    color: string
  ) => (
    <View style={styles.fieldRow}>
      <View style={[styles.fieldDot, { backgroundColor: color }]} />
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        style={styles.fieldInput}
        value={getDisplayValue(vitalKey, field)}
        onChangeText={(text) => handleValueChange(vitalKey, field, text)}
        onBlur={() => handleValueBlur(vitalKey, field)}
        keyboardType="numeric"
        selectTextOnFocus
      />
    </View>
  );

  const renderVitalCard = (vitalKey: VitalType, emoji: string) => {
    const defaults = VITAL_THRESHOLDS[vitalKey];
    const customized = isCustomized(vitalKey);

    return (
      <View key={vitalKey} style={styles.vitalCard}>
        <View style={styles.vitalHeader}>
          <View style={styles.vitalTitleRow}>
            <Text style={styles.vitalEmoji}>{emoji}</Text>
            <View>
              <Text style={styles.vitalName}>{defaults.name}</Text>
              <Text style={styles.vitalUnit}>
                {defaults.unit}
                {customized && (
                  <Text style={styles.customBadge}>  Customized</Text>
                )}
              </Text>
            </View>
          </View>
          {customized && (
            <TouchableOpacity
              style={styles.resetButton}
              onPress={() => handleResetVital(vitalKey)}
            >
              <Text style={styles.resetButtonText}>Reset</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.rangeBar}>
          <View style={[styles.rangeSegment, styles.criticalSegment]} />
          <View style={[styles.rangeSegment, styles.warningSegment]} />
          <View style={[styles.rangeSegment, styles.normalSegment]} />
          <View style={[styles.rangeSegment, styles.warningSegment]} />
          <View style={[styles.rangeSegment, styles.criticalSegment]} />
        </View>

        <View style={styles.fieldsGrid}>
          {renderThresholdField(vitalKey, 'criticalLow', 'Critical Low', '#EF4444')}
          {renderThresholdField(vitalKey, 'low', 'Low', '#F59E0B')}
          {renderThresholdField(vitalKey, 'high', 'High', '#F59E0B')}
          {renderThresholdField(vitalKey, 'criticalHigh', 'Critical High', '#EF4444')}
        </View>

        <Text style={styles.rangePreview}>
          Normal range: {getEffectiveValue(vitalKey, 'low')}–{getEffectiveValue(vitalKey, 'high')} {defaults.unit}
        </Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <LinearGradient
        colors={[Colors.backgroundGradientStart, Colors.backgroundGradientEnd]}
        style={styles.gradient}
      >
        <View style={CommonStyles.headerWrapper}>
          <TouchableOpacity
            style={CommonStyles.backButton}
            onPress={() => {
              if (hasChanges) {
                Alert.alert(
                  'Unsaved Changes',
                  'You have unsaved changes. Discard them?',
                  [
                    { text: 'Keep Editing', style: 'cancel' },
                    { text: 'Discard', style: 'destructive', onPress: () => router.back() },
                  ]
                );
              } else {
                router.back();
              }
            }}
          >
            <Text style={CommonStyles.backIcon}>←</Text>
          </TouchableOpacity>

          <PageHeader
            emoji="📊"
            label="HEALTH"
            title="Vital Ranges"
          />
        </View>

        <ScrollView
          style={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          {/* Info Banner */}
          <View style={styles.infoBanner}>
            <Text style={styles.infoBannerText}>
              Customize normal ranges for your patient. Readings outside these ranges will trigger alerts. Defaults are based on general clinical guidelines.
            </Text>
          </View>

          {/* Vital Cards */}
          {VITAL_DISPLAY.map(({ key, emoji }) => renderVitalCard(key, emoji))}

          {/* Actions */}
          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.saveButton, !hasChanges && styles.saveButtonDisabled]}
              onPress={handleSave}
              disabled={!hasChanges}
            >
              <Text style={[styles.saveButtonText, !hasChanges && styles.saveButtonTextDisabled]}>
                Save Changes
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.resetAllButton}
              onPress={handleResetAll}
            >
              <Text style={styles.resetAllButtonText}>Reset All to Defaults</Text>
            </TouchableOpacity>
          </View>

          <View style={{ height: 40 }} />
        </ScrollView>
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  gradient: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 16,
  },

  // Info Banner
  infoBanner: {
    backgroundColor: 'rgba(20, 184, 166, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(20, 184, 166, 0.15)',
    borderRadius: 10,
    padding: 14,
    marginBottom: 20,
  },
  infoBannerText: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 19,
  },

  // Vital Card
  vitalCard: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
  },
  vitalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  vitalTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  vitalEmoji: {
    fontSize: 24,
  },
  vitalName: {
    fontSize: 15,
    fontWeight: '500',
    color: Colors.textPrimary,
  },
  vitalUnit: {
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 1,
  },
  customBadge: {
    color: Colors.accent,
    fontSize: 11,
    fontWeight: '500',
  },

  // Range Bar
  rangeBar: {
    flexDirection: 'row',
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 14,
    gap: 2,
  },
  rangeSegment: {
    flex: 1,
    borderRadius: 2,
  },
  criticalSegment: {
    backgroundColor: 'rgba(239, 68, 68, 0.4)',
  },
  warningSegment: {
    backgroundColor: 'rgba(245, 158, 11, 0.4)',
  },
  normalSegment: {
    backgroundColor: 'rgba(16, 185, 129, 0.4)',
    flex: 2,
  },

  // Fields
  fieldsGrid: {
    gap: 8,
  },
  fieldRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  fieldDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  fieldLabel: {
    fontSize: 13,
    color: Colors.textSecondary,
    flex: 1,
  },
  fieldInput: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    color: Colors.textPrimary,
    fontSize: 15,
    fontWeight: '500',
    width: 80,
    textAlign: 'center',
  },

  // Range Preview
  rangePreview: {
    fontSize: 12,
    color: Colors.accent,
    marginTop: 10,
    textAlign: 'center',
    opacity: 0.8,
  },

  // Reset Button
  resetButton: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  resetButtonText: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: '500',
  },

  // Actions
  actions: {
    gap: 12,
    marginTop: 8,
  },
  saveButton: {
    backgroundColor: Colors.accent,
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.lg,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    backgroundColor: 'rgba(20, 184, 166, 0.2)',
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.background,
  },
  saveButtonTextDisabled: {
    color: 'rgba(255,255,255,0.3)',
  },
  resetAllButton: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.lg,
    alignItems: 'center',
  },
  resetAllButtonText: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
});
