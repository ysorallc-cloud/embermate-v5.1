// ============================================================================
// EMERGENCY CONTACTS SCREEN
// Quick access to care team contacts
// ============================================================================

import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform, Linking, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Spacing, BorderRadius } from './_theme/theme-tokens';
import { getCareTeam, CareTeamMember } from '../utils/careTeamStorage';

export default function EmergencyScreen() {
  const router = useRouter();
  const [careTeam, setCareTeam] = useState<CareTeamMember[]>([]);

  useFocusEffect(useCallback(() => { loadData(); }, []));

  const loadData = async () => {
    try {
      const team = await getCareTeam();
      setCareTeam(team);
    } catch (error) {
      console.log('Error loading care team:', error);
    }
  };

  const handleCall = (phone: string | undefined, name: string) => {
    if (!phone) return;
    Alert.alert(
      `Call ${name}?`,
      phone,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Call', onPress: () => Linking.openURL(`tel:${phone}`) },
      ]
    );
  };

  const handleCall911 = () => {
    Alert.alert(
      'Call 911?',
      'This will dial emergency services.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Call 911', style: 'destructive', onPress: () => Linking.openURL('tel:911') },
      ]
    );
  };

  const emergencyContacts = careTeam.filter(c => c.isEmergencyContact);
  const otherContacts = careTeam.filter(c => !c.isEmergencyContact);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <LinearGradient colors={[Colors.backgroundGradientStart, Colors.backgroundGradientEnd]} style={styles.gradient}>
        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          
          <View style={styles.header}>
            <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
              <Text style={styles.backIcon}>←</Text>
            </TouchableOpacity>
            <Text style={styles.headerLabel}>EMERGENCY</Text>
            <View style={styles.placeholder} />
          </View>

          <Text style={styles.title}>Emergency Contacts</Text>

          {/* 911 Button */}
          <TouchableOpacity style={styles.emergencyButton} onPress={handleCall911} activeOpacity={0.8}>
            <Ionicons name="call" size={28} color="#FFF" />
            <View style={styles.emergencyButtonText}>
              <Text style={styles.emergencyButtonTitle}>Call 911</Text>
              <Text style={styles.emergencyButtonSubtitle}>Emergency Services</Text>
            </View>
          </TouchableOpacity>

          {/* Emergency Contacts */}
          {emergencyContacts.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>PRIMARY CONTACTS</Text>
              {emergencyContacts.map(contact => (
                <TouchableOpacity key={contact.id} style={styles.contactCard} onPress={() => handleCall(contact.phone, contact.name)} activeOpacity={0.7}>
                  <View style={styles.contactIcon}>
                    <Text style={styles.contactInitials}>{contact.name.split(' ').map(n => n[0]).join('').slice(0, 2)}</Text>
                  </View>
                  <View style={styles.contactInfo}>
                    <Text style={styles.contactName}>{contact.name}</Text>
                    <Text style={styles.contactRole}>{contact.role}</Text>
                    <Text style={styles.contactPhone}>{contact.phone}</Text>
                  </View>
                  <Ionicons name="call" size={22} color={Colors.accent} />
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Care Team */}
          {otherContacts.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>CARE TEAM</Text>
              {otherContacts.map(contact => (
                <TouchableOpacity key={contact.id} style={styles.contactCard} onPress={() => handleCall(contact.phone, contact.name)} activeOpacity={0.7}>
                  <View style={[styles.contactIcon, styles.contactIconSecondary]}>
                    <Text style={styles.contactInitials}>{contact.name.split(' ').map(n => n[0]).join('').slice(0, 2)}</Text>
                  </View>
                  <View style={styles.contactInfo}>
                    <Text style={styles.contactName}>{contact.name}</Text>
                    <Text style={styles.contactRole}>{contact.role}</Text>
                    <Text style={styles.contactPhone}>{contact.phone}</Text>
                  </View>
                  <Ionicons name="call-outline" size={22} color={Colors.textSecondary} />
                </TouchableOpacity>
              ))}
            </View>
          )}

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
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: Platform.OS === 'android' ? 20 : 0, paddingBottom: Spacing.md },
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
  title: { fontSize: 28, fontWeight: '300', color: Colors.textPrimary, marginBottom: Spacing.xl },
  emergencyButton: { flexDirection: 'row', alignItems: 'center', gap: Spacing.lg, backgroundColor: Colors.error, borderRadius: BorderRadius.lg, padding: Spacing.xl, marginBottom: Spacing.xl },
  emergencyButtonText: { flex: 1 },
  emergencyButtonTitle: { fontSize: 20, fontWeight: '600', color: '#FFF' },
  emergencyButtonSubtitle: { fontSize: 14, color: 'rgba(255,255,255,0.8)' },
  section: { marginBottom: Spacing.xl },
  sectionLabel: { fontSize: 11, color: Colors.textMuted, letterSpacing: 0.8, fontWeight: '600', marginBottom: Spacing.md },
  contactCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface, borderRadius: BorderRadius.md, padding: Spacing.lg, marginBottom: Spacing.sm },
  contactIcon: { width: 48, height: 48, borderRadius: 24, backgroundColor: Colors.accentLight, alignItems: 'center', justifyContent: 'center', marginRight: Spacing.md },
  contactIconSecondary: { backgroundColor: Colors.surfaceAlt },
  contactInitials: { fontSize: 16, fontWeight: '600', color: Colors.accent },
  contactInfo: { flex: 1 },
  contactName: { fontSize: 16, color: Colors.textPrimary, fontWeight: '500', marginBottom: 2 },
  contactRole: { fontSize: 13, color: Colors.textSecondary, marginBottom: 2 },
  contactPhone: { fontSize: 13, color: Colors.accent },
});
