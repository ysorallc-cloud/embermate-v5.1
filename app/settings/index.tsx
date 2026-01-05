// ============================================================================
// SETTINGS SCREEN - Infrastructure, not interface
// Source of truth for Care Hub and daily tracking
// ============================================================================

import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  Alert,
  Share,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors } from '../_theme/theme-tokens';
import { CommonStyles } from '../_theme/commonStyles';
import PageHeader from '../../components/PageHeader';
import { generateSampleData, clearSampleData, hasSampleData } from '../../utils/sampleDataGenerator';
import { StorageKeys } from '../../utils/storageKeys';
import { getMedications } from '../../utils/medicationStorage';
import { getAppointments, getUpcomingAppointments } from '../../utils/appointmentStorage';
import { getCaregivers } from '../../utils/collaborativeCare';
import { exportBackup, clearAllData } from '../../utils/dataBackup';

export default function SettingsScreen() {
  const router = useRouter();
  const [patientName, setPatientName] = useState('');
  const [hasSample, setHasSample] = useState(false);
  const [lastModified, setLastModified] = useState<string>('');
  const [use24HourTime, setUse24HourTime] = useState(false);
  const [medicationCount, setMedicationCount] = useState(0);
  const [appointmentCount, setAppointmentCount] = useState(0);
  const [caregiverCount, setCaregiverCount] = useState(0);

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
            await generateSampleData();
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
                    router.replace('/onboarding');
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
            await clearSampleData();
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
                    onPress: () => router.replace('/onboarding'),
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
            explanation="Source of truth for Care Hub and daily tracking"
          />
        </View>

        <ScrollView style={styles.content}>
          {/* Last Modified */}
          {lastModified && (
            <View style={styles.infoBanner}>
              <Text style={styles.infoBannerText}>Last updated: {lastModified}</Text>
            </View>
          )}

          {/* 1. PATIENT BASELINE */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>1. PATIENT BASELINE</Text>
            <Text style={styles.sectionHelper}>Set once • Review occasionally • Used throughout app</Text>
            
            <TouchableOpacity 
              style={styles.card}
              onPress={() => {
                Alert.alert(
                  'Patient Information',
                  'Changes here affect all tracking and reports. You can update this anytime.',
                  [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Continue', onPress: () => router.push('/patient') }
                  ]
                );
              }}
            >
              <View style={styles.cardLeft}>
                <Text style={styles.cardIcon}>👤</Text>
                <View style={styles.cardText}>
                  <Text style={styles.cardTitle}>Patient Information</Text>
                  <Text style={styles.cardDetail}>{patientName || 'Mom'} • Medical history & allergies</Text>
                  <Text style={styles.usageLabel}>Used by: Care Hub, Reports</Text>
                </View>
              </View>
              <Text style={styles.arrow}>→</Text>
            </TouchableOpacity>
          </View>

          {/* 1. SECURITY */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>1. SECURITY & PRIVACY</Text>

            <TouchableOpacity
              style={styles.settingItem}
              onPress={() => router.push('/settings/security')}
            >
              <Text style={styles.settingIcon}>🔒</Text>
              <View style={styles.settingContent}>
                <Text style={styles.settingTitle}>Security Settings</Text>
                <Text style={styles.settingSubtitle}>App lock, encryption, audit logs</Text>
              </View>
              <Text style={styles.arrow}>→</Text>
            </TouchableOpacity>
          </View>

          {/* 2. PREFERENCES */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>2. PREFERENCES</Text>
            <Text style={styles.sectionHelper}>Customize your experience</Text>
            
            <TouchableOpacity 
              style={styles.card}
              onPress={() => router.push('/notification-settings')}
            >
              <View style={styles.cardLeft}>
                <Text style={styles.cardIcon}>🔔</Text>
                <View style={styles.cardText}>
                  <Text style={styles.cardTitle}>Notification Settings</Text>
                  <Text style={styles.cardDetail}>Medication reminders, appointment alerts, and more</Text>
                  <Text style={styles.usageLabel}>Configure: Reminders, sound, timing</Text>
                </View>
              </View>
              <Text style={styles.arrow}>→</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.card}
              onPress={toggleTimeFormat}
            >
              <View style={styles.cardLeft}>
                <Text style={styles.cardIcon}>🕐</Text>
                <View style={styles.cardText}>
                  <Text style={styles.cardTitle}>24-Hour Time Format</Text>
                  <Text style={styles.cardDetail}>
                    {use24HourTime ? 'Currently using 24-hour format (13:00)' : 'Currently using 12-hour format (1:00 PM)'}
                  </Text>
                </View>
              </View>
              <View style={[styles.toggle, use24HourTime && styles.toggleActive]}>
                <View style={[styles.toggleDot, use24HourTime && styles.toggleDotActive]} />
              </View>
            </TouchableOpacity>
          </View>

          {/* PATIENT & CARE Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>PATIENT & CARE</Text>
            
            <TouchableOpacity 
              style={styles.settingItem}
              onPress={() => router.push('/patient')}
            >
              <Text style={styles.settingIcon}>👤</Text>
              <View style={styles.settingContent}>
                <Text style={styles.settingTitle}>Patient</Text>
                <Text style={styles.settingSubtitle}>Mom</Text>
              </View>
              <Text style={styles.arrow}>→</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.settingItem}
              onPress={() => router.push('/medications')}
            >
              <Text style={styles.settingIcon}>💊</Text>
              <View style={styles.settingContent}>
                <Text style={styles.settingTitle}>Medications</Text>
                <Text style={styles.settingSubtitle}>{medicationCount} active</Text>
              </View>
              <Text style={styles.arrow}>→</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.settingItem}
              onPress={() => router.push('/appointments')}
            >
              <Text style={styles.settingIcon}>📅</Text>
              <View style={styles.settingContent}>
                <Text style={styles.settingTitle}>Appointments</Text>
                <Text style={styles.settingSubtitle}>{appointmentCount} upcoming</Text>
              </View>
              <Text style={styles.arrow}>→</Text>
            </TouchableOpacity>
          </View>

          {/* DATA Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>DATA</Text>

            <TouchableOpacity
              style={styles.settingItem}
              onPress={handleBackupData}
            >
              <Text style={styles.settingIcon}>💾</Text>
              <View style={styles.settingContent}>
                <Text style={styles.settingTitle}>Backup Data</Text>
                <Text style={styles.settingSubtitle}>Export all data to file</Text>
              </View>
              <Text style={styles.arrow}>→</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.settingItem}
              onPress={() => router.push('/care-summary-export')}
            >
              <Text style={styles.settingIcon}>📤</Text>
              <View style={styles.settingContent}>
                <Text style={styles.settingTitle}>Export Summary</Text>
                <Text style={styles.settingSubtitle}>Create care summary PDF</Text>
              </View>
              <Text style={styles.arrow}>→</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.settingItem}
              onPress={() => router.push('/cloud-sync')}
            >
              <Text style={styles.settingIcon}>☁️</Text>
              <View style={styles.settingContent}>
                <Text style={styles.settingTitle}>Cloud Sync</Text>
                <Text style={styles.settingSubtitle}>Coming soon</Text>
              </View>
              <Text style={styles.arrow}>→</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.settingItem}
              onPress={handleResetOnboarding}
            >
              <Text style={styles.settingIcon}>🔄</Text>
              <View style={styles.settingContent}>
                <Text style={styles.settingTitle}>Reset Onboarding</Text>
                <Text style={styles.settingSubtitle}>View welcome screens again</Text>
              </View>
              <Text style={styles.arrow}>→</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.settingItem, styles.dangerItem]}
              onPress={handleClearAllData}
            >
              <Text style={styles.settingIcon}>⚠️</Text>
              <View style={styles.settingContent}>
                <Text style={[styles.settingTitle, styles.dangerText]}>Clear All Data</Text>
                <Text style={styles.settingSubtitle}>Permanent deletion</Text>
              </View>
              <Text style={styles.arrow}>→</Text>
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
  backButtonPositioned: {
    position: 'absolute',
    top: 16,
    left: 24,
    zIndex: 100,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 16,
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
  
  section: {
    marginBottom: 28,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: Colors.textMuted,
    marginBottom: 4,
  },
  sectionHelper: {
    fontSize: 11,
    color: Colors.textTertiary,
    marginBottom: 10,
    fontStyle: 'italic',
    lineHeight: 16,
  },
  
  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    backgroundColor: Colors.surfaceAlt,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    padding: 14,
    marginBottom: 6,
  },
  dangerCard: {
    borderColor: 'rgba(248, 113, 113, 0.25)',
  },
  cardLeft: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    flex: 1,
  },
  cardIcon: {
    fontSize: 22,
    marginTop: 1,
  },
  cardText: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '500',
    color: Colors.textPrimary,
    marginBottom: 3,
  },
  dangerText: {
    color: Colors.error,
  },
  cardDetail: {
    fontSize: 13,
    color: Colors.textTertiary,
    lineHeight: 17,
    marginBottom: 4,
  },
  usageLabel: {
    fontSize: 10,
    color: 'rgba(232, 155, 95, 0.6)',
    fontStyle: 'italic',
    marginTop: 2,
  },
  safetyLabel: {
    fontSize: 10,
    color: 'rgba(74, 222, 128, 0.7)',
    fontStyle: 'italic',
    marginTop: 2,
  },
  arrow: {
    fontSize: 15,
    color: Colors.textMuted,
    marginTop: 2,
  },
  
  // TOGGLE SWITCH
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
  
  // SETTING ITEMS
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  settingIcon: {
    fontSize: 22,
    marginRight: 14,
  },
  settingContent: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  settingSubtitle: {
    fontSize: 13,
    color: Colors.textTertiary,
  },

  dangerItem: {
    borderColor: 'rgba(239, 68, 68, 0.3)',
    backgroundColor: 'rgba(239, 68, 68, 0.05)',
  },

  dangerText: {
    color: Colors.error,
  },

  footer: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingBottom: 80,
  },
  footerText: {
    fontSize: 11,
    color: Colors.textMuted,
    marginBottom: 3,
  },
});
