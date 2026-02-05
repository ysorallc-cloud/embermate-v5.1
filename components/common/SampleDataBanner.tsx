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
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { Colors, Spacing, BorderRadius } from '../../theme/theme-tokens';
import { hasSampleData, detectSampleData } from '../../utils/sampleDataManager';
import { useDataListener } from '../../lib/events';

// Storage key for banner dismissal
const BANNER_DISMISSED_KEY = '@embermate_sample_banner_dismissed';

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
      const wasDismissed = await AsyncStorage.getItem(BANNER_DISMISSED_KEY);
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
      console.error('[SampleDataBanner] Error checking sample data:', error);
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

    await AsyncStorage.setItem(BANNER_DISMISSED_KEY, 'true');
  };

  const handleManage = () => {
    router.push('/data-privacy-settings' as any);
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
            Sample data active ({sampleCount} items)
          </Text>
        </View>
        <TouchableOpacity
          style={styles.compactAction}
          onPress={handleManage}
          activeOpacity={0.7}
        >
          <Text style={styles.compactActionText}>Manage</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.compactDismiss}
          onPress={handleDismiss}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
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
          <Text style={styles.title}>Sample data detected</Text>
          <Text style={styles.subtitle}>
            {sampleCount} demo records are loaded to help you explore the app.
          </Text>
        </View>
      </View>

      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.manageButton}
          onPress={handleManage}
          activeOpacity={0.7}
        >
          <Text style={styles.manageButtonText}>Manage data</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.dismissButton}
          onPress={handleDismiss}
          activeOpacity={0.7}
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
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.25)',
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
    backgroundColor: 'rgba(139, 92, 246, 0.2)',
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
    color: '#A78BFA',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.7)',
    lineHeight: 18,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  manageButton: {
    backgroundColor: 'rgba(139, 92, 246, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.3)',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  manageButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#A78BFA',
  },
  dismissButton: {
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  dismissButtonText: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.5)',
  },

  // Compact variant
  compactContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(139, 92, 246, 0.08)',
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
    color: 'rgba(255, 255, 255, 0.7)',
  },
  compactAction: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  compactActionText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#A78BFA',
  },
  compactDismiss: {
    paddingLeft: 8,
  },
  compactDismissText: {
    fontSize: 18,
    color: 'rgba(255, 255, 255, 0.4)',
    fontWeight: '300',
  },
});

export default SampleDataBanner;
