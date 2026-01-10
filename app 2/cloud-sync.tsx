// ============================================================================
// CLOUD SYNC SETTINGS SCREEN
// Configure optional encrypted cloud sync
// ============================================================================

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  Alert,
  Switch,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, BorderRadius } from './_theme/theme-tokens';
import {
  getSyncConfig,
  saveSyncConfig,
  initializeSync,
  performSync,
  disableSync,
  isSyncAvailable,
  SyncConfig,
} from '../utils/cloudSync';

export default function CloudSyncScreen() {
  const router = useRouter();
  const [config, setConfig] = useState<SyncConfig | null>(null);
  const [syncAvailable, setSyncAvailable] = useState(false);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [shareCode, setShareCode] = useState('');

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      const [syncConfig, available] = await Promise.all([
        getSyncConfig(),
        isSyncAvailable(),
      ]);
      setConfig(syncConfig);
      setSyncAvailable(available);
    } catch (error) {
      console.error('Error loading sync config:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEnableSync = async () => {
    Alert.alert(
      'Enable Cloud Sync',
      'Cloud sync is currently in development. This feature will allow you to sync data across devices with end-to-end encryption.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Learn More',
          onPress: () => {
            Alert.alert(
              'Cloud Sync (Coming Soon)',
              'Cloud sync features:\n\n• End-to-end encryption\n• Multi-device access\n• Family sharing with secure codes\n• Automatic or manual sync\n• Your data remains private\n\nThis feature requires a backend service and will be available in a future update.',
              [{ text: 'OK' }]
            );
          },
        },
      ]
    );
  };

  const handleJoinFamily = async () => {
    if (!shareCode.trim()) {
      Alert.alert('Error', 'Please enter a share code');
      return;
    }

    Alert.alert(
      'Join Family Group',
      'This feature is coming soon. You will be able to join a family group using a secure share code.',
      [{ text: 'OK' }]
    );
  };

  const handleManualSync = async () => {
    if (!config?.enabled) return;

    setSyncing(true);
    try {
      const result = await performSync();
      Alert.alert(
        result.success ? 'Success' : 'Error',
        result.message
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to sync data');
    } finally {
      setSyncing(false);
    }
  };

  const formatLastSync = (timestamp: string | null) => {
    if (!timestamp) return 'Never';
    const date = new Date(timestamp);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  if (loading || !config) {
    return (
      <SafeAreaView style={styles.container}>
        <LinearGradient
          colors={[Colors.backgroundGradientStart, Colors.backgroundGradientEnd]}
          style={styles.gradient}
        >
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>Loading...</Text>
          </View>
        </LinearGradient>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <LinearGradient
        colors={[Colors.backgroundGradientStart, Colors.backgroundGradientEnd]}
        style={styles.gradient}
      >
        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
              <Text style={styles.backIcon}>←</Text>
            </TouchableOpacity>
            <Text style={styles.headerLabel}>CLOUD SYNC</Text>
            <View style={styles.placeholder} />
          </View>

          <Text style={styles.title}>Cloud Sync</Text>

          {/* Coming Soon Banner */}
          <View style={styles.comingSoonBanner}>
            <Ionicons name="construct" size={24} color="#F59E0B" />
            <View style={styles.comingSoonContent}>
              <Text style={styles.comingSoonTitle}>Coming Soon</Text>
              <Text style={styles.comingSoonText}>
                Cloud sync is currently in development. The interface below shows how the feature
                will work once available.
              </Text>
            </View>
          </View>

          {/* Status Card */}
          <View style={styles.statusCard}>
            <View style={styles.statusHeader}>
              <Ionicons
                name={config.enabled ? 'cloud-done' : 'cloud-offline'}
                size={32}
                color={config.enabled ? Colors.accent : Colors.textMuted}
              />
              <Text style={styles.statusTitle}>
                {config.enabled ? 'Sync Enabled' : 'Sync Disabled'}
              </Text>
            </View>

            {config.enabled && (
              <View style={styles.statusDetails}>
                <View style={styles.statusRow}>
                  <Text style={styles.statusLabel}>Last Sync:</Text>
                  <Text style={styles.statusValue}>{formatLastSync(config.lastSync)}</Text>
                </View>
                <View style={styles.statusRow}>
                  <Text style={styles.statusLabel}>Device:</Text>
                  <Text style={styles.statusValue}>{config.deviceName}</Text>
                </View>
                {config.shareCode && (
                  <View style={styles.statusRow}>
                    <Text style={styles.statusLabel}>Share Code:</Text>
                    <Text style={[styles.statusValue, styles.shareCode]}>
                      {config.shareCode}
                    </Text>
                  </View>
                )}
              </View>
            )}

            {!config.enabled && (
              <TouchableOpacity
                style={styles.enableButton}
                onPress={handleEnableSync}
                disabled={!syncAvailable}
              >
                <Text style={styles.enableButtonText}>
                  {syncAvailable ? 'Enable Cloud Sync' : 'Coming Soon'}
                </Text>
              </TouchableOpacity>
            )}

            {config.enabled && (
              <TouchableOpacity
                style={styles.syncButton}
                onPress={handleManualSync}
                disabled={syncing}
              >
                <Ionicons name="sync" size={20} color={Colors.surface} />
                <Text style={styles.syncButtonText}>
                  {syncing ? 'Syncing...' : 'Sync Now'}
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Features Info */}
          <View style={styles.featuresCard}>
            <Text style={styles.featuresTitle}>What You'll Get</Text>

            <View style={styles.feature}>
              <Ionicons name="lock-closed" size={20} color={Colors.accent} />
              <View style={styles.featureText}>
                <Text style={styles.featureName}>End-to-End Encryption</Text>
                <Text style={styles.featureDesc}>
                  Your data is encrypted on your device before upload
                </Text>
              </View>
            </View>

            <View style={styles.feature}>
              <Ionicons name="people" size={20} color={Colors.accent} />
              <View style={styles.featureText}>
                <Text style={styles.featureName}>Family Sharing</Text>
                <Text style={styles.featureDesc}>
                  Multiple caregivers can access the same data
                </Text>
              </View>
            </View>

            <View style={styles.feature}>
              <Ionicons name="phone-portrait" size={20} color={Colors.accent} />
              <View style={styles.featureText}>
                <Text style={styles.featureName}>Multi-Device</Text>
                <Text style={styles.featureDesc}>
                  Access your data from any device
                </Text>
              </View>
            </View>

            <View style={styles.feature}>
              <Ionicons name="shield-checkmark" size={20} color={Colors.accent} />
              <View style={styles.featureText}>
                <Text style={styles.featureName}>Privacy First</Text>
                <Text style={styles.featureDesc}>
                  We never have access to your unencrypted data
                </Text>
              </View>
            </View>
          </View>

          {/* Join Family Section (disabled) */}
          <View style={styles.joinSection}>
            <Text style={styles.joinTitle}>Join a Family Group</Text>
            <Text style={styles.joinDescription}>
              If someone shared a code with you, enter it here to sync with their data.
            </Text>

            <TextInput
              style={styles.input}
              value={shareCode}
              onChangeText={setShareCode}
              placeholder="Enter share code (e.g., ABC123)"
              placeholderTextColor={Colors.textMuted}
              autoCapitalize="characters"
              maxLength={6}
              editable={false}
            />

            <TouchableOpacity
              style={[styles.joinButton, { opacity: 0.5 }]}
              onPress={handleJoinFamily}
              disabled={true}
            >
              <Text style={styles.joinButtonText}>Join Family Group</Text>
            </TouchableOpacity>
          </View>

          <View style={{ height: 40 }} />
        </ScrollView>
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  gradient: { flex: 1 },
  scrollView: { flex: 1, paddingHorizontal: Spacing.xl },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loadingText: { fontSize: 16, color: Colors.textSecondary },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Platform.OS === 'android' ? 20 : 0,
    paddingBottom: Spacing.md,
  },
    backButton: {
    width: 44,
    height: 44,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backIcon: {
    fontSize: 24,
    color: Colors.textPrimary,
  },
  headerLabel: { fontSize: 11, color: Colors.textMuted, letterSpacing: 1, fontWeight: '600' },
  backIcon: {
    fontSize: 24,
    color: Colors.textPrimary,
  },
  placeholder: { width: 40 },
  title: { fontSize: 28, fontWeight: '300', color: Colors.textPrimary, marginBottom: Spacing.lg },
  comingSoonBanner: {
    flexDirection: 'row',
    gap: 12,
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.2)',
  },
  comingSoonContent: { flex: 1 },
  comingSoonTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  comingSoonText: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  statusCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.xl,
    marginBottom: Spacing.lg,
  },
  statusHeader: {
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  statusTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginTop: 8,
  },
  statusDetails: {
    gap: 12,
    marginBottom: Spacing.lg,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statusLabel: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  statusValue: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.textPrimary,
  },
  shareCode: {
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    fontSize: 16,
    letterSpacing: 2,
  },
  enableButton: {
    backgroundColor: Colors.accent,
    paddingVertical: 14,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
  },
  enableButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.surface,
  },
  syncButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.accent,
    paddingVertical: 14,
    borderRadius: BorderRadius.md,
  },
  syncButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.surface,
  },
  featuresCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  featuresTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: Spacing.lg,
  },
  feature: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: Spacing.md,
  },
  featureText: {
    flex: 1,
  },
  featureName: {
    fontSize: 15,
    fontWeight: '500',
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  featureDesc: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  joinSection: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
  },
  joinTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: 8,
  },
  joinDescription: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 18,
    marginBottom: Spacing.lg,
  },
  input: {
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    fontSize: 16,
    color: Colors.textPrimary,
    marginBottom: Spacing.md,
    textAlign: 'center',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    letterSpacing: 4,
  },
  joinButton: {
    backgroundColor: Colors.accent,
    paddingVertical: 14,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
  },
  joinButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.surface,
  },
});
