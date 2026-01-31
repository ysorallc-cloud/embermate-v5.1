import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { Colors, Spacing } from '../../theme/theme-tokens';
import PageHeader from '../../components/PageHeader';

export default function PatientScreen() {
  const router = useRouter();
  // Default patient info - in production, load from patient settings storage
  const [patientInfo, setPatientInfo] = useState({
    name: 'Your Loved One',
    age: 73,
    conditions: ['Hypertension', 'Type 2 Diabetes', 'Arthritis'],
    allergies: ['Penicillin', 'Sulfa drugs'],
    bloodType: 'O+',
    primaryDoctor: 'Dr. Chen',
    specialty: 'Cardiology',
    phone: '(555) 123-4567',
    emergencyContact: 'Emergency Contact',
    emergencyPhone: '(555) 987-6543',
  });

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
            emoji="👤"
            label="Profile"
            title="Patient"
          />
        </View>
        
        <ScrollView style={styles.scroll}>
          {/* Basic Info */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>BASIC INFORMATION</Text>
            <View style={styles.infoCard}>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Name</Text>
                <Text style={styles.infoValue}>{patientInfo.name}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Age</Text>
                <Text style={styles.infoValue}>{patientInfo.age} years</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Blood Type</Text>
                <Text style={styles.infoValue}>{patientInfo.bloodType}</Text>
              </View>
            </View>
          </View>

          {/* Medical Conditions */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>MEDICAL CONDITIONS</Text>
            <View style={styles.infoCard}>
              {patientInfo.conditions.map((condition, idx) => (
                <View key={idx} style={styles.listItem}>
                  <Text style={styles.bulletIcon}>•</Text>
                  <Text style={styles.listText}>{condition}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Allergies */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>ALLERGIES</Text>
            <View style={[styles.infoCard, styles.allergyCard]}>
              {patientInfo.allergies.map((allergy, idx) => (
                <View key={idx} style={styles.listItem}>
                  <Text style={styles.allergyIcon}>⚠️</Text>
                  <Text style={styles.allergyText}>{allergy}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Primary Care */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>PRIMARY CARE PHYSICIAN</Text>
            <View style={styles.infoCard}>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Doctor</Text>
                <Text style={styles.infoValue}>{patientInfo.primaryDoctor}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Specialty</Text>
                <Text style={styles.infoValue}>{patientInfo.specialty}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Phone</Text>
                <Text style={styles.infoValue}>{patientInfo.phone}</Text>
              </View>
            </View>
          </View>

          {/* Emergency Contact */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>EMERGENCY CONTACT</Text>
            <View style={styles.infoCard}>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Name</Text>
                <Text style={styles.infoValue}>{patientInfo.emergencyContact}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Phone</Text>
                <Text style={styles.infoValue}>{patientInfo.emergencyPhone}</Text>
              </View>
            </View>
          </View>

          {/* Edit Button */}
          <TouchableOpacity
            style={styles.editButton}
            onPress={() => {
              // Profile editing available in Settings > Patient Profile
              Alert.alert('Edit Profile', 'Profile editing coming soon. Visit Settings to update patient information.');
            }}
          >
            <Text style={styles.editButtonText}>Edit Profile</Text>
          </TouchableOpacity>
        </ScrollView>
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: Colors.background 
  },
  gradient: { 
    flex: 1 
  },
  headerWrapper: {
    position: 'relative',
  },
  backButton: {
    position: 'absolute',
    top: 70,
    left: 24,
    width: 44,
    height: 44,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  backIcon: {
    fontSize: 24,
    color: Colors.textPrimary,
  },
  scroll: { 
    flex: 1, 
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
  },
  
  // SECTIONS
  section: {
    marginBottom: Spacing.xl,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textTertiary,
    letterSpacing: 1.2,
    marginBottom: Spacing.md,
  },
  
  // INFO CARDS
  infoCard: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    padding: Spacing.md,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  infoLabel: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.textPrimary,
  },
  
  // LIST ITEMS
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  bulletIcon: {
    fontSize: 14,
    color: Colors.accent,
    width: 16,
  },
  listText: {
    flex: 1,
    fontSize: 14,
    color: Colors.textPrimary,
  },
  
  // ALLERGY CARD
  allergyCard: {
    backgroundColor: 'rgba(248, 113, 113, 0.1)',
    borderColor: 'rgba(248, 113, 113, 0.3)',
  },
  allergyIcon: {
    fontSize: 16,
    width: 24,
  },
  allergyText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    color: '#F87171',
  },
  
  // EDIT BUTTON
  editButton: {
    backgroundColor: Colors.accent,
    borderRadius: 12,
    padding: Spacing.md,
    alignItems: 'center',
    marginTop: Spacing.md,
    marginBottom: Spacing.xxl,
  },
  editButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.background,
  },
});
