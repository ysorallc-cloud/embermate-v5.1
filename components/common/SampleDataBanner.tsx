// ============================================================================
// SAMPLE DATA BANNER
// Non-dismissible banner when sample/demo data is active.
// Full mode (default) → compact mode (after "Keep exploring").
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
import { safeGetItem, safeSetItem } from '../../utils/safeStorage';
import { useFocusEffect } from '@react-navigation/native';
import { Colors, Spacing, BorderRadius } from '../../theme/theme-tokens';
import { hasSampleData } from '../../utils/sampleDataManager';
import { useDataListener } from '../../lib/events';
import { logError } from '../../utils/devLog';
import { StorageKeys } from '../../utils/storageKeys';

export interface SampleDataBannerProps {
  /** Callback when sample data is cleared */
  onCleared?: () => void;
}

export const SampleDataBanner: React.FC<SampleDataBannerProps> = ({
  onCleared,
}) => {
  const router = useRouter();
  const [visible, setVisible] = useState(false);
  const [mode, setMode] = useState<'full' | 'compact'>('full');
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
      const hasData = await hasSampleData();
      if (hasData) {
        // Check persisted mode
        const savedMode = await safeGetItem<string | null>(StorageKeys.SAMPLE_BANNER_MODE, null);
        if (savedMode === 'compact') {
          setMode('compact');
        }
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

  const handleKeepExploring = async () => {
    setMode('compact');
    await safeSetItem(StorageKeys.SAMPLE_BANNER_MODE, 'compact');
  };

  const handleReady = () => {
    router.push('/sample-data-transition');
  };

  if (!visible) {
    return null;
  }

  if (mode === 'compact') {
    return (
      <Animated.View style={[styles.compactContainer, { opacity: fadeAnim }]}>
        <View style={styles.compactContent}>
          <Text style={styles.compactIcon}>{'\u{1F4CA}'}</Text>
          <Text style={styles.compactText}>Viewing sample data</Text>
        </View>
        <TouchableOpacity
          style={styles.compactAction}
          onPress={handleReady}
          activeOpacity={0.7}
          accessibilityLabel="Ready to set up your own data"
          accessibilityRole="button"
        >
          <Text style={styles.compactActionText}>Ready {'\u2192'}</Text>
        </TouchableOpacity>
      </Animated.View>
    );
  }

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <Text style={styles.icon}>{'\u{1F4CA}'}</Text>
        </View>
        <View style={styles.textContent}>
          <Text style={styles.title}>You're exploring with sample data</Text>
          <Text style={styles.subtitle}>
            This is demo content for a fictional patient. When you're ready, we'll help you set up your own.
          </Text>
        </View>
      </View>

      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={handleReady}
          activeOpacity={0.7}
          accessibilityLabel="I'm ready — set up my data"
          accessibilityRole="button"
        >
          <Text style={styles.primaryButtonText}>I'm ready {'\u2014'} set up my data {'\u2192'}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={handleKeepExploring}
          activeOpacity={0.7}
          accessibilityLabel="Keep exploring"
          accessibilityRole="button"
        >
          <Text style={styles.secondaryButtonText}>Keep exploring</Text>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
};

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
    gap: 8,
  },
  primaryButton: {
    backgroundColor: Colors.purpleBorder,
    borderWidth: 1,
    borderColor: Colors.purpleGlow,
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
    alignItems: 'center',
  },
  primaryButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.purpleBright,
  },
  secondaryButton: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    alignItems: 'center',
  },
  secondaryButtonText: {
    fontSize: 13,
    color: Colors.textTertiary,
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
});

export default SampleDataBanner;
