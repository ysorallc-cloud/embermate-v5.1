// ============================================================================
// SETTINGS SCREEN - Reorganized with categories and search
// Infrastructure, not interface - Source of truth for Care Hub and daily tracking
// ============================================================================

import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Share,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors } from '../../theme/theme-tokens';
import { CommonStyles } from '../../theme/commonStyles';
import PageHeader from '../../components/PageHeader';
import { generateSampleCorrelationData, clearSampleCorrelationData, hasSampleData } from '../../utils/sampleDataGenerator';
import { StorageKeys } from '../../utils/storageKeys';
import { getMedications } from '../../utils/medicationStorage';
import { getAppointments, getUpcomingAppointments } from '../../utils/appointmentStorage';
import { getCaregivers } from '../../utils/collaborativeCare';
import { exportBackup, clearAllData } from '../../utils/dataBackup';

// Settings category definitions
interface SettingItem {
  id: string;
  icon: string;
  title: string;
  subtitle?: string;
  onPress: () => void;
  danger?: boolean;
}

interface SettingsCategory {
  id: string;
  icon: string;
  title: string;
  items: SettingItem[];
}

export default function SettingsScreen() {
  const router = useRouter();
  const [patientName, setPatientName] = useState('');
  const [hasSample, setHasSample] = useState(false);
  const [lastModified, setLastModified] = useState<string>('');
  const [use24HourTime, setUse24HourTime] = useState(false);
  const [medicationCount, setMedicationCount] = useState(0);
  const [appointmentCount, setAppointmentCount] = useState(0);
  const [caregiverCount, setCaregiverCount] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [collapsedCategories, setCollapsedCategories] = useState<Record<string, boolean>>({
    advanced: true, // Advanced collapsed by default
  });

  useEffect(() => {
    loadPatientName();
    checkSampleData();
    loadLastModified();
    loadTimePreference();
  }, []);

  // Reload counts when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      loadCounts();
    }, [])
  );

  const loadCounts = async () => {
    try {
      // Load medication count
      const meds = await getMedications();
      const activeMeds = meds.filter(m => m.active);
      setMedicationCount(activeMeds.length);

      // Load appointment count
      const upcomingAppts = await getUpcomingAppointments();
      setAppointmentCount(upcomingAppts.length);

      // Load caregiver count
      const caregivers = await getCaregivers();
      setCaregiverCount(caregivers.length);
    } catch (error) {
      console.error('Error loading counts:', error);
    }
  };

  const loadLastModified = async () => {
    try {
      const timestamp = await AsyncStorage.getItem('@EmberMate:settings_modified');
      if (timestamp) {
        const date = new Date(timestamp);
        setLastModified(date.toLocaleDateString());
      }
    } catch (error) {
      console.error('Error loading last modified:', error);
    }
  };

  const updateLastModified = async () => {
    try {
      await AsyncStorage.setItem('@EmberMate:settings_modified', new Date().toISOString());
      await loadLastModified();
    } catch (error) {
      console.error('Error updating last modified:', error);
    }
  };

  const loadTimePreference = async () => {
    try {
      const preference = await AsyncStorage.getItem('@EmberMate:use_24_hour_time');
      setUse24HourTime(preference === 'true');
    } catch (error) {
      console.error('Error loading time preference:', error);
    }
  };

  const toggleTimeFormat = async () => {
    try {
      const newValue = !use24HourTime;
      setUse24HourTime(newValue);
      await AsyncStorage.setItem('@EmberMate:use_24_hour_time', newValue.toString());
      await updateLastModified();
    } catch (error) {
      console.error('Error saving time preference:', error);
    }
  };

  const checkSampleData = async () => {
    const exists = await hasSampleData();
    setHasSample(exists);
  };

  const loadPatientName = async () => {
    try {
      const name = await AsyncStorage.getItem(StorageKeys.PATIENT_NAME);
      if (name) setPatientName(name);
    } catch (error) {
      console.error('Error loading patient name:', error);
    }
  };

  const handleGenerateSample = async () => {
    Alert.alert(
      'Generate Sample Data',
      'This creates test data for development. Your existing data won\'t be affected.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Generate',
          onPress: async () => {
            await generateSampleCorrelationData();
            await checkSampleData();
            Alert.alert('Done', 'Sample data created. Check Today and Insights tabs.');
          }
        }
      ]
    );
  };

  const handleBackupData = async () => {
    try {
      const success = await exportBackup();
      if (success) {
        Alert.alert(
          'Backup Complete',
          'Your data has been exported successfully. Save this file in a secure location.'
        );
      }
    } catch (error) {
      console.error('Error backing up data:', error);
      Alert.alert('Backup Failed', 'Could not create backup. Please try again.');
    }
  };

  const handleClearAllData = async () => {
    Alert.alert(
      'Clear All Data',
      'This will permanently delete ALL your data including medications, appointments, and patient information. This cannot be undone.\n\nAre you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear Everything',
          style: 'destructive',
          onPress: async () => {
            const success = await clearAllData();
            if (success) {
              Alert.alert('Data Cleared', 'All data has been removed.', [
                {
                  text: 'OK',
                  onPress: () => {
                    // Reload the app or navigate to onboarding
                    router.replace('/(onboarding)' as any);
                  },
                },
              ]);
            } else {
              Alert.alert('Error', 'Could not clear data. Please try again.');
            }
          },
        },
      ]
    );
  };

  const handleClearSample = async () => {
    Alert.alert(
      'Clear Sample Data',
      'This removes test data only. Your real data stays intact.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            await clearSampleCorrelationData();
            await checkSampleData();
            Alert.alert('Done', 'Sample data removed.');
          }
        }
      ]
    );
  };

  const handleResetOnboarding = async () => {
    Alert.alert(
      'Reset Onboarding',
      'This will show the welcome screens again the next time you open the app. Your data will not be affected.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          onPress: async () => {
            try {
              await AsyncStorage.removeItem(StorageKeys.ONBOARDING_COMPLETE);
              Alert.alert(
                'Onboarding Reset',
                'The onboarding screens will appear when you reload the app.',
                [
                  {
                    text: 'Reload Now',
                    onPress: () => router.replace('/(onboarding)' as any),
                  },
                  {
                    text: 'Later',
                    style: 'cancel',
                  },
                ]
              );
            } catch (error) {
              console.error('Error resetting onboarding:', error);
              Alert.alert('Error', 'Could not reset onboarding. Please try again.');
            }
          },
        },
      ]
    );
  };

  const handleExportData = async () => {
    try {
      const medications = await getMedications();
      const appointments = await getAppointments();

      const exportData = {
        medications,
        appointments,
        exportDate: new Date().toISOString(),
        version: '1.0'
      };

      const jsonString = JSON.stringify(exportData, null, 2);

      await Share.share({
        message: jsonString,
        title: 'EmberMate Export'
      });
    } catch (error) {
      console.error('Export error:', error);
      Alert.alert('Error', 'Export failed. Please try again.');
    }
  };

  const toggleCategory = (categoryId: string) => {
    setCollapsedCategories(prev => ({
      ...prev,
      [categoryId]: !prev[categoryId],
    }));
  };

  // Define all settings organized into categories
  const categories: SettingsCategory[] = useMemo(() => [
    {
      id: 'profile',
      icon: '👤',
      title: 'Profile & Medical Info',
      items: [
        {
          id: 'care-plan',
          icon: '📋',
          title: 'Care Plan',
          subtitle: 'What to track daily',
          onPress: () => router.push('/care-plan' as any),
        },
        {
          id: 'patient',
          icon: '👤',
          title: 'Patient Information',
          subtitle: `${patientName || 'Patient'} • Medical history & allergies`,
          onPress: () => router.push('/patient'),
        },
        {
          id: 'medications',
          icon: '💊',
          title: 'Medications',
          subtitle: `${medicationCount} active`,
          onPress: () => router.push('/medications'),
        },
        {
          id: 'appointments',
          icon: '📅',
          title: 'Appointments',
          subtitle: `${appointmentCount} upcoming`,
          onPress: () => router.push('/appointments'),
        },
        {
          id: 'emergency',
          icon: '🚨',
          title: 'Emergency Contacts',
          subtitle: 'Quick dial contacts',
          onPress: () => router.push('/emergency'),
        },
        {
          id: 'vital-thresholds',
          icon: '📊',
          title: 'Vital Sign Ranges',
          subtitle: 'Custom alert thresholds',
          onPress: () => router.push('/vital-threshold-settings' as any),
        },
      ],
    },
    {
      id: 'appearance',
      icon: '🎨',
      title: 'Appearance & Experience',
      items: [
        {
          id: 'time-format',
          icon: '🕐',
          title: '24-Hour Time Format',
          subtitle: use24HourTime ? 'Currently using 24-hour format' : 'Currently using 12-hour format',
          onPress: toggleTimeFormat,
        },
      ],
    },
    {
      id: 'notifications',
      icon: '🔔',
      title: 'Notifications & Reminders',
      items: [
        {
          id: 'notification-settings',
          icon: '🔔',
          title: 'Notification Settings',
          subtitle: 'Sound, quiet hours, escalation',
          onPress: () => router.push('/notification-settings'),
        },
      ],
    },
    {
      id: 'privacy',
      icon: '🔒',
      title: 'Privacy & Security',
      items: [
        {
          id: 'security',
          icon: '🔒',
          title: 'Security Settings',
          subtitle: 'App lock, encryption, audit logs',
          onPress: () => router.push('/settings/security'),
        },
      ],
    },
    {
      id: 'data',
      icon: '💾',
      title: 'Data Management',
      items: [
        {
          id: 'backup',
          icon: '💾',
          title: 'Backup Data',
          subtitle: 'Export all data to file',
          onPress: handleBackupData,
        },
        {
          id: 'export-summary',
          icon: '📤',
          title: 'Export Summary',
          subtitle: 'Create care summary PDF',
          onPress: () => router.push('/care-summary-export'),
        },
        {
          id: 'cloud-sync',
          icon: '☁️',
          title: 'Cloud Backup',
          subtitle: 'Encrypted backup & restore',
          onPress: () => router.push('/settings/backup'),
        },
      ],
    },
    {
      id: 'about',
      icon: 'ℹ️',
      title: 'About & Support',
      items: [
        {
          id: 'reset-onboarding',
          icon: '🔄',
          title: 'Reset Onboarding',
          subtitle: 'View welcome screens again',
          onPress: handleResetOnboarding,
        },
        {
          id: 'version',
          icon: 'ℹ️',
          title: 'Version',
          subtitle: '2.0.1',
          onPress: () => {},
        },
      ],
    },
    {
      id: 'advanced',
      icon: '⚙️',
      title: 'Advanced',
      items: [
        ...(hasSample ? [{
          id: 'clear-sample',
          icon: '🧹',
          title: 'Clear Sample Data',
          subtitle: 'Remove demo data only',
          onPress: handleClearSample,
        }] : []),
        {
          id: 'clear-data',
          icon: '⚠️',
          title: 'Clear All Data',
          subtitle: 'Permanent deletion',
          onPress: handleClearAllData,
          danger: true,
        },
      ],
    },
  ], [patientName, medicationCount, appointmentCount, use24HourTime, hasSample]);

  // Filter settings based on search query
  const filteredCategories = useMemo(() => {
    if (!searchQuery.trim()) return categories;

    const query = searchQuery.toLowerCase();
    return categories
      .map(category => ({
        ...category,
        items: category.items.filter(
          item =>
            item.title.toLowerCase().includes(query) ||
            (item.subtitle && item.subtitle.toLowerCase().includes(query))
        ),
      }))
      .filter(category => category.items.length > 0);
  }, [categories, searchQuery]);

  const renderSettingItem = (item: SettingItem) => (
    <TouchableOpacity
      key={item.id}
      style={[styles.settingItem, item.danger && styles.dangerItem]}
      onPress={item.onPress}
      activeOpacity={0.7}
    >
      <Text style={styles.settingIcon}>{item.icon}</Text>
      <View style={styles.settingContent}>
        <Text style={[styles.settingTitle, item.danger && styles.dangerText]}>
          {item.title}
        </Text>
        {item.subtitle && (
          <Text style={styles.settingSubtitle}>{item.subtitle}</Text>
        )}
      </View>
      <Text style={styles.arrow}>›</Text>
    </TouchableOpacity>
  );

  const renderCategory = (category: SettingsCategory) => {
    const isCollapsed = collapsedCategories[category.id];

    return (
      <View key={category.id} style={styles.categoryContainer}>
        <TouchableOpacity
          style={styles.categoryHeader}
          onPress={() => toggleCategory(category.id)}
          activeOpacity={0.7}
        >
          <Text style={styles.categoryIcon}>{category.icon}</Text>
          <View style={styles.categoryTitleContainer}>
            <Text style={styles.categoryTitle}>{category.title}</Text>
            <Text style={styles.categoryCount}>{category.items.length} settings</Text>
          </View>
          <Text style={styles.collapseIcon}>{isCollapsed ? '▶' : '▼'}</Text>
        </TouchableOpacity>

        {!isCollapsed && (
          <View style={styles.categoryItems}>
            {category.items.map(renderSettingItem)}
          </View>
        )}
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
            onPress={() => router.back()}
          >
            <Text style={CommonStyles.backIcon}>←</Text>
          </TouchableOpacity>

          <PageHeader
            emoji="⚙️"
            label="Configuration"
            title="Settings"
          />
        </View>

        <ScrollView style={styles.content}>
          {/* Search Bar */}
          <View style={styles.searchContainer}>
            <TextInput
              style={styles.searchInput}
              placeholder="🔍 Search settings..."
              placeholderTextColor={Colors.textMuted}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity
                style={styles.clearSearch}
                onPress={() => setSearchQuery('')}
              >
                <Text style={styles.clearSearchText}>✕</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Last Modified */}
          {lastModified && (
            <View style={styles.infoBanner}>
              <Text style={styles.infoBannerText}>Last updated: {lastModified}</Text>
            </View>
          )}

          {/* Search Results or Categories */}
          {searchQuery.trim() ? (
            <View style={styles.searchResults}>
              <Text style={styles.searchResultsTitle}>
                {filteredCategories.reduce((acc, cat) => acc + cat.items.length, 0)} results
              </Text>
              {filteredCategories.map(category =>
                category.items.map(renderSettingItem)
              )}
            </View>
          ) : (
            <>
              {categories.map(renderCategory)}
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

  // Search
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  searchInput: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: Colors.textPrimary,
    fontSize: 14,
  },
  clearSearch: {
    position: 'absolute',
    right: 12,
    padding: 4,
  },
  clearSearchText: {
    fontSize: 14,
    color: Colors.textMuted,
  },
  searchResults: {
    marginBottom: 20,
  },
  searchResultsTitle: {
    fontSize: 12,
    color: Colors.textMuted,
    marginBottom: 12,
  },

  infoBanner: {
    backgroundColor: 'rgba(232, 155, 95, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(232, 155, 95, 0.15)',
    borderRadius: 8,
    padding: 10,
    marginBottom: 20,
  },
  infoBannerText: {
    fontSize: 12,
    color: Colors.textSecondary,
    textAlign: 'center',
  },

  // Categories
  categoryContainer: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 12,
    marginBottom: 12,
    overflow: 'hidden',
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
  },
  categoryIcon: {
    fontSize: 24,
  },
  categoryTitleContainer: {
    flex: 1,
  },
  categoryTitle: {
    fontSize: 15,
    fontWeight: '500',
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  categoryCount: {
    fontSize: 12,
    color: Colors.textMuted,
  },
  collapseIcon: {
    fontSize: 12,
    color: Colors.textMuted,
  },
  categoryItems: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.08)',
  },

  // Setting Items
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    paddingLeft: 56,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  settingIcon: {
    fontSize: 18,
    marginRight: 12,
  },
  settingContent: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  settingSubtitle: {
    fontSize: 12,
    color: Colors.textTertiary,
  },
  arrow: {
    fontSize: 16,
    color: Colors.textMuted,
  },

  dangerItem: {
    backgroundColor: 'rgba(239, 68, 68, 0.05)',
  },
  dangerText: {
    color: Colors.error,
  },

  // Toggle (for time format)
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
});
