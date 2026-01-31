// ============================================================================
// WATER LOGGING SCREEN - Quick Water Counter
// ============================================================================

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { AuroraBackground } from '../components/aurora/AuroraBackground';
import { Colors, Spacing } from '../theme/theme-tokens';
import { getTodayWaterLog, updateTodayWaterLog } from '../utils/centralStorage';

const WATER_GOAL = 8;

export default function LogWaterScreen() {
  const router = useRouter();
  const [glasses, setGlasses] = useState(0);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadWaterData();
  }, []);

  const loadWaterData = async () => {
    try {
      const todayWater = await getTodayWaterLog();
      if (todayWater?.glasses) {
        setGlasses(todayWater.glasses);
      }
    } catch (error) {
      console.error('Error loading water data:', error);
    }
  };

  const handleIncrement = () => {
    setGlasses(prev => Math.min(prev + 1, WATER_GOAL + 4));
  };

  const handleDecrement = () => {
    setGlasses(prev => Math.max(prev - 1, 0));
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      await updateTodayWaterLog(glasses);
      router.back();
    } catch (error) {
      console.error('Error saving water:', error);
      Alert.alert('Error', 'Failed to save water intake');
    } finally {
      setSaving(false);
    }
  };

  const progressPercent = Math.min((glasses / WATER_GOAL) * 100, 100);

  return (
    <View style={styles.container}>
      <AuroraBackground variant="log" />

      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Text style={styles.backButtonText}>←</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Water today?</Text>
          <View style={styles.placeholder} />
        </View>

        <View style={styles.content}>
          <Text style={styles.subtitle}>Quick count</Text>

          {/* Water Counter */}
          <View style={styles.counterContainer}>
            <TouchableOpacity
              style={styles.counterButton}
              onPress={handleDecrement}
              disabled={glasses === 0}
            >
              <Text style={[styles.counterButtonText, glasses === 0 && styles.counterButtonDisabled]}>−</Text>
            </TouchableOpacity>

            <View style={styles.counterDisplay}>
              <Text style={styles.counterNumber}>{glasses}</Text>
              <Text style={styles.counterLabel}>of {WATER_GOAL} glasses</Text>
            </View>

            <TouchableOpacity
              style={styles.counterButton}
              onPress={handleIncrement}
            >
              <Text style={styles.counterButtonText}>+</Text>
            </TouchableOpacity>
          </View>

          {/* Progress Bar */}
          <View style={styles.progressContainer}>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${progressPercent}%` }]} />
            </View>
            <Text style={styles.progressText}>
              {glasses >= WATER_GOAL ? '✓ Goal reached!' : `${WATER_GOAL - glasses} more to go`}
            </Text>
          </View>

          {/* Quick Add Buttons */}
          <View style={styles.quickAddRow}>
            {[1, 2, 3, 4].map(num => (
              <TouchableOpacity
                key={num}
                style={styles.quickAddButton}
                onPress={() => setGlasses(prev => Math.min(prev + num, WATER_GOAL + 4))}
              >
                <Text style={styles.quickAddText}>+{num}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Save Button */}
        <View style={styles.bottomActions}>
          <TouchableOpacity
            style={[styles.saveButton, saving && styles.saveButtonDisabled]}
            onPress={handleSave}
            disabled={saving}
          >
            <Text style={styles.saveButtonText}>
              {saving ? 'Saving...' : 'Done ✓'}
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 20,
  },
  backButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backButtonText: {
    fontSize: 28,
    color: Colors.textPrimary,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  placeholder: {
    width: 44,
  },
  content: {
    flex: 1,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: Colors.textMuted,
    marginBottom: 40,
  },

  // Counter
  counterContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 30,
    marginBottom: 40,
  },
  counterButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(94, 234, 212, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(94, 234, 212, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  counterButtonText: {
    fontSize: 32,
    fontWeight: '300',
    color: Colors.accent,
  },
  counterButtonDisabled: {
    opacity: 0.3,
  },
  counterDisplay: {
    alignItems: 'center',
  },
  counterNumber: {
    fontSize: 72,
    fontWeight: '200',
    color: Colors.textPrimary,
  },
  counterLabel: {
    fontSize: 14,
    color: Colors.textMuted,
    marginTop: -5,
  },

  // Progress
  progressContainer: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 40,
  },
  progressBar: {
    width: '100%',
    height: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 12,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#06B6D4',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 13,
    color: Colors.textSecondary,
  },

  // Quick Add
  quickAddRow: {
    flexDirection: 'row',
    gap: 12,
  },
  quickAddButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
  },
  quickAddText: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.textSecondary,
  },

  // Bottom
  bottomActions: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.06)',
  },
  saveButton: {
    backgroundColor: Colors.accent,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.7,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.background,
  },
});
