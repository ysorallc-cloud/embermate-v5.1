// ============================================================================
// BACKUP SETTINGS SCREEN
// Manage cloud backup, encryption, and data restoration
// ============================================================================

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import { Colors } from '../_theme/theme-tokens';
import { CommonStyles } from '../_theme/commonStyles';
import PageHeader from '../../components/PageHeader';
import {
  quickBackup,
  quickRestore,
  getBackupHistory,
  getCloudBackupSettings,
  saveCloudBackupSettings,
  CloudBackupSettings,
  BackupMetadata,
  deleteBackup,
} from '../../utils/cloudBackup';
import {
  exportBackup,
  importEncryptedBackup,
  isBackupEncrypted,
  getBackupPreview,
} from '../../utils/dataBackup';

export default function BackupSettingsScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [settings, setSettings] = useState<CloudBackupSettings | null>(null);
  const [backups, setBackups] = useState<BackupMetadata[]>([]);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPasswordSetup, setShowPasswordSetup] = useState(false);
  const [showRestorePassword, setShowRestorePassword] = useState(false);
  const [selectedBackupPath, setSelectedBackupPath] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const loadedSettings = await getCloudBackupSettings();
      setSettings(loadedSettings);

      const history = await getBackupHistory();
      setBackups(history);
    } catch (error) {
      console.error('Error loading backup data:', error);
    }
  };

  const handleToggleAutoBackup = async () => {
    if (!settings) return;

    const newSettings = {
      ...settings,
      enabled: !settings.enabled,
      autoBackupInterval: settings.enabled ? 'manual' : 'daily',
    } as CloudBackupSettings;

    await saveCloudBackupSettings(newSettings);
    setSettings(newSettings);
  };

  const handleBackupNow = async () => {
    if (!password || password.length < 6) {
      Alert.alert(
        'Password Required',
        'Please enter a password (at least 6 characters) to encrypt your backup.',
        [{ text: 'OK', onPress: () => setShowPasswordSetup(true) }]
      );
      return;
    }

    setLoading(true);
    try {
      const result = await quickBackup(password);

      if (result.success) {
        Alert.alert(
          'Backup Complete',
          'Your data has been securely backed up and encrypted.\n\nThe backup is stored in your app documents folder and will sync to iCloud or Google Drive if enabled on your device.',
          [{ text: 'OK' }]
        );
        await loadData();
        setPassword('');
        setConfirmPassword('');
        setShowPasswordSetup(false);
      } else {
        Alert.alert('Backup Failed', result.error || 'Unknown error');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to create backup');
    } finally {
      setLoading(false);
    }
  };

  const handleExportPlain = async () => {
    Alert.alert(
      'Export Unencrypted',
      'This will create an unencrypted backup that can be read by anyone with access to the file.\n\nAre you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Export Anyway',
          style: 'destructive',
          onPress: async () => {
            setLoading(true);
            try {
              await exportBackup(false);
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleImportBackup = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/json', '*/*'],
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets?.[0]) {
        return;
      }

      const file = result.assets[0];
      const content = await FileSystem.readAsStringAsync(file.uri);

      // Check if encrypted
      const preview = getBackupPreview(content);

      if (!preview) {
        Alert.alert('Invalid File', 'This does not appear to be a valid EmberMate backup file.');
        return;
      }

      if (preview.encrypted || isBackupEncrypted(content)) {
        // Need password
        setSelectedBackupPath(file.uri);
        setShowRestorePassword(true);
      } else {
        // Plain backup - confirm restore
        Alert.alert(
          'Restore Backup',
          `Restore from backup?\n\n${preview.timestamp ? `Created: ${new Date(preview.timestamp).toLocaleString()}` : ''}\n\nThis will replace your current data.`,
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Restore',
              onPress: async () => {
                setLoading(true);
                try {
                  const backup = JSON.parse(content);
                  const { restoreFromBackup } = await import('../../utils/dataBackup');
                  const success = await restoreFromBackup(backup);

                  if (success) {
                    Alert.alert('Restore Complete', 'Your data has been restored successfully.');
                  }
                } catch (error) {
                  Alert.alert('Restore Failed', 'Could not restore the backup.');
                } finally {
                  setLoading(false);
                }
              },
            },
          ]
        );
      }
    } catch (error) {
      console.error('Import error:', error);
      Alert.alert('Import Error', 'Could not read the backup file.');
    }
  };

  const handleRestoreWithPassword = async () => {
    if (!selectedBackupPath || !password) {
      Alert.alert('Error', 'Please enter your backup password.');
      return;
    }

    setLoading(true);
    try {
      const content = await FileSystem.readAsStringAsync(selectedBackupPath);
      const success = await importEncryptedBackup(content, password);

      if (success) {
        Alert.alert('Restore Complete', 'Your data has been restored successfully.', [
          {
            text: 'OK',
            onPress: () => {
              setShowRestorePassword(false);
              setSelectedBackupPath(null);
              setPassword('');
              router.replace('/');
            },
          },
        ]);
      }
    } catch (error) {
      Alert.alert('Restore Failed', 'Invalid password or corrupted backup.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteBackup = async (filename: string) => {
    Alert.alert(
      'Delete Backup',
      'Are you sure you want to delete this backup? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const success = await deleteBackup(filename);
            if (success) {
              await loadData();
            } else {
              Alert.alert('Error', 'Could not delete the backup.');
            }
          },
        },
      ]
    );
  };

  const formatTimestamp = (timestamp: string): string => {
    try {
      const date = new Date(timestamp);
      return date.toLocaleString();
    } catch {
      return timestamp;
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <LinearGradient
          colors={[Colors.backgroundGradientStart, Colors.backgroundGradientEnd]}
          style={styles.gradient}
        >
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={Colors.accent} />
            <Text style={styles.loadingText}>Processing...</Text>
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
        <View style={CommonStyles.headerWrapper}>
          <TouchableOpacity
            style={CommonStyles.backButton}
            onPress={() => router.back()}
          >
            <Text style={CommonStyles.backIcon}>←</Text>
          </TouchableOpacity>

          <PageHeader
            emoji="☁️"
            label="Data Protection"
            title="Backup & Restore"
          />
        </View>

        <ScrollView style={styles.content}>
          {/* Info Banner */}
          <View style={styles.infoBanner}>
            <Text style={styles.infoIcon}>🔐</Text>
            <Text style={styles.infoText}>
              Backups are encrypted and stored in your app's documents folder.
              If you have iCloud or Google Drive backup enabled, they will sync automatically.
            </Text>
          </View>

          {/* Password Setup Section */}
          {showPasswordSetup && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Set Backup Password</Text>
              <TextInput
                style={styles.passwordInput}
                placeholder="Enter password (min 6 characters)"
                placeholderTextColor={Colors.textMuted}
                secureTextEntry
                value={password}
                onChangeText={setPassword}
                autoCapitalize="none"
              />
              <TextInput
                style={styles.passwordInput}
                placeholder="Confirm password"
                placeholderTextColor={Colors.textMuted}
                secureTextEntry
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                autoCapitalize="none"
              />
              {password && confirmPassword && password !== confirmPassword && (
                <Text style={styles.errorText}>Passwords do not match</Text>
              )}
              <View style={styles.buttonRow}>
                <TouchableOpacity
                  style={[styles.button, styles.secondaryButton]}
                  onPress={() => {
                    setShowPasswordSetup(false);
                    setPassword('');
                    setConfirmPassword('');
                  }}
                >
                  <Text style={styles.secondaryButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.button,
                    styles.primaryButton,
                    (!password || password.length < 6 || password !== confirmPassword) && styles.buttonDisabled,
                  ]}
                  onPress={handleBackupNow}
                  disabled={!password || password.length < 6 || password !== confirmPassword}
                >
                  <Text style={styles.primaryButtonText}>Create Backup</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Restore with Password Modal */}
          {showRestorePassword && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Enter Backup Password</Text>
              <Text style={styles.sectionDescription}>
                This backup is encrypted. Enter the password you used when creating it.
              </Text>
              <TextInput
                style={styles.passwordInput}
                placeholder="Backup password"
                placeholderTextColor={Colors.textMuted}
                secureTextEntry
                value={password}
                onChangeText={setPassword}
                autoCapitalize="none"
              />
              <View style={styles.buttonRow}>
                <TouchableOpacity
                  style={[styles.button, styles.secondaryButton]}
                  onPress={() => {
                    setShowRestorePassword(false);
                    setSelectedBackupPath(null);
                    setPassword('');
                  }}
                >
                  <Text style={styles.secondaryButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.button, styles.primaryButton, !password && styles.buttonDisabled]}
                  onPress={handleRestoreWithPassword}
                  disabled={!password}
                >
                  <Text style={styles.primaryButtonText}>Restore</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Quick Actions */}
          {!showPasswordSetup && !showRestorePassword && (
            <>
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Quick Actions</Text>

                <TouchableOpacity
                  style={styles.actionCard}
                  onPress={() => setShowPasswordSetup(true)}
                >
                  <Text style={styles.actionIcon}>💾</Text>
                  <View style={styles.actionContent}>
                    <Text style={styles.actionTitle}>Backup Now</Text>
                    <Text style={styles.actionSubtitle}>
                      Create encrypted backup of all data
                    </Text>
                  </View>
                  <Text style={styles.arrow}>→</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.actionCard}
                  onPress={handleImportBackup}
                >
                  <Text style={styles.actionIcon}>📥</Text>
                  <View style={styles.actionContent}>
                    <Text style={styles.actionTitle}>Restore from File</Text>
                    <Text style={styles.actionSubtitle}>
                      Import backup from device storage
                    </Text>
                  </View>
                  <Text style={styles.arrow}>→</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.actionCard}
                  onPress={handleExportPlain}
                >
                  <Text style={styles.actionIcon}>📤</Text>
                  <View style={styles.actionContent}>
                    <Text style={styles.actionTitle}>Export Unencrypted</Text>
                    <Text style={styles.actionSubtitle}>
                      Share plain JSON (less secure)
                    </Text>
                  </View>
                  <Text style={styles.arrow}>→</Text>
                </TouchableOpacity>
              </View>

              {/* Auto Backup Toggle */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Automatic Backup</Text>
                <TouchableOpacity
                  style={styles.toggleRow}
                  onPress={handleToggleAutoBackup}
                >
                  <View style={styles.toggleContent}>
                    <Text style={styles.toggleTitle}>Daily Auto-Backup</Text>
                    <Text style={styles.toggleSubtitle}>
                      {settings?.enabled
                        ? 'Backups created daily when app is opened'
                        : 'Manual backups only'}
                    </Text>
                  </View>
                  <View style={[styles.toggle, settings?.enabled && styles.toggleActive]}>
                    <View style={[styles.toggleDot, settings?.enabled && styles.toggleDotActive]} />
                  </View>
                </TouchableOpacity>
                {settings?.lastBackupTimestamp && (
                  <Text style={styles.lastBackupText}>
                    Last backup: {formatTimestamp(settings.lastBackupTimestamp)}
                  </Text>
                )}
              </View>

              {/* Backup History */}
              {backups.length > 0 && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Backup History</Text>
                  {backups.map((backup) => (
                    <View key={backup.filename} style={styles.backupItem}>
                      <View style={styles.backupInfo}>
                        <Text style={styles.backupDate}>
                          {formatTimestamp(backup.timestamp)}
                        </Text>
                        <Text style={styles.backupSize}>
                          {formatFileSize(backup.size)} • {backup.encrypted ? '🔐 Encrypted' : 'Plain'}
                        </Text>
                      </View>
                      <TouchableOpacity
                        style={styles.deleteButton}
                        onPress={() => handleDeleteBackup(backup.filename)}
                      >
                        <Text style={styles.deleteButtonText}>🗑</Text>
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              )}
            </>
          )}

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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    color: Colors.textSecondary,
    fontSize: 14,
  },

  // Info Banner
  infoBanner: {
    flexDirection: 'row',
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.2)',
    borderRadius: 12,
    padding: 14,
    marginBottom: 20,
    alignItems: 'flex-start',
    gap: 12,
  },
  infoIcon: {
    fontSize: 20,
  },
  infoText: {
    flex: 1,
    color: Colors.textSecondary,
    fontSize: 13,
    lineHeight: 20,
  },

  // Sections
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: 12,
  },
  sectionDescription: {
    color: Colors.textSecondary,
    fontSize: 13,
    marginBottom: 12,
    lineHeight: 20,
  },

  // Action Cards
  actionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
    gap: 14,
  },
  actionIcon: {
    fontSize: 24,
  },
  actionContent: {
    flex: 1,
  },
  actionTitle: {
    fontSize: 15,
    fontWeight: '500',
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  actionSubtitle: {
    fontSize: 12,
    color: Colors.textTertiary,
  },
  arrow: {
    fontSize: 18,
    color: Colors.textMuted,
  },

  // Toggle
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 12,
    padding: 16,
  },
  toggleContent: {
    flex: 1,
  },
  toggleTitle: {
    fontSize: 15,
    fontWeight: '500',
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  toggleSubtitle: {
    fontSize: 12,
    color: Colors.textTertiary,
  },
  toggle: {
    width: 48,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 2,
    borderColor: Colors.border,
    padding: 2,
    justifyContent: 'center',
  },
  toggleActive: {
    backgroundColor: Colors.accent,
    borderColor: Colors.accent,
  },
  toggleDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: Colors.textTertiary,
  },
  toggleDotActive: {
    backgroundColor: Colors.background,
    alignSelf: 'flex-end',
  },
  lastBackupText: {
    marginTop: 10,
    fontSize: 12,
    color: Colors.textMuted,
  },

  // Password Input
  passwordInput: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: Colors.textPrimary,
    fontSize: 14,
    marginBottom: 12,
  },
  errorText: {
    color: Colors.error,
    fontSize: 12,
    marginBottom: 12,
  },

  // Buttons
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  button: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  primaryButton: {
    backgroundColor: Colors.accent,
  },
  secondaryButton: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  primaryButtonText: {
    color: Colors.background,
    fontWeight: '600',
    fontSize: 14,
  },
  secondaryButtonText: {
    color: Colors.textSecondary,
    fontWeight: '500',
    fontSize: 14,
  },

  // Backup History
  backupItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 10,
    padding: 14,
    marginBottom: 8,
  },
  backupInfo: {
    flex: 1,
  },
  backupDate: {
    fontSize: 14,
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  backupSize: {
    fontSize: 12,
    color: Colors.textTertiary,
  },
  deleteButton: {
    padding: 8,
  },
  deleteButtonText: {
    fontSize: 16,
  },
});
