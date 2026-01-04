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
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors } from '../_theme/theme-tokens';
import PageHeader from '../../components/PageHeader';
import { generateSampleData, clearSampleData, hasSampleData } from '../../utils/sampleDataGenerator';
import { StorageKeys } from '../../utils/storageKeys';
import { getMedications } from '../../utils/medicationStorage';
import { getAppointments } from '../../utils/appointmentStorage';

export default function SettingsScreen() {
  const router = useRouter();
  const [patientName, setPatientName] = useState('');
  const [hasSample, setHasSample] = useState(false);
  const [lastModified, setLastModified] = useState<string>('');
  const [use24HourTime, setUse24HourTime] = useState(false);

  useEffect(() => {
    loadPatientName();
    checkSampleData();
    loadLastModified();
    loadTimePreference();
  }, []);

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
        <View style={styles.headerWrapper}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Text style={styles.backIcon}>←</Text>
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

          {/* PREFERENCES Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>PREFERENCES</Text>
            
            <TouchableOpacity 
              style={styles.settingItem}
              onPress={() => router.push('/notification-settings')}
            >
              <Text style={styles.settingIcon}>🔔</Text>
              <View style={styles.settingContent}>
                <Text style={styles.settingTitle}>Notifications</Text>
              </View>
              <View style={styles.toggle} />
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.settingItem}
              onPress={() => router.push('/family-sharing')}
            >
              <Text style={styles.settingIcon}>👥</Text>
              <View style={styles.settingContent}>
                <Text style={styles.settingTitle}>Family</Text>
                <Text style={styles.settingSubtitle}>3 caregivers</Text>
              </View>
              <Text style={styles.arrow}>→</Text>
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
                <Text style={styles.settingSubtitle}>7 active</Text>
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
                <Text style={styles.settingSubtitle}>2 upcoming</Text>
              </View>
              <Text style={styles.arrow}>→</Text>
            </TouchableOpacity>
          </View>

          {/* DATA Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>DATA</Text>
            
            <TouchableOpacity 
              style={styles.settingItem}
              onPress={() => router.push('/care-summary-export')}
            >
              <Text style={styles.settingIcon}>📤</Text>
              <View style={styles.settingContent}>
                <Text style={styles.settingTitle}>Export</Text>
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
  headerWrapper: {
    position: 'relative',
  },
  backButton: {
    position: 'absolute',
    top: 16,
    left: 24,
    width: 44,
    height: 44,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100, // Increased z-index to ensure it's above everything
  },
  backIcon: {
    fontSize: 24,
    color: Colors.textPrimary,
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
