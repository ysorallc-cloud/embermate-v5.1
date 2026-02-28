// ============================================================================
// SAMPLE DATA BANNER
// Displays when sample/demo data is detected in the app
// Dismissible, with link to Data & Privacy settings
// ============================================================================

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
} from 'react-native';
import { useRouter } from 'expo-router';
import { navigate } from '../../lib/navigate';
import { safeGetItem, safeSetItem } from '../../utils/safeStorage';
import { useFocusEffect } from '@react-navigation/native';
import { Colors, Spacing, BorderRadius } from '../../theme/theme-tokens';
import { hasSampleData, detectSampleData } from '../../utils/sampleDataManager';
import { useDataListener } from '../../lib/events';
import { logError } from '../../utils/devLog';
import { StorageKeys } from '../../utils/storageKeys';

// Storage key for banner dismissal
const BANNER_DISMISSED_KEY = StorageKeys.SAMPLE_BANNER_DISMISSED;

export interface SampleDataBannerProps {
  /** Callback when sample data is cleared */
  onCleared?: () => void;
  /** Show compact version */
  compact?: boolean;
}

export const SampleDataBanner: React.FC<SampleDataBannerProps> = ({
  onCleared,
  compact = false,
}) => {
  const router = useRouter();
  const [visible, setVisible] = useState(false);
  const [sampleCount, setSampleCount] = useState(0);
  const [dismissed, setDismissed] = useState(false);
  const fadeAnim = useState(new Animated.Value(0))[0];

  // Check for sample data on focus
  useFocusEffect(
    useCallback(() => {
      checkSampleData();
    }, [])
  );

  // Listen for data updates (e.g., when sample data is cleared)
  useDataListener(useCallback((source: string) => {
    if (source === 'sampleDataCleared') {
      setVisible(false);
      onCleared?.();
    }
  }, [onCleared]));

  const checkSampleData = async () => {
    try {
      // Check if banner was dismissed
      const wasDismissed = await safeGetItem<string | null>(BANNER_DISMISSED_KEY, null);
      if (wasDismissed === 'true') {
        setDismissed(true);
        setVisible(false);
        return;
      }

      // Check for sample data
      const hasData = await hasSampleData();
      if (hasData) {
        const status = await detectSampleData();
        setSampleCount(status.totalSampleRecords);
        setVisible(true);
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }).start();
      } else {
        setVisible(false);
      }
    } catch (error) {
      logError('SampleDataBanner.checkSampleData', error);
    }
  };

  const handleDismiss = async () => {
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      setVisible(false);
      setDismissed(true);
    });

    await safeSetItem(BANNER_DISMISSED_KEY, 'true');
  };

  const handleSetup = () => {
    navigate('/care-plan');
  };

  const handleClearData = () => {
    navigate('/data-privacy-settings');
  };

  if (!visible || dismissed) {
    return null;
  }

  if (compact) {
    return (
      <Animated.View style={[styles.compactContainer, { opacity: fadeAnim }]}>
        <View style={styles.compactContent}>
          <Text style={styles.compactIcon}>📊</Text>
          <Text style={styles.compactText}>
            Demo data — Set up your care plan
          </Text>
        </View>
        <TouchableOpacity
          style={styles.compactAction}
          onPress={handleSetup}
          activeOpacity={0.7}
          accessibilityLabel="Start care plan setup"
          accessibilityRole="button"
        >
          <Text style={styles.compactActionText}>Start</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.compactDismiss}
          onPress={handleDismiss}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityLabel="Dismiss demo data banner"
          accessibilityRole="button"
        >
          <Text style={styles.compactDismissText}>×</Text>
        </TouchableOpacity>
      </Animated.View>
    );
  }

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <Text style={styles.icon}>📊</Text>
        </View>
        <View style={styles.textContent}>
          <Text style={styles.title}>Demo data loaded</Text>
          <Text style={styles.subtitle}>
            Set up your own care plan to replace demo data.
          </Text>
        </View>
      </View>

      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={handleSetup}
          activeOpacity={0.7}
          accessibilityLabel="Set up your care plan"
          accessibilityRole="button"
        >
          <Text style={styles.primaryButtonText}>Set up your care plan</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={handleClearData}
          activeOpacity={0.7}
          accessibilityLabel="Clear demo data"
          accessibilityRole="button"
        >
          <Text style={styles.secondaryButtonText}>Clear demo data</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.dismissButton}
          onPress={handleDismiss}
          activeOpacity={0.7}
          accessibilityLabel="Dismiss demo data banner"
          accessibilityRole="button"
        >
          <Text style={styles.dismissButtonText}>Dismiss</Text>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
};

// Reset banner dismissal (for testing)
export async function resetSampleDataBanner(): Promise<void> {
  await AsyncStorage.removeItem(BANNER_DISMISSED_KEY);
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.purpleMuted,
    borderWidth: 1,
    borderColor: Colors.purpleBorder,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 12,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.purpleWash,
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    fontSize: 18,
  },
  textContent: {
    flex: 1,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.purpleBright,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  primaryButton: {
    backgroundColor: Colors.purpleBorder,
    borderWidth: 1,
    borderColor: Colors.purpleGlow,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  primaryButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.purpleBright,
  },
  secondaryButton: {
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  secondaryButtonText: {
    fontSize: 13,
    color: Colors.textTertiary,
  },
  dismissButton: {
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  dismissButtonText: {
    fontSize: 13,
    color: Colors.textHalf,
  },

  // Compact variant
  compactContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.purpleFaint,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginBottom: Spacing.sm,
  },
  compactContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  compactIcon: {
    fontSize: 14,
  },
  compactText: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  compactAction: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  compactActionText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.purpleBright,
  },
  compactDismiss: {
    paddingLeft: 8,
  },
  compactDismissText: {
    fontSize: 18,
    color: Colors.textMuted,
    fontWeight: '300',
  },
});

export default SampleDataBanner;
